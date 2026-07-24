"""Unit tests for BillingService using in-memory fakes.

Covers entitlement bootstrap, monthly usage metering, the plan catalog, and the
Paddle-provider orchestration (checkout, portal, webhook apply). No DB, no network.
"""

from __future__ import annotations

import datetime
from contextlib import asynccontextmanager
from typing import Any

import pytest

from salli.application.services.billing_service import BillingService, QuotaExceeded
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

    def __init__(self, price_to_plan: dict[str, str] | None = None) -> None:
        self._price_to_plan = price_to_plan or {"pri_plus": "plus", "pri_pro": "pro"}
        self.checkout_calls: list[tuple] = []
        self.portal_calls: list[str] = []

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


async def test_create_checkout_passes_customer_id_from_profile(service, repos, billing_port):
    _, _, profiles = repos
    await service.get_entitlements(USER, email="u@example.com")
    await profiles.upsert(USER, {"paddle_customer_id": "ctm_123"})

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
    _, _, profiles = repos
    await profiles.upsert(USER, {"email": "u@example.com"})  # no paddle_customer_id
    with pytest.raises(RuntimeError, match="No billing customer"):
        await service.get_portal_url(USER)


async def test_get_portal_url_delegates_with_customer(service, repos, billing_port):
    _, _, profiles = repos
    await profiles.upsert(USER, {"paddle_customer_id": "ctm_9"})
    url = await service.get_portal_url(USER)
    assert url == "https://portal.example/ctm_9"
    assert billing_port.portal_calls == ["ctm_9"]


# ── Webhook application ──────────────────────────────────────────────────────


async def test_apply_webhook_event_updates_subscription_and_profile(service, repos):
    subs, _, profiles = repos
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

    # Customer id is mirrored onto the profile for later portal calls.
    assert (await profiles.get(USER))["paddle_customer_id"] == "ctm_77"


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
    _, _, profiles = repos
    await service.apply_webhook_event({"user_id": USER, "provider_customer_id": "ctm_txn"})
    assert (await profiles.get(USER))["paddle_customer_id"] == "ctm_txn"
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
