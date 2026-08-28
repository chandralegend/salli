"""
Billing router — subscription state, usage quotas, plan catalog, Paddle checkout/portal/webhook.

The mobile app is a viewer: it reads subscription/usage here and opens the web
checkout/portal in a browser. No in-app purchase.
"""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, HTTPException, Request, Response, status
from pydantic import BaseModel

from salli.application.ports import BillingChangePending, BillingChangeRejected
from salli.application.services.billing_service import SubscriptionChangeUnavailable
from salli.interfaces.api.deps import AppServices, CurrentEmail, CurrentUser

router = APIRouter(prefix="/billing", tags=["billing"])

# User-facing copy for the states a plan change can land in. Lives here, not in the
# adapter or the service, because wording is an interface concern — the same condition
# is phrased differently for a CLI than for a dialog.
_UNAVAILABLE_COPY = {
    "checkout_required": "You don't have an active subscription yet — start one from checkout.",
    "past_due": "There's an unpaid invoice on your subscription. Settle it in the billing "
    "portal, then change your plan.",
    "paused": "Your subscription is paused. Resume it in the billing portal to change plans.",
    "scheduled_change": "Your subscription is already scheduled to cancel. Manage that in the "
    "billing portal first.",
    "unknown_status": "Your subscription isn't in a state we can change automatically — "
    "please use the billing portal.",
    "no_change": "You're already on this plan and billing cycle.",
}

# Paddle's own refusals. Anything unmapped falls back to the provider's detail text,
# which the adapter has already trimmed to the operator-actionable part.
_PADDLE_CODE_COPY = {
    "subscription_locked_processing": "This subscription is being updated right now. "
    "Try again in a moment.",
    "subscription_locked_renewal": "This subscription is renewing right now. "
    "Try again in a few minutes.",
    "subscription_invalid_billing_mode_for_scheduled_change": "There's already a scheduled "
    "change on this subscription. Manage it in the billing portal first.",
    "subscription_update_when_canceled": "This subscription has been canceled and can no "
    "longer be changed.",
    "transaction_immediate_collection_failed": "Your card was declined, so your plan was "
    "not changed.",
}


@router.get("/subscription")
async def get_subscription(user_id: CurrentUser, email: CurrentEmail, svc: AppServices):
    """Current plan, status, and per-metric usage (used/limit/remaining/resets_at)."""
    return await svc.billing.get_entitlements(user_id, email)


@router.get("/plans")
async def get_plans(svc: AppServices):
    """Plan catalog for the upgrade/pricing UI."""
    return {"plans": svc.billing.get_plans()}


class CheckoutRequest(BaseModel):
    # Literal, not a bare str. As a plain string this accepted any plan key,
    # including the retired "plus" — and while that price was still configured,
    # a stale client could open a real checkout for a tier whose subscription
    # now resolves to Free limits.
    plan: Literal["pro"]
    cycle: Literal["month", "year"] = "month"


@router.post("/checkout")
async def create_checkout(
    body: CheckoutRequest, user_id: CurrentUser, email: CurrentEmail, svc: AppServices
):
    """Return the data the client passes to Paddle.js to open checkout."""
    try:
        return await svc.billing.create_checkout(user_id, email, body.plan, body.cycle)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))


class CreditPackRequest(BaseModel):
    # Named packs rather than a raw price id: a client that could name the price
    # would be choosing what it pays, and the mapping from pack to price lives
    # in config for exactly that reason.
    pack: Literal["10k", "25k", "60k"]


@router.post("/credits/checkout")
async def create_credit_checkout(
    body: CreditPackRequest, user_id: CurrentUser, email: CurrentEmail, svc: AppServices
):
    """Data the client passes to Paddle.js to buy a one-time credit pack."""
    try:
        return await svc.billing.create_credit_checkout(user_id, email, body.pack)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        ) from exc


class PlanChangeRequest(BaseModel):
    # Literal rather than the plain `str` CheckoutRequest uses: it rejects garbage with a
    # 422 for free, and makes the generated mobile SDK emit real enums.
    plan: Literal["pro"]
    cycle: Literal["month", "year"] = "month"


def _change_error(exc: Exception) -> HTTPException:
    """Map a plan-change failure to a response. Order matters — both provider exceptions
    subclass RuntimeError, so they must be tested before the configuration case."""
    if isinstance(exc, SubscriptionChangeUnavailable):
        return HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": exc.reason,
                "message": _UNAVAILABLE_COPY.get(exc.reason, "This plan change isn't available."),
            },
        )
    if isinstance(exc, BillingChangeRejected):
        return HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": "provider_rejected",
                "code": exc.code,
                "message": _PADDLE_CODE_COPY.get(exc.code)
                or exc.detail
                or "Your payment provider declined this change.",
            },
        )
    # Provider unreachable or no price configured — an operator problem, same as /checkout.
    return HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))


@router.post("/subscription/preview")
async def preview_plan_change(
    body: PlanChangeRequest, user_id: CurrentUser, email: CurrentEmail, svc: AppServices
):
    """What switching to this plan/cycle would cost. Charges nothing."""
    try:
        return await svc.billing.preview_plan_change(user_id, email, body.plan, body.cycle)
    except (SubscriptionChangeUnavailable, RuntimeError) as exc:
        raise _change_error(exc)


@router.post("/subscription/change")
async def change_plan(
    body: PlanChangeRequest,
    response: Response,
    user_id: CurrentUser,
    email: CurrentEmail,
    svc: AppServices,
):
    """Move the existing subscription to this plan/cycle. Charges the card on file."""
    try:
        return await svc.billing.change_plan(user_id, email, body.plan, body.cycle)
    except BillingChangePending:
        # The card may already have been charged — never invite a retry, since a
        # subscription update has no idempotency key. The webhook settles the truth.
        response.status_code = status.HTTP_202_ACCEPTED
        return {
            "status": "pending",
            "message": "We're confirming this change with Paddle. Your plan will update shortly.",
        }
    except (SubscriptionChangeUnavailable, RuntimeError) as exc:
        raise _change_error(exc)


@router.post("/portal")
async def billing_portal(user_id: CurrentUser, email: CurrentEmail, svc: AppServices):
    """Return a Paddle customer-portal URL for managing or cancelling the subscription."""
    try:
        return {"url": await svc.billing.get_portal_url(user_id, email)}
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/webhook")
async def paddle_webhook(request: Request, svc: AppServices):
    """Receive Paddle subscription events (no auth; verified by HMAC signature)."""
    raw = await request.body()
    signature = request.headers.get("Paddle-Signature")
    event = svc.billing.verify_and_parse_webhook(raw, signature)
    if event is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid webhook")
    await svc.billing.apply_webhook_event(event)
    return {"ok": True}
