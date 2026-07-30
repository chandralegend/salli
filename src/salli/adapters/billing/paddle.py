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
from typing import Any

import httpx

from salli.application.ports import BillingPort

_API_BASE = {
    "sandbox": "https://sandbox-api.paddle.com",
    "production": "https://api.paddle.com",
}

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
        self._plan_by_price = {
            v: k.split(":", 1)[0] for k, v in self._price_map.items()
        }
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
        interval = cycle if cycle in ("month", "year") else "month"
        price_id = self._price_map.get(f"{plan_key}:{interval}")
        if not price_id:
            raise RuntimeError(
                f"No Paddle price configured for plan '{plan_key}' ({interval})"
            )
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
            items = data.get("items") or []
            price_id = ""
            if items:
                price_id = (items[0].get("price") or {}).get("id", "")
            period = data.get("current_billing_period") or {}
            scheduled = data.get("scheduled_change") or {}
            return {
                "user_id": custom.get("user_id"),
                "price_id": price_id,
                "status": data.get("status"),
                "provider_customer_id": data.get("customer_id"),
                "provider_subscription_id": data.get("id"),
                "current_period_start": period.get("starts_at"),
                "current_period_end": period.get("ends_at"),
                "cancel_at_period_end": scheduled.get("action") == "cancel",
            }

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
