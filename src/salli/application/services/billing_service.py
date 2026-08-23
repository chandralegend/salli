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
from salli.domain.billing.plans import BYOK_LIMITS, METRICS, Plan, get_plan


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


class SubscriptionChangeUnavailable(Exception):
    """The user's subscription can't be changed in place right now.

    `reason` is a stable machine code the clients branch on:
      checkout_required — no live provider subscription; buy through checkout instead
      past_due / paused / scheduled_change / unknown_status — the provider won't accept
        an item change in this state; the customer portal is the way out
      no_change — already on the requested plan and cycle
    """

    def __init__(self, reason: str) -> None:
        self.reason = reason
        super().__init__(reason)


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


def _change_mode(sub: dict[str, Any]) -> tuple[str, str | None]:
    """How this user must change plan: ("in_place" | "checkout" | "blocked", reason).

    Deliberately a pure function of the stored row — it never consults the billing
    port, so a deployment with no provider configured still renders a coherent
    Settings page.

    Reading `status` raw rather than through _effective_plan is load-bearing:
    _effective_plan reports Free for a past_due subscriber, which would offer them
    "Upgrade" and buy a *second* subscription alongside the one already in dunning.
    """
    if not sub or sub.get("plan") == "free" or not sub.get("provider_subscription_id"):
        return ("checkout", None)
    status = sub.get("status")
    if status == "canceled":
        # Terminal at the provider — it can never be patched again, and it isn't
        # billing, so a fresh purchase is correct and carries no double-charge risk.
        return ("checkout", None)
    if sub.get("cancel_at_period_end"):
        return ("blocked", "scheduled_change")
    if status == "past_due":
        return ("blocked", "past_due")
    if status == "paused":
        return ("blocked", "paused")
    if status in _ACTIVE_STATUSES:
        return ("in_place", None)
    # Fail closed. An unrecognised status must never fall through to checkout — that
    # is exactly the path that produces a duplicate subscription.
    return ("blocked", "unknown_status")


