"""Unit tests for BillingService using in-memory fakes.

Covers entitlement bootstrap, monthly usage metering, the plan catalog, and the
Paddle-provider orchestration (checkout, portal, webhook apply). No DB, no network.
"""

from __future__ import annotations

import datetime
from typing import Any

import pytest

from salli.application.ports import BillingChangeRejected
from salli.application.services.billing_service import (
    BillingService,
    QuotaExceeded,
    SubscriptionChangeUnavailable,
)
from salli.domain.billing.credits import (
    ACTION_AGENT_MESSAGE,
    ACTION_STATEMENT_UPLOAD,
    cost,
)
from salli.domain.billing.plans import (
    METRIC_AI_CREDITS,
    METRICS,
    get_plan,
)

# ── In-memory fakes ────────────────────────────────────────────────────────────


class FakeSubscriptionRepo:
    """Mirrors SQLSubscriptionRepository: one merged row per user."""

    def __init__(self) -> None:
        self._rows: dict[str, dict[str, Any]] = {}

    async def get(self, user_id: str) -> dict[str, Any] | None:
        row = self._rows.get(user_id)
        return dict(row) if row else None

    async def upsert(self, user_id: str, fields: dict[str, Any]) -> None:
        row = self._rows.get(user_id)
        if row is None:
            row = {
                "id": f"sub-{user_id}",
                "user_id": user_id,
                "plan": "free",
                "billing_cycle": None,
                "status": "active",
                "provider": "paddle",
                "provider_customer_id": None,
                "provider_subscription_id": None,
                "current_period_start": None,
                "current_period_end": None,
                "cancel_at_period_end": False,
            }
            self._rows[user_id] = row
        row.update(fields)

    async def list_active_paid(self) -> list[dict[str, Any]]:
        return [
            dict(r)
            for r in self._rows.values()
            if r["status"] in ("active", "trialing") and r["plan"] != "free"
        ]


class FakeUsageRepo:
    def __init__(self) -> None:
        self._counts: dict[tuple[str, str, str], int] = {}

    async def get_count(self, user_id: str, period: str, metric: str) -> int:
        return self._counts.get((user_id, period, metric), 0)

    async def increment(self, user_id: str, period: str, metric: str, by: int = 1) -> int:
        key = (user_id, period, metric)
        self._counts[key] = self._counts.get(key, 0) + by
        return self._counts[key]

    async def get_counts(self, user_id: str, period: str) -> dict[str, int]:
        return {
            metric: count
            for (uid, per, metric), count in self._counts.items()
            if uid == user_id and per == period
        }

    def seed(self, user_id: str, period: str, metric: str, count: int) -> None:
        self._counts[(user_id, period, metric)] = count


class FakeUserProfileRepo:
    def __init__(self) -> None:
        self._rows: dict[str, dict[str, Any]] = {}

    async def get(self, user_id: str) -> dict[str, Any] | None:
        row = self._rows.get(user_id)
        return dict(row) if row else None

    async def upsert(self, user_id: str, fields: dict[str, Any]) -> None:
        row = self._rows.setdefault(user_id, {"id": user_id})
        # SQL repo only writes non-None values.
        row.update({k: v for k, v in fields.items() if v is not None})


class FakeCreditRepo:
    """Mirrors SQLCreditRepository over the same in-memory counters.

    Shares the FakeUsageRepo store rather than keeping its own, so a test that
    seeds usage directly and a test that spends through the service are talking
    about the same allowance — the real tables behave that way too.
    """

    def __init__(self, usage: FakeUsageRepo) -> None:
        self._usage = usage
        self._purchases: list[dict[str, Any]] = []

    async def balance(self, user_id: str, period: str, metric: str, allowance: int) -> dict:
        used = await self._usage.get_count(user_id, period, metric)
        purchased = sum(p["credits_remaining"] for p in self._mine(user_id))
        allowance_remaining = max(0, allowance - used)
        return {
            "allowance_remaining": allowance_remaining,
            "allowance_used": used,
            "allowance_total": allowance,
            "purchased_remaining": purchased,
            "total": allowance_remaining + purchased,
        }

    async def spend(
        self, user_id: str, period: str, metric: str, cost: int, allowance: int
    ) -> bool:
        if cost <= 0:
            return True
        bal = await self.balance(user_id, period, metric, allowance)
        if cost > bal["total"]:
            return False
        from_allowance = min(cost, bal["allowance_remaining"])
        if from_allowance:
            await self._usage.increment(user_id, period, metric, by=from_allowance)
        outstanding = cost - from_allowance
        for purchase in self._mine(user_id):
            if outstanding <= 0:
                break
            take = min(outstanding, purchase["credits_remaining"])
            purchase["credits_remaining"] -= take
            outstanding -= take
        return True

    async def grant(self, user_id: str, credits: int, provider_transaction_id: str) -> bool:
        if any(p["txn"] == provider_transaction_id for p in self._purchases):
            return False
        self._purchases.append(
            {
                "user_id": user_id,
                "credits": credits,
                "credits_remaining": credits,
                "txn": provider_transaction_id,
            }
        )
        return True

    def _mine(self, user_id: str) -> list[dict[str, Any]]:
        return [p for p in self._purchases if p["user_id"] == user_id]


