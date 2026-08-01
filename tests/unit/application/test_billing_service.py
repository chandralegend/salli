"""Unit tests for BillingService using in-memory fakes.

Covers entitlement bootstrap, monthly usage metering, the plan catalog, and the
Paddle-provider orchestration (checkout, portal, webhook apply). No DB, no network.
"""

from __future__ import annotations

import datetime
from contextlib import asynccontextmanager
from typing import Any

import pytest

from salli.application.ports import BillingChangeRejected
from salli.application.services.billing_service import (
    BillingService,
    QuotaExceeded,
    SubscriptionChangeUnavailable,
)
from salli.domain.billing.plans import (
    METRIC_AGENT_MESSAGES,
    METRIC_STATEMENT_UPLOADS,
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


class FakeUnitOfWork:
    def __init__(self, subs, usage, profiles) -> None:
        self.subscriptions = subs
        self.usage = usage
        self.user_profiles = profiles


class FakeBillingPort:
    """Records calls; returns canned data. Implements the BillingPort surface."""

    def __init__(
        self,
        price_to_plan: dict[str, str] | None = None,
        price_to_cycle: dict[str, str] | None = None,
    ) -> None:
        self._price_to_plan = price_to_plan or {
            "pri_plus": "plus",
            "pri_plus_y": "plus",
            "pri_pro": "pro",
            "pri_pro_y": "pro",
        }
        self._price_to_cycle = price_to_cycle or {
            "pri_plus": "month",
            "pri_plus_y": "year",
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
        return {"provider": "paddle", "price_id": "pri_plus", "custom_data": {"user_id": user_id}}

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


# ── Fixtures ────────────────────────────────────────────────────────────────────


@pytest.fixture
def repos():
    return FakeSubscriptionRepo(), FakeUsageRepo(), FakeUserProfileRepo()


@pytest.fixture
def uow_factory(repos):
    subs, usage, profiles = repos

    @asynccontextmanager
    async def _factory():
        yield FakeUnitOfWork(subs, usage, profiles)

    return _factory


@pytest.fixture
def billing_port():
    return FakeBillingPort()


@pytest.fixture
def service(uow_factory, billing_port):
    return BillingService(uow_factory, billing_port=billing_port)


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

    usage.seed(USER, _period(), METRIC_AGENT_MESSAGES, 5)
    ent = await service.get_entitlements(USER)

    row = next(u for u in ent["usage"] if u["metric"] == METRIC_AGENT_MESSAGES)
    limit = get_plan("free").limits[METRIC_AGENT_MESSAGES]
    assert row["used"] == 5
    assert row["remaining"] == limit - 5


# ── Metering ─────────────────────────────────────────────────────────────────


async def test_check_and_increment_under_limit(service, repos):
    _, usage, _ = repos
    await service.check_and_increment(USER, METRIC_AGENT_MESSAGES)
    from salli.application.services.billing_service import _period

    assert await usage.get_count(USER, _period(), METRIC_AGENT_MESSAGES) == 1


async def test_check_and_increment_raises_at_limit(service, repos):
    _, usage, _ = repos
    from salli.application.services.billing_service import _period

    limit = get_plan("free").limits[METRIC_AGENT_MESSAGES]
    usage.seed(USER, _period(), METRIC_AGENT_MESSAGES, limit)

    with pytest.raises(QuotaExceeded) as exc:
        await service.check_and_increment(USER, METRIC_AGENT_MESSAGES)

    assert exc.value.metric == METRIC_AGENT_MESSAGES
    assert exc.value.limit == limit
    assert exc.value.plan_key == "free"
    # Counter was NOT incremented past the limit.
    assert await usage.get_count(USER, _period(), METRIC_AGENT_MESSAGES) == limit


async def test_metrics_are_independent(service, repos):
    _, usage, _ = repos
    from salli.application.services.billing_service import _period

    limit = get_plan("free").limits[METRIC_AGENT_MESSAGES]
    usage.seed(USER, _period(), METRIC_AGENT_MESSAGES, limit)

    # A different metric still has headroom.
    await service.check_and_increment(USER, METRIC_STATEMENT_UPLOADS)
    assert await usage.get_count(USER, _period(), METRIC_STATEMENT_UPLOADS) == 1


async def test_metering_uses_free_limit_when_canceled(service, repos):
    """A canceled paid sub is metered at the Free limit, not its old paid allowance."""
    subs, usage, _ = repos
    from salli.application.services.billing_service import _period

    # User is on pro but canceled.
    await subs.upsert(USER, {"plan": "pro", "status": "canceled"})
    free_limit = get_plan("free").limits[METRIC_AGENT_MESSAGES]
    usage.seed(USER, _period(), METRIC_AGENT_MESSAGES, free_limit)

    with pytest.raises(QuotaExceeded) as exc:
        await service.check_and_increment(USER, METRIC_AGENT_MESSAGES)
    assert exc.value.limit == free_limit
    assert exc.value.plan_key == "free"


async def test_metering_active_paid_uses_paid_limit(service, repos):
    """An active pro sub keeps the pro allowance (regression guard for _effective_plan)."""
    subs, usage, _ = repos
    from salli.application.services.billing_service import _period

    await subs.upsert(USER, {"plan": "pro", "status": "active"})
    free_limit = get_plan("free").limits[METRIC_AGENT_MESSAGES]
    usage.seed(USER, _period(), METRIC_AGENT_MESSAGES, free_limit)

    # Past the free limit but well under pro — should not raise.
    await service.check_and_increment(USER, METRIC_AGENT_MESSAGES)
    assert await usage.get_count(USER, _period(), METRIC_AGENT_MESSAGES) == free_limit + 1


# ── Plan catalog ─────────────────────────────────────────────────────────────


def test_get_plans_matches_registry(service):
    plans = {p["key"]: p for p in service.get_plans()}
    assert set(plans) == {"free", "plus", "pro"}
    assert plans["free"]["paid"] is False
    assert plans["plus"]["paid"] is True
    assert plans["pro"]["paid"] is True
    assert plans["plus"]["limits"] == get_plan("plus").limits


# ── Checkout / portal orchestration ──────────────────────────────────────────


async def test_create_checkout_passes_customer_id_from_subscription(service, repos, billing_port):
    subs, _, _ = repos
    await service.get_entitlements(USER, email="u@example.com")
    await subs.upsert(USER, {"provider_customer_id": "ctm_123"})

    await service.create_checkout(USER, "u@example.com", "plus")

    assert billing_port.checkout_calls == [(USER, "u@example.com", "plus", "month", "ctm_123")]


async def test_create_checkout_passes_cycle(service, billing_port):
    await service.create_checkout(USER, "u@example.com", "pro", cycle="year")
    assert billing_port.checkout_calls[0][3] == "year"


async def test_create_checkout_without_customer_passes_none(service, billing_port):
    await service.create_checkout(USER, "u@example.com", "plus")
    assert billing_port.checkout_calls[0][4] is None


async def test_create_checkout_without_provider_raises(uow_factory):
    svc = BillingService(uow_factory, billing_port=None)
    with pytest.raises(RuntimeError, match="not configured"):
        await svc.create_checkout(USER, "u@example.com", "plus")


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
    agent = next(u for u in ent["usage"] if u["metric"] == METRIC_AGENT_MESSAGES)
    assert agent["limit"] == get_plan("free").limits[METRIC_AGENT_MESSAGES]


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

    await service.change_plan(USER, "u@e.com", "plus", "year")

    assert billing_port.change_calls == [("sub_123", "plus", "year")]
    assert billing_port.checkout_calls == []


async def test_change_plan_writes_the_new_plan_and_cycle(service, repos):
    await _seed_paid(repos)

    out = await service.change_plan(USER, None, "plus", "year")

    row = await repos[0].get(USER)
    assert (row["plan"], row["billing_cycle"]) == ("plus", "year")
    assert row["provider_subscription_id"] == "sub_123"
    # The response is full entitlements, so the client can seed its cache with it.
    assert out["plan"] == "plus" and out["billing_cycle"] == "year"
    assert out["current_period_end"] is not None


async def test_change_plan_skips_the_write_when_the_webhook_got_there_first(
    service, billing_port, repos
):
    # Webhook already applied the target state; re-applying our (now older) copy of the
    # same payload would risk clobbering anything that landed after it.
    await _seed_paid(repos, plan="plus", billing_cycle="year")
    await repos[0].upsert(USER, {"cancel_at_period_end": False})

    await service.change_plan(USER, None, "plus", "month")  # different cycle -> allowed
    assert billing_port.change_calls == [("sub_123", "plus", "month")]


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
        await service.change_plan(USER, None, "plus", "year")

    assert exc.value.reason == reason
    assert billing_port.change_calls == []
    assert billing_port.checkout_calls == []


async def test_change_plan_on_canceled_subscription_routes_to_checkout(service, repos):
    # Terminal at Paddle — it can never be patched, and it isn't billing, so a fresh
    # purchase is correct here.
    await _seed_paid(repos, status="canceled")

    with pytest.raises(SubscriptionChangeUnavailable) as exc:
        await service.change_plan(USER, None, "plus", "year")

    assert exc.value.reason == "checkout_required"


async def test_change_plan_for_a_free_user_routes_to_checkout(service, repos):
    with pytest.raises(SubscriptionChangeUnavailable) as exc:
        await service.change_plan(USER, "u@e.com", "plus", "year")

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

    await service.change_plan(USER, None, "plus", "year")

    assert billing_port.find_calls == ["ctm_1"]
    assert billing_port.change_calls == [("sub_recovered", "plus", "year")]
    assert (await repos[0].get(USER))["provider_subscription_id"] == "sub_recovered"


async def test_change_plan_falls_back_to_checkout_when_no_subscription_is_found(
    service, billing_port, repos
):
    await _seed_paid(repos, provider_subscription_id=None)
    billing_port.found_subscription_id = None

    with pytest.raises(SubscriptionChangeUnavailable) as exc:
        await service.change_plan(USER, None, "plus", "year")

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
        await svc.change_plan(USER, None, "plus", "year")


async def test_preview_never_writes_to_the_database(service, billing_port, repos):
    await _seed_paid(repos)
    before = await repos[0].get(USER)

    out = await service.preview_plan_change(USER, None, "plus", "year")

    assert billing_port.preview_calls == [("sub_123", "plus", "year")]
    assert billing_port.change_calls == []
    assert await repos[0].get(USER) == before
    assert out["immediate_charge_minor"] == 4271


async def test_provider_rejection_leaves_the_stored_plan_untouched(service, billing_port, repos):
    # prevent_change means Paddle applied nothing, so neither do we.
    await _seed_paid(repos)
    billing_port.change_raises = BillingChangeRejected("declined", "Card declined")

    with pytest.raises(BillingChangeRejected):
        await service.change_plan(USER, None, "plus", "year")

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
