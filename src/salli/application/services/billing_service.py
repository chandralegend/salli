"""
BillingService — entitlements, usage metering, and provider orchestration.

Plan limits come from the pure registry in domain/billing/plans.py. A user with no
subscription row is treated as Free. Usage is counted per calendar month (UTC) and
surfaced to Settings as "used / limit / remaining / resets_at".
"""

from __future__ import annotations

import datetime
from typing import Any

from salli.domain.billing import plans as plan_registry
from salli.domain.billing.plans import METRICS, Plan, get_plan


class QuotaExceeded(Exception):
    """Raised when a metered action would exceed the user's monthly plan limit."""

    def __init__(self, metric: str, limit: int, plan_key: str) -> None:
        self.metric = metric
        self.limit = limit
        self.plan_key = plan_key
        super().__init__(f"Quota exceeded for {metric} (limit {limit} on {plan_key})")


class PlanRequiredError(Exception):
    """Raised when a feature (not a metered counter) requires a paid plan the
    user isn't on — e.g. MCP access on the free plan."""

    def __init__(self, feature: str, plan_key: str) -> None:
        self.feature = feature
        self.plan_key = plan_key
        super().__init__(f"'{feature}' requires a paid plan (currently on {plan_key})")


def _period(now: datetime.datetime | None = None) -> str:
    now = now or datetime.datetime.now(datetime.UTC)
    return now.strftime("%Y-%m")