class FakeUnitOfWork:
    def __init__(self, subs, usage, profiles, credits=None) -> None:
        self.subscriptions = subs
        self.usage = usage
        self.user_profiles = profiles
        self.credits = credits if credits is not None else FakeCreditRepo(usage)


class FakeBillingPort:
    """Records calls; returns canned data. Implements the BillingPort surface."""

    def __init__(
        self,
        price_to_plan: dict[str, str] | None = None,
        price_to_cycle: dict[str, str] | None = None,
    ) -> None:
        # One paid plan now, so one monthly and one annual price. This used to
        # carry a second pair for the retired Starter tier.
        self._price_to_plan = price_to_plan or {
            "pri_pro": "pro",
            "pri_pro_y": "pro",
        }
        self._price_to_cycle = price_to_cycle or {
            "pri_pro": "month",
            "pri_pro_y": "year",
        }
        self.checkout_calls: list[tuple] = []
        self.portal_calls: list[str] = []
        self.change_calls: list[tuple] = []
        self.preview_calls: list[tuple] = []
        self.find_calls: list[str] = []
        # Test hooks: what find_subscription_id discovers, and an exception to throw
        # from change_subscription instead of succeeding.
        self.found_subscription_id: str | None = None
        self.change_raises: Exception | None = None

    async def create_checkout(self, user_id, email, plan_key, cycle, customer_id):
        self.checkout_calls.append((user_id, email, plan_key, cycle, customer_id))
        return {"provider": "paddle", "price_id": "pri_pro", "custom_data": {"user_id": user_id}}

    async def get_portal_url(self, customer_id: str) -> str:
        self.portal_calls.append(customer_id)
        return f"https://portal.example/{customer_id}"

    def verify_and_parse_webhook(self, raw_body, signature):
        return {"parsed": True}

    def plan_for_price_id(self, price_id: str) -> str:
        return self._price_to_plan.get(price_id, "free")

    def cycle_for_price_id(self, price_id: str) -> str | None:
        return self._price_to_cycle.get(price_id)

    async def preview_subscription_change(self, subscription_id, plan_key, cycle):
        self.preview_calls.append((subscription_id, plan_key, cycle))
        return {"plan": plan_key, "cycle": cycle, "immediate_charge_minor": 4271}

    async def change_subscription(self, subscription_id, plan_key, cycle):
        self.change_calls.append((subscription_id, plan_key, cycle))
        if self.change_raises:
            raise self.change_raises
        return {
            "price_id": f"pri_{plan_key}" + ("_y" if cycle == "year" else ""),
            "status": "active",
            "provider_customer_id": "ctm_1",
            "provider_subscription_id": subscription_id,
            "current_period_start": "2026-08-01T00:00:00Z",
            "current_period_end": "2027-08-01T00:00:00Z",
            "cancel_at_period_end": False,
        }

    async def find_subscription_id(self, customer_id: str) -> str | None:
        self.find_calls.append(customer_id)
        return self.found_subscription_id


USER = "user-1"


# ── Entitlements / provisioning ──────────────────────────────────────────────


async def test_get_entitlements_bootstraps_free_subscription(service, repos):
    subs, _, profiles = repos
    ent = await service.get_entitlements(USER, email="u@example.com")

    assert ent["plan"] == "free"
    assert ent["status"] == "active"
    # A free subscription row was created on first use.
    assert (await subs.get(USER))["plan"] == "free"
    # The profile was upserted with the email.
    assert (await profiles.get(USER))["email"] == "u@example.com"

    # Usage list covers every metric with zero usage and remaining == limit.
    free = get_plan("free")
    assert {u["metric"] for u in ent["usage"]} == set(METRICS)
    for u in ent["usage"]:
        assert u["used"] == 0
        assert u["limit"] == free.limits[u["metric"]]
        assert u["remaining"] == free.limits[u["metric"]]
        assert u["resets_at"]  # ISO timestamp present