class BillingService:
    def __init__(self, uow_factory: Any, billing_port: Any = None, credentials: Any = None) -> None:
        self._uow_factory = uow_factory
        self._billing = billing_port
        self._credentials = credentials

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
        # From the raw row, not `plan` — see _change_mode on why the effective plan
        # would mislabel a past_due subscriber as free and offer them a second purchase.
        mode, blocked_reason = _change_mode(sub)
        byok = await self._has_byok(user_id)
        usage = []
        for metric in METRICS:
            used = counts.get(metric, 0)
            # The limit actually in force, so "remaining" stays truthful.
            limit = BYOK_LIMITS.get(metric, 0) if byok else plan.limits.get(metric, 0)
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
            # Whether this user is on their own LLM key. Clients branch on this
            # to show "your own key" rather than a plan allowance — the `limit`
            # values below are a safety ceiling, not something to advertise.
            "byok": byok,
            # Gated on the *effective* plan: a canceled paid row keeps its stored
            # cycle, and surfacing it would render as "Free · Annual".
            "billing_cycle": sub.get("billing_cycle") if plan.paid else None,
            # How the clients must route a plan change. Server-owned so neither client
            # has to re-derive it from status; see _change_mode.
            "change_mode": mode,
            "change_blocked_reason": blocked_reason,
            "status": sub.get("status", "active"),
            "current_period_end": sub.get("current_period_end"),
            "cancel_at_period_end": sub.get("cancel_at_period_end", False),
            "usage": usage,
        }

    async def check_and_increment(
        self, user_id: str, metric: str, email: str | None = None
    ) -> None:
        """Raise QuotaExceeded if over the monthly limit, else increment the counter.

        A user on their own LLM key gets BYOK_LIMITS instead of their plan's —
        a runaway-loop backstop rather than a product limit, since they're paying
        for the inference themselves.

        The counter still increments either way. This is the only usage record in
        the system, so skipping it for BYOK users would go blind on exactly the
        most engaged ones: no abuse signal, and nothing to show them in the UI.
        """
        sub = await self._ensure_user(user_id, email)
        plan = _effective_plan(sub)
        byok = await self._has_byok(user_id)
        limit = BYOK_LIMITS.get(metric, 0) if byok else plan.limits.get(metric, 0)
        period = _period()
        async with self._uow_factory() as uow:
            current = await uow.usage.get_count(user_id, period, metric)
            if current >= limit:
                # plan_key reads "byok" so the 402 tells the client which ceiling
                # was hit — a BYOK user hitting this needs a very different
                # message from a Free user who should be shown an upgrade.
                raise QuotaExceeded(metric, limit, "byok" if byok else plan.key)
            await uow.usage.increment(user_id, period, metric)

    async def _has_byok(self, user_id: str) -> bool:
        if self._credentials is None:
            return False
        return await self._credentials.has_byok(user_id)

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
            sub = await uow.subscriptions.get(user_id)
        customer_id = (sub or {}).get("provider_customer_id")
        return await self._billing.create_checkout(user_id, email, plan_key, cycle, customer_id)

    async def get_portal_url(self, user_id: str, email: str | None = None) -> str:
        if self._billing is None:
            raise RuntimeError("Billing provider not configured")
        async with self._uow_factory() as uow:
            sub = await uow.subscriptions.get(user_id)
        customer_id = (sub or {}).get("provider_customer_id")
        if not customer_id:
            raise RuntimeError("No billing customer for this user yet")
        return await self._billing.get_portal_url(customer_id)

    # ── Plan changes on an existing subscription ──────────────────────────────

    async def _require_changeable(
        self, user_id: str, email: str | None, plan_key: str, cycle: str
    ) -> dict[str, Any]:
        """Validate a requested change and return the subscription row to act on.

        Raises RuntimeError (not configured), ValueError (bad input) or
        SubscriptionChangeUnavailable. Never writes, except to self-heal a missing
        provider subscription ID.
        """
        if self._billing is None:
            raise RuntimeError("Billing provider not configured")
        if cycle not in ("month", "year"):
            raise ValueError(f"Unknown billing cycle '{cycle}'")
        target = get_plan(plan_key)
        # get_plan falls back to free for anything unknown, so compare keys rather than
        # trusting the lookup, and refuse free here — downgrades go through the portal.
        if target.key != plan_key or not target.paid:
            raise ValueError(f"'{plan_key}' is not a paid plan")

        await self._ensure_user(user_id, email)
        async with self._uow_factory() as uow:
            sub: dict[str, Any] = await uow.subscriptions.get(user_id) or {}

        sub = await self._heal_subscription_id(user_id, sub)
        mode, reason = _change_mode(sub)
        if mode == "blocked":
            raise SubscriptionChangeUnavailable(reason or "unknown_status")
        if mode != "in_place":
            raise SubscriptionChangeUnavailable("checkout_required")

        # Compare against the stored plan, not the effective one: a trialing user's
        # effective plan is their real plan, but the guard has to hold for every status
        # _change_mode admits. A null cycle means "recorded before we tracked it" —
        # unknown, not equal, so let the change through and let the preview tell them.
        if sub.get("plan") == plan_key and sub.get("billing_cycle") == cycle:
            raise SubscriptionChangeUnavailable("no_change")
        return sub

    async def _heal_subscription_id(self, user_id: str, sub: dict[str, Any]) -> dict[str, Any]:
        """Recover a subscription ID we never recorded.

        `transaction.completed` writes only the customer ID (paddle.py), so if
        `subscription.created` never arrived we hold a paying customer with no
        subscription ID — and _change_mode would route them to checkout, buying them a
        second subscription. Ask the provider instead, and persist what it says.
        """
        if sub.get("provider_subscription_id") or not sub.get("provider_customer_id"):
            return sub
        assert self._billing is not None
        found = await self._billing.find_subscription_id(sub["provider_customer_id"])
        if not found:
            return sub
        async with self._uow_factory() as uow:
            await uow.subscriptions.upsert(user_id, {"provider_subscription_id": found})
            return await uow.subscriptions.get(user_id) or sub

    async def preview_plan_change(
        self, user_id: str, email: str | None, plan_key: str, cycle: str
    ) -> dict[str, Any]:
        """What changing to `plan_key`/`cycle` would cost. Charges nothing, writes nothing."""
        sub = await self._require_changeable(user_id, email, plan_key, cycle)
        assert self._billing is not None
        return await self._billing.preview_subscription_change(
            sub["provider_subscription_id"], plan_key, cycle
        )

    async def change_plan(
        self, user_id: str, email: str | None, plan_key: str, cycle: str
    ) -> dict[str, Any]:
        """Move an existing subscription to `plan_key`/`cycle`; return fresh entitlements."""
        sub = await self._require_changeable(user_id, email, plan_key, cycle)
        assert self._billing is not None
        result = await self._billing.change_subscription(
            sub["provider_subscription_id"], plan_key, cycle
        )

        # Persist through the same path a webhook takes, rather than waiting for the
        # webhook itself: mobile has no checkout-completion callback, so otherwise the
        # screen would still show the old plan after a successful change. It also keeps
        # the feature working where the webhook can't reach us.
        async with self._uow_factory() as uow:
            current: dict[str, Any] = await uow.subscriptions.get(user_id) or {}
        already_applied: bool = (
            current.get("provider_subscription_id") == result.get("provider_subscription_id")
            and current.get("plan") == plan_key
            and current.get("billing_cycle") == cycle
        )
        if not already_applied:
            await self.apply_webhook_event({**result, "user_id": user_id})
        return await self.get_entitlements(user_id, email)

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
        # Truthiness, not `in`: _normalize_subscription always emits a "price_id" key
        # and falls back to "" when the event carries no items[].price.id. An empty
        # id resolves to plan "free" (plan_for_price_id's default), so keying off
        # presence alone would let a subscription event that merely lacks item detail
        # silently downgrade a paying, active subscriber to Free. Leaving plan and
        # billing_cycle untouched keeps the last known-good values; the next event
        # with a real price corrects them.
        if event.get("price_id"):
            # The price ID is the only place the cycle survives — Paddle reports the
            # subscription's plan and its billing interval as one identifier, so both
            # are resolved here or the cycle is lost for good.
            fields["plan"] = self._billing.plan_for_price_id(event["price_id"])
            fields["billing_cycle"] = self._billing.cycle_for_price_id(event["price_id"])
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
            # provider_customer_id is already in `fields` — the subscription row is
            # the single home for it, next to provider_subscription_id.
            await uow.subscriptions.upsert(user_id, fields)
