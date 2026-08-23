"""
Paddle Billing adapter — implements BillingPort.

Checkout is completed client-side with Paddle.js; this adapter resolves the plan
to a price ID and carries `custom_data.user_id` so webhooks map back to our user.
Portal sessions and webhook verification use the Paddle REST API + HMAC signature.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import time
from typing import Any, cast

import httpx

from salli.application.ports import BillingChangePending, BillingChangeRejected, BillingPort

_API_BASE = {
    "sandbox": "https://sandbox-api.paddle.com",
    "production": "https://api.paddle.com",
}

# Longer than the 15s used for a portal session because both calls block on Paddle's
# payment processor: a change with immediate collection isn't answered until the card
# has been attempted. Timing out *after* the card was charged is the worst outcome this
# adapter can produce, so the change budget is the more generous of the two.
_PREVIEW_TIMEOUT = 30.0
_CHANGE_TIMEOUT = 60.0

# Paddle status codes that mean "we understood you and declined", as opposed to "we are
# broken". Everything outside this set (401, 5xx) is an operator problem and is left to
# raise_for_status so it surfaces as a 500 and pages someone, rather than being reported
# to the user as a billing decision.
#   400/409/422 — declined card, bad billing mode for a scheduled change, canceled sub
#   403         — subscription_locked_processing / _locked_renewal, transient
#   404         — the subscription ID we stored doesn't exist in this environment
#   429         — rate limited
_REJECT_STATUSES = frozenset({400, 403, 404, 409, 422, 429})


def _normalize_subscription(data: dict[str, Any]) -> dict[str, Any]:
    """A Paddle subscription object → the fields we persist.

    Shared by the webhook parser and `change_subscription` so the response to a plan
    change and the webhook that follows it produce the same row by construction. Does
    not include `user_id`: the webhook reads it from custom_data, the change path
    already knows who it acted for.
    """
    items: list[Any] = data.get("items") or []
    price_id = ""
    if items:
        first: dict[str, Any] = items[0] or {}
        price: dict[str, Any] = first.get("price") or {}
        price_id = price.get("id", "")
    period: dict[str, Any] = data.get("current_billing_period") or {}
    scheduled: dict[str, Any] = data.get("scheduled_change") or {}
    return {
        "price_id": price_id,
        "status": data.get("status"),
        "provider_customer_id": data.get("customer_id"),
        "provider_subscription_id": data.get("id"),
        "current_period_start": period.get("starts_at"),
        "current_period_end": period.get("ends_at"),
        "cancel_at_period_end": scheduled.get("action") == "cancel",
    }


def _minor(value: Any) -> int:
    """Paddle money → int minor units. Amounts arrive as strings ("4271"), and a float
    anywhere in the money path is a bug. Absent/garbage becomes 0 rather than raising:
    a missing total means "nothing charged", which is a real Paddle response shape."""
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


def _dig(data: Any, *keys: str) -> Any:
    """Walk nested dicts, returning None the moment anything isn't there.

    Every read of a Paddle response goes through this. A bare data["k"] would raise
    KeyError, and main.py maps KeyError to HTTP 404 — turning a shape variation in a
    billing preview into a baffling "Not found".
    """
    cursor: Any = data
    for key in keys:
        if not isinstance(cursor, dict):
            return None
        cursor = cast("dict[str, Any]", cursor).get(key)
    return cursor


# How far a webhook's signed timestamp may sit from our clock before we reject it
# as a replay. Applied symmetrically, so a future-dated `ts` (a skewed or forged
# clock) is refused too. Wide enough to absorb ordinary drift and Paddle's retry
# backoff, short enough that a captured delivery stops being useful quickly.
MAX_WEBHOOK_AGE_SECONDS = 300


class PaddleBillingAdapter(BillingPort):
    def __init__(
        self,
        api_key: str,
        webhook_secret: str,
        environment: str,
        price_map: dict[str, str],
    ) -> None:
        self._api_key = api_key
        self._webhook_secret = webhook_secret
        self._env = environment if environment in _API_BASE else "sandbox"
        # Keys are "<plan_key>:<cycle>" (e.g. "plus:month", "pro:year") -> price_id.
        self._price_map = {k: v for k, v in price_map.items() if v}
        # Reverse lookup price_id -> plan_key (strip the cycle) for webhook mapping;
        # both the monthly and yearly price of a plan resolve to the same plan key.
        self._plan_by_price = {v: k.split(":", 1)[0] for k, v in self._price_map.items()}
        # The other half of the same reverse lookup: price_id -> "month" | "year".
        # Kept separate from _plan_by_price so a caller asks for exactly the fact it
        # needs — the plan drives entitlements, the cycle is display/checkout only.
        self._cycle_by_price = {v: k.split(":", 1)[1] for k, v in self._price_map.items()}

    @property
    def _base(self) -> str:
        return _API_BASE[self._env]

    async def create_checkout(
        self,
        user_id: str,
        email: str | None,
        plan_key: str,
        cycle: str,
        customer_id: str | None,
    ) -> dict[str, Any]:
        price_id = self._price_for(plan_key, cycle)
        # Paddle.js opens the overlay using this data; we attach user_id so the
        # subscription webhook can be tied back to our account.
        return {
            "provider": "paddle",
            "environment": self._env,
            "price_id": price_id,
            "customer_id": customer_id,
            "customer_email": email,
            "custom_data": {"user_id": user_id},
        }

    def _price_for(self, plan_key: str, cycle: str) -> str:
        """Resolve plan+cycle to a configured price ID. Shared by checkout and change so
        the two can't disagree about which price a plan means."""
        interval = cycle if cycle in ("month", "year") else "month"
        price_id = self._price_map.get(f"{plan_key}:{interval}")
        if not price_id:
            raise RuntimeError(f"No Paddle price configured for plan '{plan_key}' ({interval})")
        return price_id

    def _change_body(self, plan_key: str, cycle: str) -> dict[str, Any]:
        return {
            # Paddle treats `items` as the COMPLETE list — anything omitted is removed
            # from the subscription. Every plan is single-item today, so one entry both
            # adds the new price and removes the old one. If an add-on or seat item is
            # ever sold, this must merge with the subscription's existing items instead,
            # or it will silently delete them.
            "items": [{"price_id": self._price_for(plan_key, cycle), "quantity": 1}],
            "proration_billing_mode": "prorated_immediately",
            # Don't half-apply: if the card is declined, the subscription stays on the
            # old plan rather than moving to the new one unpaid.
            "on_payment_failure": "prevent_change",
        }

    def _reject(self, resp: httpx.Response) -> BillingChangeRejected:
        """Build a rejection from Paddle's error body, falling back to raw text."""
        code, detail = "", ""
        try:
            body: dict[str, Any] = resp.json() or {}
            err: dict[str, Any] = body.get("error") or {}
            code, detail = err.get("code", ""), err.get("detail", "")
        except ValueError:
            pass
        # Deliberately not the whole body: it carries documentation_url and internal
        # type strings that shouldn't reach an end-user toast.
        return BillingChangeRejected(code, detail or resp.text[:500])

    async def preview_subscription_change(
        self, subscription_id: str, plan_key: str, cycle: str
    ) -> dict[str, Any]:
        body = self._change_body(plan_key, cycle)
        try:
            async with httpx.AsyncClient(timeout=_PREVIEW_TIMEOUT) as client:
                resp = await client.patch(
                    f"{self._base}/subscriptions/{subscription_id}/preview",
                    headers={"Authorization": f"Bearer {self._api_key}"},
                    json=body,
                )
        except httpx.TimeoutException as exc:
            raise BillingChangePending("Paddle did not respond in time") from exc
        if resp.status_code in _REJECT_STATUSES:
            raise self._reject(resp)
        resp.raise_for_status()
        return self._parse_preview(resp.json().get("data") or {}, plan_key, cycle)

    def _parse_preview(self, data: dict[str, Any], plan_key: str, cycle: str) -> dict[str, Any]:
        immediate: dict[str, Any] = data.get("immediate_transaction") or {}
        totals: dict[str, Any] = _dig(immediate, "details", "totals") or {}
        summary_result: dict[str, Any] = _dig(data, "update_summary", "result") or {}

        # `result` is what the user is told; it can differ in kind from the charge. When
        # the credit for unused time exceeds the new plan's cost, Paddle charges nothing
        # and issues account credit instead — immediate_transaction is then null.
        action: str = summary_result.get("action") or ("charge" if totals else "none")
        currency: str = (
            totals.get("currency_code")
            or summary_result.get("currency_code")
            or data.get("currency_code")
            or "USD"
        )
        return {
            "plan": plan_key,
            "cycle": cycle,
            "currency": currency,
            "immediate_charge_minor": _minor(totals.get("grand_total")),
            "credit_applied_minor": _minor(totals.get("credit")),
            "result": action,
            "result_amount_minor": _minor(summary_result.get("amount")),
            # From recurring_transaction_details, not next_transaction: the next
            # transaction can still carry proration credits, so quoting it as the
            # steady-state "then $X/year" would understate what they'll pay.
            "recurring_amount_minor": _minor(
                _dig(data, "recurring_transaction_details", "totals", "total")
            ),
            "recurring_currency": _dig(
                data, "recurring_transaction_details", "totals", "currency_code"
            )
            or currency,
            "next_billed_at": _dig(data, "next_transaction", "billing_period", "starts_at")
            or data.get("next_billed_at"),
        }

    async def change_subscription(
        self, subscription_id: str, plan_key: str, cycle: str
    ) -> dict[str, Any]:
        body = self._change_body(plan_key, cycle)
        try:
            async with httpx.AsyncClient(timeout=_CHANGE_TIMEOUT) as client:
                resp = await client.patch(
                    f"{self._base}/subscriptions/{subscription_id}",
                    headers={"Authorization": f"Bearer {self._api_key}"},
                    json=body,
                )
        except httpx.TimeoutException as exc:
            # Paddle may have charged the card and applied the change before we gave up.
            # There is no idempotency key for a subscription update, so this must never
            # become a retry — the webhook settles it.
            raise BillingChangePending(
                "Paddle did not respond in time; the change may still have been applied"
            ) from exc
        if resp.status_code in _REJECT_STATUSES:
            raise self._reject(resp)
        resp.raise_for_status()
        return _normalize_subscription(resp.json().get("data") or {})

    async def find_subscription_id(self, customer_id: str) -> str | None:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{self._base}/subscriptions",
                headers={"Authorization": f"Bearer {self._api_key}"},
                params={"customer_id": customer_id, "status": "active,trialing,past_due"},
            )
        if resp.status_code in _REJECT_STATUSES:
            return None
        resp.raise_for_status()
        rows: list[dict[str, Any]] = resp.json().get("data") or []
        return rows[0].get("id") if rows else None

    async def get_portal_url(self, customer_id: str) -> str:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{self._base}/customers/{customer_id}/portal-sessions",
                headers={"Authorization": f"Bearer {self._api_key}"},
            )
            resp.raise_for_status()
            data = resp.json()
        return data["data"]["urls"]["general"]["overview"]

    def verify_and_parse_webhook(
        self, raw_body: bytes, signature: str | None
    ) -> dict[str, Any] | None:
        if not signature or not self._webhook_secret:
            return None
        # Header format: "ts=1700000000;h1=<hex hmac>"
        parts = dict(p.split("=", 1) for p in signature.split(";") if "=" in p)
        ts, h1 = parts.get("ts"), parts.get("h1")
        if not ts or not h1:
            return None
        signed = f"{ts}:".encode() + raw_body
        expected = hmac.new(self._webhook_secret.encode(), signed, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, h1):
            return None

        # Only after the signature checks out: a valid HMAC alone stays valid
        # forever, so a captured delivery could be replayed indefinitely to
        # re-apply a subscription state. `ts` is inside the signed payload, so it
        # can't be edited without invalidating h1. Checked second so an
        # unauthenticated caller can't use the response to probe our clock.
        try:
            age = time.time() - int(ts)
        except ValueError:
            return None
        if abs(age) > MAX_WEBHOOK_AGE_SECONDS:
            return None

        try:
            payload = json.loads(raw_body)
        except json.JSONDecodeError:
            return None

        # From here the signature is valid. Events we don't act on return an empty
        # dict (a no-op the router turns into HTTP 200) rather than None, so Paddle
        # doesn't treat unhandled-but-legitimate deliveries as failures and retry.
        event_type = payload.get("event_type", "")
        data = payload.get("data", {})
        custom = data.get("custom_data") or {}

        if event_type.startswith("subscription."):
            return {"user_id": custom.get("user_id"), **_normalize_subscription(data)}

        if event_type == "transaction.completed":
            # A completed transaction is the earliest reliable place to capture the
            # Paddle customer id (checkout is client-side and stores nothing), so the
            # customer portal is reachable even before the subscription webhook lands.
            return {
                "user_id": custom.get("user_id"),
                "provider_customer_id": data.get("customer_id"),
            }

        return {}

    def plan_for_price_id(self, price_id: str) -> str:
        return self._plan_by_price.get(price_id, "free")

    def cycle_for_price_id(self, price_id: str) -> str | None:
        # None rather than a "month" default: an unmapped price means we genuinely
        # don't know what the user is charged on, and the UI must be able to tell
        # that apart from a known monthly subscription.
        return self._cycle_by_price.get(price_id)