async def test_get_entitlements_reflects_seeded_usage(service, repos):
    _, usage, _ = repos
    # Ensure the subscription/profile exist, then seed usage for the current period.
    await service.get_entitlements(USER)
    from salli.application.services.billing_service import _period

    usage.seed(USER, _period(), METRIC_AI_CREDITS, 5)
    ent = await service.get_entitlements(USER)

    row = next(u for u in ent["usage"] if u["metric"] == METRIC_AI_CREDITS)
    limit = get_plan("free").limits[METRIC_AI_CREDITS]
    assert row["used"] == 5
    assert row["remaining"] == limit - 5


# ── Metering ─────────────────────────────────────────────────────────────────


async def test_spend_charges_the_action_price(service, repos):
    _, usage, _ = repos
    await service.spend_credits(USER, ACTION_AGENT_MESSAGE)
    from salli.application.services.billing_service import _period

    # Not a flat 1 any more — the whole point of credits is that the charge
    # reflects what the action actually costs on the model it ran on.
    assert await usage.get_count(USER, _period(), METRIC_AI_CREDITS) == cost(
        ACTION_AGENT_MESSAGE, None
    )


async def test_spend_raises_when_balance_is_short(service, repos):
    _, usage, _ = repos
    from salli.application.services.billing_service import _period

    limit = get_plan("free").limits[METRIC_AI_CREDITS]
    usage.seed(USER, _period(), METRIC_AI_CREDITS, limit)

    with pytest.raises(QuotaExceeded) as exc:
        await service.spend_credits(USER, ACTION_AGENT_MESSAGE)

    assert exc.value.metric == METRIC_AI_CREDITS
    assert exc.value.limit == limit
    assert exc.value.plan_key == "free"
    # Counter was NOT incremented past the limit.
    assert await usage.get_count(USER, _period(), METRIC_AI_CREDITS) == limit


async def test_actions_draw_on_one_shared_balance(service, repos):
    """Replaces test_metrics_are_independent.

    There used to be three counters, and exhausting one left the others with
    headroom. That is exactly what changed: every AI action now draws on the
    same balance, so spending it on chat leaves nothing for statements.
    """
    _, usage, _ = repos
    from salli.application.services.billing_service import _period

    limit = get_plan("free").limits[METRIC_AI_CREDITS]
    usage.seed(USER, _period(), METRIC_AI_CREDITS, limit)

    with pytest.raises(QuotaExceeded):
        await service.spend_credits(USER, ACTION_STATEMENT_UPLOAD)


async def test_metering_uses_free_limit_when_canceled(service, repos):
    """A canceled paid sub is metered at the Free limit, not its old paid allowance."""
    subs, usage, _ = repos
    from salli.application.services.billing_service import _period

    # User is on pro but canceled.
    await subs.upsert(USER, {"plan": "pro", "status": "canceled"})
    free_limit = get_plan("free").limits[METRIC_AI_CREDITS]
    usage.seed(USER, _period(), METRIC_AI_CREDITS, free_limit)

    with pytest.raises(QuotaExceeded) as exc:
        await service.spend_credits(USER, ACTION_AGENT_MESSAGE)
    assert exc.value.limit == free_limit
    assert exc.value.plan_key == "free"


async def test_metering_active_paid_uses_paid_limit(service, repos):
    """An active pro sub keeps the pro allowance (regression guard for _effective_plan)."""
    subs, usage, _ = repos
    from salli.application.services.billing_service import _period

    await subs.upsert(USER, {"plan": "pro", "status": "active"})
    free_limit = get_plan("free").limits[METRIC_AI_CREDITS]
    usage.seed(USER, _period(), METRIC_AI_CREDITS, free_limit)

    # Past the free limit but well under pro — should not raise.
    await service.spend_credits(USER, ACTION_AGENT_MESSAGE)
    assert await usage.get_count(USER, _period(), METRIC_AI_CREDITS) == free_limit + cost(
        ACTION_AGENT_MESSAGE, None
    )


# ── Plan catalog ─────────────────────────────────────────────────────────────


