"""Unit tests for BillingService using in-memory fakes."""

from __future__ import annotations

from contextlib import asynccontextmanager

import pytest

from salli.application.services.billing_service import BillingService

# ── In-memory fakes ────────────────────────────────────────────────────────────


class FakeUserProfileRepo:
    def __init__(self):
        self._profiles: dict[str, dict] = {}

    async def get(self, user_id):
        return self._profiles.get(user_id)

    async def upsert(self, user_id, fields):
        row = self._profiles.setdefault(user_id, {"id": user_id})
        row.update({k: v for k, v in fields.items() if v is not None})


class FakeSubscriptionRepo:
    def __init__(self, subs=None):
        self._subs: dict[str, dict] = subs or {}

    async def get(self, user_id):
        return self._subs.get(user_id)

    async def upsert(self, user_id, fields):
        row = self._subs.setdefault(user_id, {})
        row.update(fields)


class FakeUsageRepo:
    def __init__(self):
        self._counts: dict[tuple, int] = {}

    async def get_count(self, user_id, period, metric):
        return self._counts.get((user_id, period, metric), 0)

    async def get_counts(self, user_id, period):
        return {
            metric: count
            for (uid, p, metric), count in self._counts.items()
            if uid == user_id and p == period
        }

    async def increment(self, user_id, period, metric):
        key = (user_id, period, metric)
        self._counts[key] = self._counts.get(key, 0) + 1


class FakeUoW:
    def __init__(self, user_profiles, subscriptions, usage):
        self.user_profiles = user_profiles
        self.subscriptions = subscriptions
        self.usage = usage

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_):
        pass


def _make_service(subs=None):
    user_profiles = FakeUserProfileRepo()
    subscriptions = FakeSubscriptionRepo(subs)
    usage = FakeUsageRepo()

    @asynccontextmanager
    async def uow_factory():
        yield FakeUoW(user_profiles, subscriptions, usage)

    return BillingService(uow_factory), subscriptions


# ── get_plan_key ─────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_plan_key_defaults_to_free_for_new_user():
    svc, _ = _make_service()
    assert await svc.get_plan_key("user-1") == "free"


@pytest.mark.asyncio
async def test_get_plan_key_reflects_existing_subscription():
    svc, _ = _make_service({"user-1": {"plan": "plus", "status": "active"}})
    assert await svc.get_plan_key("user-1") == "plus"


@pytest.mark.asyncio
async def test_get_plan_key_falls_back_to_free_for_unknown_plan():
    svc, _ = _make_service({"user-1": {"plan": "not-a-real-plan", "status": "active"}})
    assert await svc.get_plan_key("user-1") == "free"


# ── get_entitlements ─────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_entitlements_includes_paid_flag_for_free_plan():
    svc, _ = _make_service()
    entitlements = await svc.get_entitlements("user-1")
    assert entitlements["plan"] == "free"
    assert entitlements["paid"] is False


@pytest.mark.asyncio
async def test_get_entitlements_includes_paid_flag_for_paid_plan():
    svc, _ = _make_service({"user-1": {"plan": "pro", "status": "active"}})
    entitlements = await svc.get_entitlements("user-1")
    assert entitlements["plan"] == "pro"
    assert entitlements["paid"] is True
