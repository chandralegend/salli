"""
Billing router — subscription state, usage quotas, plan catalog, Paddle checkout/portal/webhook.

The mobile app is a viewer: it reads subscription/usage here and opens the web
checkout/portal in a browser. No in-app purchase.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel

from salli.interfaces.api.deps import AppServices, CurrentEmail, CurrentUser

router = APIRouter(prefix="/billing", tags=["billing"])


@router.get("/subscription")
async def get_subscription(user_id: CurrentUser, email: CurrentEmail, svc: AppServices):
    """Current plan, status, and per-metric usage (used/limit/remaining/resets_at)."""
    return await svc.billing.get_entitlements(user_id, email)


@router.get("/plans")
async def get_plans(svc: AppServices):
    """Plan catalog for the upgrade/pricing UI."""
    return {"plans": svc.billing.get_plans()}


class CheckoutRequest(BaseModel):
    plan: str  # "plus" | "pro"
    cycle: str = "month"  # "month" | "year"


@router.post("/checkout")
async def create_checkout(
    body: CheckoutRequest, user_id: CurrentUser, email: CurrentEmail, svc: AppServices
):
    """Return the data the client passes to Paddle.js to open checkout."""
    try:
        return await svc.billing.create_checkout(user_id, email, body.plan, body.cycle)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))


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