def test_get_plans_matches_registry(service):
    plans = {p["key"]: p for p in service.get_plans()}
    assert set(plans) == {"free", "pro"}
    assert plans["free"]["paid"] is False
    assert plans["pro"]["paid"] is True
    assert plans["pro"]["paid"] is True
    assert plans["pro"]["limits"] == get_plan("pro").limits


# ── Checkout / portal orchestration ──────────────────────────────────────────


async def test_create_checkout_passes_customer_id_from_subscription(service, repos, billing_port):
    subs, _, _ = repos
    await service.get_entitlements(USER, email="u@example.com")
    await subs.upsert(USER, {"provider_customer_id": "ctm_123"})

    await service.create_checkout(USER, "u@example.com", "pro")

    assert billing_port.checkout_calls == [(USER, "u@example.com", "pro", "month", "ctm_123")]


async def test_create_checkout_passes_cycle(service, billing_port):
    await service.create_checkout(USER, "u@example.com", "pro", cycle="year")
    assert billing_port.checkout_calls[0][3] == "year"


async def test_create_checkout_without_customer_passes_none(service, billing_port):
    await service.create_checkout(USER, "u@example.com", "pro")
    assert billing_port.checkout_calls[0][4] is None


async def test_create_checkout_without_provider_raises(uow_factory):
    svc = BillingService(uow_factory, billing_port=None)
    with pytest.raises(RuntimeError, match="not configured"):
        await svc.create_checkout(USER, "u@example.com", "pro")


async def test_get_portal_url_requires_customer(service, repos):
    subs, _, _ = repos
    await subs.upsert(USER, {"plan": "free"})  # row exists, no provider_customer_id
    with pytest.raises(RuntimeError, match="No billing customer"):
        await service.get_portal_url(USER)


async def test_get_portal_url_delegates_with_customer(service, repos, billing_port):
    subs, _, _ = repos
    await subs.upsert(USER, {"provider_customer_id": "ctm_9"})
    url = await service.get_portal_url(USER)
    assert url == "https://portal.example/ctm_9"
    assert billing_port.portal_calls == ["ctm_9"]


# ── Webhook application ──────────────────────────────────────────────────────


async def test_apply_webhook_event_updates_subscription(service, repos):
    subs, _, _ = repos
    event = {
        "user_id": USER,
        "price_id": "pri_pro",
        "status": "active",
        "provider_customer_id": "ctm_77",
        "provider_subscription_id": "sub_77",
        "current_period_start": "2026-07-01T00:00:00Z",
        "current_period_end": "2026-08-01T00:00:00Z",
        "cancel_at_period_end": False,
    }
    await service.apply_webhook_event(event)

    row = await subs.get(USER)
    assert row["plan"] == "pro"  # mapped from pri_pro
    assert row["provider"] == "paddle"
    assert row["status"] == "active"
    assert row["provider_customer_id"] == "ctm_77"
    assert row["provider_subscription_id"] == "sub_77"
    # Period bounds are parsed from ISO strings to tz-aware datetimes (DB columns
    # are DateTime, so a raw string would fail to bind).
    assert row["current_period_end"] == datetime.datetime(2026, 8, 1, tzinfo=datetime.UTC)
    assert row["current_period_start"] == datetime.datetime(2026, 7, 1, tzinfo=datetime.UTC)


async def test_apply_webhook_event_records_annual_cycle(service, repos):
    """The price ID is the only carrier of the cycle — both plan and cycle resolve from it."""
    subs, _, _ = repos
    await service.apply_webhook_event(
        {"user_id": USER, "price_id": "pri_pro_y", "status": "active"}
    )
    row = await subs.get(USER)
    assert row["plan"] == "pro"
    assert row["billing_cycle"] == "year"
    assert (await service.get_entitlements(USER))["billing_cycle"] == "year"


async def test_apply_webhook_event_records_monthly_cycle(service, repos):
    subs, _, _ = repos
    await service.apply_webhook_event({"user_id": USER, "price_id": "pri_pro", "status": "active"})
    assert (await subs.get(USER))["billing_cycle"] == "month"


async def test_unmapped_price_leaves_cycle_unknown(service, repos):
    """An unmapped price must read as 'unknown', not as a default monthly."""
    subs, _, _ = repos
    await service.apply_webhook_event({"user_id": USER, "price_id": "pri_???", "status": "active"})
    row = await subs.get(USER)
    assert row["plan"] == "free"
    assert row["billing_cycle"] is None


