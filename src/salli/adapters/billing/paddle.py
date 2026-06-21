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
from typing import Any

import httpx

from salli.application.ports import BillingPort

_API_BASE = {
    "sandbox": "https://sandbox-api.paddle.com",
    "production": "https://api.paddle.com",
}


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
        # plan_key -> price_id  and the reverse
        self._price_map = {k: v for k, v in price_map.items() if v}
        self._plan_by_price = {v: k for k, v in self._price_map.items()}

    @property
    def _base(self) -> str:
        return _API_BASE[self._env]

    async def create_checkout(
        self, user_id: str, email: str | None, plan_key: str, customer_id: str | None
    ) -> dict[str, Any]:
        price_id = self._price_map.get(plan_key)
        if not price_id:
            raise RuntimeError(f"No Paddle price configured for plan '{plan_key}'")
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
        parts = dict(
            p.split("=", 1) for p in signature.split(";") if "=" in p
        )
        ts, h1 = parts.get("ts"), parts.get("h1")
        if not ts or not h1:
            return None
        signed = f"{ts}:".encode() + raw_body
        expected = hmac.new(
            self._webhook_secret.encode(), signed, hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(expected, h1):
            return None

        try:
            payload = json.loads(raw_body)
        except json.JSONDecodeError:
            return None

        event_type = payload.get("event_type", "")
        if not event_type.startswith("subscription."):
            return None
        data = payload.get("data", {})
        items = data.get("items") or []
        price_id = ""
        if items:
            price_id = (items[0].get("price") or {}).get("id", "")
        period = data.get("current_billing_period") or {}
        scheduled = data.get("scheduled_change") or {}
        custom = data.get("custom_data") or {}

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

    def plan_for_price_id(self, price_id: str) -> str:
        return self._plan_by_price.get(price_id, "free")