def _period_resets_at(now: datetime.datetime | None = None) -> str:
    now = now or datetime.datetime.now(datetime.UTC)
    year, month = now.year, now.month
    nxt = datetime.datetime(year + (month // 12), (month % 12) + 1, 1, tzinfo=datetime.UTC)
    return nxt.isoformat()


# Statuses that grant the paid plan's entitlements. Anything else (canceled,
# past_due, paused, …) falls back to Free even though the plan key is still set.
_ACTIVE_STATUSES = frozenset({"active", "trialing"})


def _parse_dt(value: Any) -> datetime.datetime | None:
    """Parse a Paddle ISO-8601 timestamp to a tz-aware datetime; pass through None/datetime.

    Paddle sends `...Z`; `datetime.fromisoformat` needs an explicit offset before 3.11's
    relaxations, so normalize the trailing Z. The DB columns are `DateTime(timezone=True)`,
    so writing the raw string would raise at flush time.
    """
    if value is None or isinstance(value, datetime.datetime):
        return value
    if isinstance(value, str):
        return datetime.datetime.fromisoformat(value.replace("Z", "+00:00"))
    return None


def _effective_plan(sub: dict[str, Any]):
    """The plan whose limits actually apply: the stored plan only while active/trialing."""
    if sub.get("status") in _ACTIVE_STATUSES:
        return get_plan(sub.get("plan"))
    return get_plan("free")


class BillingService:
    def __init__(self, uow_factory: Any, billing_port: Any = None) -> None:
        self._uow_factory = uow_factory
        self._billing = billing_port

    # ── Provisioning ──────────────────────────────────────────────────────────

    async def _ensure_user(self, user_id: str, email: str | None) -> dict[str, Any]:
        """Create the profile + free subscription on first use; return subscription dict."""
        async with self._uow_factory() as uow:
            await uow.user_profiles.upsert(user_id, {"email": email})
            sub = await uow.subscriptions.get(user_id)
            if sub is None:
                await uow.subscriptions.upsert(
                    user_id, {"plan": "free", "status": "active", "provider": "paddle"}
                )
                sub = await uow.subscriptions.get(user_id)
            return sub or {"plan": "free", "status": "active"}

    # ── Entitlements / usage ──────────────────────────────────────────────────

    async def get_plan_key(self, user_id: str, email: str | None = None) -> str:
        sub = await self._ensure_user(user_id, email)
        return get_plan(sub.get("plan")).key

    async def get_current_plan(self, user_id: str, email: str | None = None) -> Plan:
        """Resolve the caller's full Plan object (content-depth entitlements
        included), so routers doing content-gating don't repeat
        get_plan(await get_plan_key(...))."""
        return get_plan(await self.get_plan_key(user_id, email))

    async def get_entitlements(self, user_id: str, email: str | None = None) -> dict[str, Any]:
        sub = await self._ensure_user(user_id, email)
        plan = _effective_plan(sub)
        period = _period()
        async with self._uow_factory() as uow:
            counts = await uow.usage.get_counts(user_id, period)
        resets_at = _period_resets_at()
        usage = []
        for metric in METRICS:
            used = counts.get(metric, 0)
            limit = plan.limits.get(metric, 0)
            usage.append(
                {
                    "metric": metric,
                    "used": used,
                    "limit": limit,
                    "remaining": max(0, limit - used),
                    "resets_at": resets_at,
                }
            )
        return {
            "plan": plan.key,
            "plan_name": plan.name,
            "paid": plan.paid,
            "status": sub.get("status", "active"),
            "current_period_end": sub.get("current_period_end"),
            "cancel_at_period_end": sub.get("cancel_at_period_end", False),
            "usage": usage,
        }

    async def check_and_increment(
        self, user_id: str, metric: str, email: str | None = None
    ) -> None:
        """Raise QuotaExceeded if over the monthly limit, else increment the counter."""
        sub = await self._ensure_user(user_id, email)
        plan = _effective_plan(sub)
        limit = plan.limits.get(metric, 0)
        period = _period()
        async with self._uow_factory() as uow:
            current = await uow.usage.get_count(user_id, period, metric)
            if current >= limit:
                raise QuotaExceeded(metric, limit, plan.key)
            await uow.usage.increment(user_id, period, metric)

    def get_plans(self) -> list[dict[str, Any]]:
        out = []
        for p in plan_registry.PLANS.values():
            out.append(
                {
                    "key": p.key,
                    "name": p.name,
                    "description": p.description,
                    "monthly_price_usd": p.monthly_price_usd,
                    "yearly_price_usd": p.yearly_price_usd,
                    "limits": p.limits,
                    "features": p.features,
                    "paid": p.paid,
                }
            )
        return out

    # ── Provider (Paddle) ─────────────────────────────────────────────────────

    async def create_checkout(
        self, user_id: str, email: str | None, plan_key: str, cycle: str = "month"
    ) -> dict[str, Any]:
        if self._billing is None:
            raise RuntimeError("Billing provider not configured")
        await self._ensure_user(user_id, email)  # bootstrap free sub/profile on first use
        async with self._uow_factory() as uow:
            profile = await uow.user_profiles.get(user_id)
        customer_id = (profile or {}).get("paddle_customer_id")
        return await self._billing.create_checkout(user_id, email, plan_key, cycle, customer_id)

    async def get_portal_url(self, user_id: str, email: str | None = None) -> str:
        if self._billing is None:
            raise RuntimeError("Billing provider not configured")
        async with self._uow_factory() as uow:
            profile = await uow.user_profiles.get(user_id)
        customer_id = (profile or {}).get("paddle_customer_id")
        if not customer_id:
            raise RuntimeError("No billing customer for this user yet")
        return await self._billing.get_portal_url(customer_id)

    def verify_and_parse_webhook(
        self, raw_body: bytes, signature: str | None
    ) -> dict[str, Any] | None:
        if self._billing is None:
            return None
        return self._billing.verify_and_parse_webhook(raw_body, signature)

    async def apply_webhook_event(self, event: dict[str, Any]) -> None:
        """Update a user's subscription from a normalized provider event."""
        if self._billing is None:
            return
        user_id = event.get("user_id")
        if not user_id:
            return
        fields: dict[str, Any] = {"provider": "paddle"}
        if "price_id" in event:
            fields["plan"] = self._billing.plan_for_price_id(event["price_id"])
        for key in (
            "status",
            "provider_customer_id",
            "provider_subscription_id",
            "cancel_at_period_end",
        ):
            if key in event:
                fields[key] = event[key]
        # Period bounds arrive as ISO strings but the DB columns are DateTime; parse
        # them so the upsert doesn't fail binding a str to a timestamptz column.
        for key in ("current_period_start", "current_period_end"):
            if key in event:
                fields[key] = _parse_dt(event[key])
        async with self._uow_factory() as uow:
            await uow.subscriptions.upsert(user_id, fields)
            if event.get("provider_customer_id"):
                await uow.user_profiles.upsert(
                    user_id, {"paddle_customer_id": event["provider_customer_id"]}
                )