async def test_event_without_a_price_id_keeps_the_existing_plan(service, repos):
    """A subscription event carrying no resolvable price must not downgrade a payer.

    _normalize_subscription always emits a "price_id" key, falling back to "" when the
    event has no items[].price.id, and "" resolves to plan "free". Keying the plan
    write off key *presence* therefore turned any such event into a silent downgrade
    for an active, paying subscriber — so an absent/empty price leaves plan and cycle
    at their last known-good values instead.
    """
    subs, _, _ = repos
    await service.apply_webhook_event(
        {"user_id": USER, "price_id": "pri_pro_y", "status": "active"}
    )
    assert (await subs.get(USER))["plan"] == "pro"

    # Same subscription, but this delivery carries no item detail.
    await service.apply_webhook_event({"user_id": USER, "price_id": "", "status": "active"})
    row = await subs.get(USER)
    assert row["plan"] == "pro"
    assert row["billing_cycle"] == "year"
    assert (await service.get_entitlements(USER))["plan"] == "pro"


async def test_entitlements_hide_cycle_when_plan_not_effective(service, repos):
    """A canceled row keeps billing_cycle in the DB, but surfacing it would render
    as 'Free · Annual' — the effective plan governs what the client sees."""
    subs, _, _ = repos
    await service.apply_webhook_event(
        {"user_id": USER, "price_id": "pri_pro_y", "status": "canceled"}
    )
    assert (await subs.get(USER))["billing_cycle"] == "year"  # still stored
    ent = await service.get_entitlements(USER)
    assert ent["plan"] == "free"
    assert ent["billing_cycle"] is None


async def test_entitlements_cycle_is_none_on_free_plan(service):
    assert (await service.get_entitlements(USER))["billing_cycle"] is None


async def test_apply_webhook_event_downgrades_entitlements_on_cancel(service, repos):
    """A canceled subscription keeps its plan key but entitlements fall back to Free."""
    # First upgrade to pro...
    await service.apply_webhook_event({"user_id": USER, "price_id": "pri_pro", "status": "active"})
    ent = await service.get_entitlements(USER)
    assert ent["plan"] == "pro"

    # ...then cancel. The plan key may still be pro, but status governs the limits.
    await service.apply_webhook_event(
        {"user_id": USER, "price_id": "pri_pro", "status": "canceled"}
    )
    ent = await service.get_entitlements(USER)
    assert ent["plan"] == "free"
    assert ent["status"] == "canceled"
    agent = next(u for u in ent["usage"] if u["metric"] == METRIC_AI_CREDITS)
    assert agent["limit"] == get_plan("free").limits[METRIC_AI_CREDITS]


async def test_apply_webhook_event_captures_customer_from_transaction(service, repos):
    """A transaction.completed-shaped event (no plan/status) still stores the customer id
    so the portal becomes reachable before the subscription webhook lands."""
    subs, _, _ = repos
    await service.apply_webhook_event({"user_id": USER, "provider_customer_id": "ctm_txn"})
    assert (await subs.get(USER))["provider_customer_id"] == "ctm_txn"
    # And get_portal_url now succeeds for this user.
    assert await service.get_portal_url(USER) == "https://portal.example/ctm_txn"


async def test_apply_webhook_event_noop_without_user_id(service, repos):
    subs, _, _ = repos
    await service.apply_webhook_event({"price_id": "pri_pro", "status": "active"})
    assert await subs.get(USER) is None


async def test_apply_webhook_event_noop_without_provider(uow_factory, repos):
    subs, _, _ = repos
    svc = BillingService(uow_factory, billing_port=None)
    await svc.apply_webhook_event({"user_id": USER, "price_id": "pri_pro"})
    assert await subs.get(USER) is None


def test_verify_and_parse_webhook_none_without_provider(uow_factory):
    svc = BillingService(uow_factory, billing_port=None)
    assert svc.verify_and_parse_webhook(b"{}", "sig") is None


def test_verify_and_parse_webhook_delegates(service):
    assert service.verify_and_parse_webhook(b"{}", "sig") == {"parsed": True}


# ── Plan changes on an existing subscription ────────────────────────────────────


async def _seed_paid(repos, **overrides):
    """A user with a live Paddle subscription — the state a plan change acts on."""
    subs = repos[0]
    fields = {
        "plan": "pro",
        "billing_cycle": "month",
        "status": "active",
        "provider_customer_id": "ctm_1",
        "provider_subscription_id": "sub_123",
    }
    fields.update(overrides)
    await subs.upsert(USER, fields)


async def test_change_plan_patches_the_existing_subscription_and_never_checkouts(
    service, billing_port, repos
):
    """The core regression test for the double-billing bug.

    A Pro-monthly subscriber moving to Plus-annual must PATCH the subscription they
    already have. Opening checkout here is what created a second live subscription
    while the first kept billing.
    """
    await _seed_paid(repos)

    await service.change_plan(USER, "u@e.com", "pro", "year")

    assert billing_port.change_calls == [("sub_123", "pro", "year")]
    assert billing_port.checkout_calls == []


async def test_change_plan_writes_the_new_plan_and_cycle(service, repos):
    await _seed_paid(repos)

    out = await service.change_plan(USER, None, "pro", "year")

    row = await repos[0].get(USER)
    assert (row["plan"], row["billing_cycle"]) == ("pro", "year")
    assert row["provider_subscription_id"] == "sub_123"
    # The response is full entitlements, so the client can seed its cache with it.
    assert out["plan"] == "pro" and out["billing_cycle"] == "year"
    assert out["current_period_end"] is not None


async def test_change_plan_skips_the_write_when_the_webhook_got_there_first(
    service, billing_port, repos
):
    # Webhook already applied the target state; re-applying our (now older) copy of the
    # same payload would risk clobbering anything that landed after it.
    await _seed_paid(repos, plan="pro", billing_cycle="year")
    await repos[0].upsert(USER, {"cancel_at_period_end": False})

    await service.change_plan(USER, None, "pro", "month")  # different cycle -> allowed
    assert billing_port.change_calls == [("sub_123", "pro", "month")]


@pytest.mark.parametrize(
    "overrides,reason",
    [
        ({"status": "past_due"}, "past_due"),
        ({"status": "paused"}, "paused"),
        ({"status": "some_new_paddle_status"}, "unknown_status"),
        ({"cancel_at_period_end": True}, "scheduled_change"),
    ],
)
async def test_change_plan_blocks_unchangeable_states_without_offering_checkout(
    service, billing_port, repos, overrides, reason
):
    # Every one of these previously fell through to checkout — a second door into the
    # double-billing bug. past_due is the worst: _effective_plan reports Free for it.
    await _seed_paid(repos, **overrides)

    with pytest.raises(SubscriptionChangeUnavailable) as exc:
        await service.change_plan(USER, None, "pro", "year")

    assert exc.value.reason == reason
    assert billing_port.change_calls == []
    assert billing_port.checkout_calls == []


async def test_change_plan_on_canceled_subscription_routes_to_checkout(service, repos):
    # Terminal at Paddle — it can never be patched, and it isn't billing, so a fresh
    # purchase is correct here.
    await _seed_paid(repos, status="canceled")

    with pytest.raises(SubscriptionChangeUnavailable) as exc:
        await service.change_plan(USER, None, "pro", "year")

    assert exc.value.reason == "checkout_required"


async def test_change_plan_for_a_free_user_routes_to_checkout(service, repos):
    with pytest.raises(SubscriptionChangeUnavailable) as exc:
        await service.change_plan(USER, "u@e.com", "pro", "year")

    assert exc.value.reason == "checkout_required"


async def test_change_plan_refuses_a_no_op_without_calling_the_provider(
    service, billing_port, repos
):
    await _seed_paid(repos, plan="pro", billing_cycle="month")

    with pytest.raises(SubscriptionChangeUnavailable) as exc:
        await service.change_plan(USER, None, "pro", "month")

    assert exc.value.reason == "no_change"
    assert billing_port.change_calls == []


async def test_change_plan_allows_a_row_with_no_recorded_cycle(service, billing_port, repos):
    # billing_cycle is NULL on rows written before that column existed. That's "unknown",
    # not "matches" — refusing here would strand those users on their current plan.
    await _seed_paid(repos, plan="pro", billing_cycle=None)

    await service.change_plan(USER, None, "pro", "month")

    assert billing_port.change_calls == [("sub_123", "pro", "month")]


async def test_change_plan_recovers_a_missing_subscription_id(service, billing_port, repos):
    # transaction.completed records only the customer id. Without recovery this user
    # would be sent to checkout and billed twice.
    await _seed_paid(repos, provider_subscription_id=None)
    billing_port.found_subscription_id = "sub_recovered"

    await service.change_plan(USER, None, "pro", "year")

    assert billing_port.find_calls == ["ctm_1"]
    assert billing_port.change_calls == [("sub_recovered", "pro", "year")]
    assert (await repos[0].get(USER))["provider_subscription_id"] == "sub_recovered"


async def test_change_plan_falls_back_to_checkout_when_no_subscription_is_found(
    service, billing_port, repos
):
    await _seed_paid(repos, provider_subscription_id=None)
    billing_port.found_subscription_id = None

    with pytest.raises(SubscriptionChangeUnavailable) as exc:
        await service.change_plan(USER, None, "pro", "year")

    assert exc.value.reason == "checkout_required"


async def test_change_plan_rejects_a_downgrade_to_free(service, repos):
    # Free is not purchasable in place; cancelling goes through the portal.
    await _seed_paid(repos)

    with pytest.raises(ValueError, match="not a paid plan"):
        await service.change_plan(USER, None, "free", "month")


async def test_change_plan_rejects_an_unknown_plan(service, repos):
    await _seed_paid(repos)

    with pytest.raises(ValueError, match="not a paid plan"):
        await service.change_plan(USER, None, "gold", "month")


async def test_change_plan_without_a_provider_raises(uow_factory):
    svc = BillingService(uow_factory, billing_port=None)

    with pytest.raises(RuntimeError, match="not configured"):
        await svc.change_plan(USER, None, "pro", "year")


async def test_preview_never_writes_to_the_database(service, billing_port, repos):
    await _seed_paid(repos)
    before = await repos[0].get(USER)

    out = await service.preview_plan_change(USER, None, "pro", "year")

    assert billing_port.preview_calls == [("sub_123", "pro", "year")]
    assert billing_port.change_calls == []
    assert await repos[0].get(USER) == before
    assert out["immediate_charge_minor"] == 4271


async def test_provider_rejection_leaves_the_stored_plan_untouched(service, billing_port, repos):
    # prevent_change means Paddle applied nothing, so neither do we.
    await _seed_paid(repos)
    billing_port.change_raises = BillingChangeRejected("declined", "Card declined")

    with pytest.raises(BillingChangeRejected):
        await service.change_plan(USER, None, "pro", "year")

    row = await repos[0].get(USER)
    assert (row["plan"], row["billing_cycle"]) == ("pro", "month")


@pytest.mark.parametrize(
    "overrides,expected",
    [
        ({}, "in_place"),
        ({"status": "trialing"}, "in_place"),
        ({"status": "canceled"}, "checkout"),
        ({"status": "past_due"}, "blocked"),
        ({"status": "paused"}, "blocked"),
        ({"cancel_at_period_end": True}, "blocked"),
        ({"provider_subscription_id": None}, "checkout"),
    ],
)
async def test_entitlements_expose_the_change_mode(service, repos, overrides, expected):
    await _seed_paid(repos, **overrides)

    out = await service.get_entitlements(USER, None)

    assert out["change_mode"] == expected
    assert (out["change_blocked_reason"] is not None) == (expected == "blocked")


async def test_change_mode_is_computed_without_a_billing_port(uow_factory, repos):
    # Settings must still render on a deployment with no Paddle credentials.
    await _seed_paid(repos)
    svc = BillingService(uow_factory, billing_port=None)

    out = await svc.get_entitlements(USER, None)

    assert out["change_mode"] == "in_place"


async def test_past_due_reports_free_limits_but_is_not_offered_a_new_purchase(service, repos):
    # The two views deliberately disagree: entitlements fall back to Free, while
    # change_mode still sees a live subscription and refuses to sell a second one.
    await _seed_paid(repos, status="past_due")

    out = await service.get_entitlements(USER, None)

    assert out["plan"] == "free"
    assert out["change_mode"] == "blocked"
    assert out["change_blocked_reason"] == "past_due"


# ── BYOK lifts the quota to a safety ceiling ─────────────────────────────────


class FakeByokCredentials:
    """Stands in for LlmCredentialService's view of "does this user have a key"."""

    def __init__(self, users_with_keys: set[str] | None = None) -> None:
        self._users = users_with_keys or set()

    async def has_byok(self, user_id: str) -> bool:
        return user_id in self._users


def _byok_service(uow_factory, billing_port, *, byok_users: set[str]):
    return BillingService(
        uow_factory,
        billing_port=billing_port,
        credentials=FakeByokCredentials(byok_users),
    )


async def test_byok_lifts_the_metric_limit_to_the_ceiling(uow_factory, billing_port):
    """A Free user on their own key must not hit Free's 150-message limit."""
    from salli.domain.billing.plans import BYOK_LIMITS

    svc = _byok_service(uow_factory, billing_port, byok_users={USER})
    ent = await svc.get_entitlements(USER)
    agent = next(u for u in ent["usage"] if u["metric"] == METRIC_AI_CREDITS)

    assert ent["byok"] is True
    assert agent["limit"] == BYOK_LIMITS[METRIC_AI_CREDITS]
    assert agent["limit"] > get_plan("pro").limits[METRIC_AI_CREDITS], (
        "the ceiling must sit clear of Pro, or a Pro subscriber gains nothing from BYOK"
    )


async def test_a_user_without_a_key_keeps_their_plan_limit(uow_factory, billing_port):
    svc = _byok_service(uow_factory, billing_port, byok_users=set())
    ent = await svc.get_entitlements(USER)
    agent = next(u for u in ent["usage"] if u["metric"] == METRIC_AI_CREDITS)

    assert ent["byok"] is False
    assert agent["limit"] == get_plan("free").limits[METRIC_AI_CREDITS]


async def test_byok_still_counts_usage(uow_factory, billing_port, repos):
    """The counter is the only usage record we have — skipping it for BYOK users
    would go blind on the most engaged ones."""
    _, usage, _ = repos
    svc = _byok_service(uow_factory, billing_port, byok_users={USER})
    await svc.spend_credits(USER, ACTION_AGENT_MESSAGE)
    await svc.spend_credits(USER, ACTION_AGENT_MESSAGE)

    ent = await svc.get_entitlements(USER)
    assert next(u for u in ent["usage"] if u["metric"] == METRIC_AI_CREDITS)["used"] == 2 * cost(
        ACTION_AGENT_MESSAGE, None
    )


async def test_byok_sails_past_the_free_limit(uow_factory, billing_port):
    """Free allows 150 agent messages; a BYOK user must get well past that.

    Counted in messages, not credits. This used to loop `free_limit + 5` times,
    which read the credit allowance as a message count — harmless only while a
    message cost 10 credits and the product stayed under the BYOK ceiling. At
    200 credits a message that loop spends six million credits and trips the
    backstop the test below is about.
    """
    svc = _byok_service(uow_factory, billing_port, byok_users={USER})
    free_messages = get_plan("free").limits[METRIC_AI_CREDITS] // cost(ACTION_AGENT_MESSAGE, None)
    for _ in range(free_messages + 5):
        await svc.spend_credits(USER, ACTION_AGENT_MESSAGE)  # must not raise


async def test_the_ceiling_is_still_enforced(uow_factory, billing_port, repos):
    """ "Quota lifted" is not "unmetered" — the backstop has to actually stop a
    runaway client, or a loop could pin the server indefinitely."""
    from salli.application.services.billing_service import _period
    from salli.domain.billing.plans import BYOK_LIMITS

    _, usage, _ = repos
    svc = _byok_service(uow_factory, billing_port, byok_users={USER})
    # Jump the counter to the ceiling rather than looping 50k times.
    usage.seed(USER, _period(), METRIC_AI_CREDITS, BYOK_LIMITS[METRIC_AI_CREDITS])

    with pytest.raises(QuotaExceeded) as exc:
        await svc.spend_credits(USER, ACTION_AGENT_MESSAGE)
    assert exc.value.plan_key == "byok", (
        "the 402 must say which ceiling was hit — a BYOK user needs a different "
        "message from a Free user who should be shown an upgrade"
    )


async def test_one_users_key_does_not_lift_anothers_quota(uow_factory, billing_port):
    svc = _byok_service(uow_factory, billing_port, byok_users={"someone-else"})
    ent = await svc.get_entitlements(USER)
    assert ent["byok"] is False
    assert (
        next(u for u in ent["usage"] if u["metric"] == METRIC_AI_CREDITS)["limit"]
        == (get_plan("free").limits[METRIC_AI_CREDITS])
    )


async def test_no_credential_source_behaves_exactly_as_before(service):
    """BillingService is constructed without `credentials` in plenty of places
    (and in older tests); that must degrade to plain plan limits, not crash."""
    ent = await service.get_entitlements(USER)
    assert ent["byok"] is False
