"""Unit tests for McpOAuthService's plan gate using in-memory fakes.

Only the plan-gating behavior is covered here (is_mcp_enabled / set_mcp_enabled)
— the OAuth flow itself (DCR, PKCE, token exchange) is exercised by the
standalone integration script used when that feature was built, not by these
unit tests.
"""

from __future__ import annotations

from contextlib import asynccontextmanager

import pytest

from salli.application.services.billing_service import PlanRequiredError
from salli.application.services.mcp_oauth_service import McpOAuthService

# ── In-memory fakes ────────────────────────────────────────────────────────────


class FakeUserProfileRepo:
    def __init__(self, mcp_enabled_by_user=None):
        self._profiles: dict[str, dict] = {
            uid: {"id": uid, "mcp_enabled": enabled}
            for uid, enabled in (mcp_enabled_by_user or {}).items()
        }

    async def get(self, user_id):
        return self._profiles.get(user_id)

    async def upsert(self, user_id, fields):
        row = self._profiles.setdefault(user_id, {"id": user_id})
        row.update(fields)


class FakeUoW:
    def __init__(self, user_profiles):
        self.user_profiles = user_profiles

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_):
        pass


class FakeBillingService:
    def __init__(self, plan_by_user=None):
        self._plans = plan_by_user or {}

    async def get_plan_key(self, user_id, email=None):
        return self._plans.get(user_id, "free")


def _make_service(plan_by_user=None, mcp_enabled_by_user=None):
    user_profiles = FakeUserProfileRepo(mcp_enabled_by_user)

    @asynccontextmanager
    async def uow_factory():
        yield FakeUoW(user_profiles)

    return McpOAuthService(
        uow_factory,
        signing_secret="test-secret",
        mcp_resource_url="https://api.test/mcp",
        app_base_url="https://app.test",
        auth_code_ttl_seconds=120,
        access_token_ttl_seconds=3600,
        refresh_token_ttl_seconds=2592000,
        billing_service=FakeBillingService(plan_by_user),
    )


# ── is_mcp_enabled ───────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_is_mcp_enabled_false_when_never_enabled():
    svc = _make_service(plan_by_user={"user-1": "plus"})
    assert await svc.is_mcp_enabled("user-1") is False


@pytest.mark.asyncio
async def test_is_mcp_enabled_true_on_paid_plan_with_flag_set():
    svc = _make_service(plan_by_user={"user-1": "plus"}, mcp_enabled_by_user={"user-1": True})
    assert await svc.is_mcp_enabled("user-1") is True


@pytest.mark.asyncio
async def test_is_mcp_enabled_false_on_free_plan_even_with_flag_set():
    """Covers the downgrade case: the DB flag is still True from when the user
    was on a paid plan, but the live plan check must still deny access."""
    svc = _make_service(plan_by_user={"user-1": "free"}, mcp_enabled_by_user={"user-1": True})
    assert await svc.is_mcp_enabled("user-1") is False


# ── set_mcp_enabled ──────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_set_mcp_enabled_raises_plan_required_on_free_plan():
    svc = _make_service(plan_by_user={"user-1": "free"})
    with pytest.raises(PlanRequiredError) as exc_info:
        await svc.set_mcp_enabled("user-1", True)
    assert exc_info.value.feature == "mcp"
    assert exc_info.value.plan_key == "free"
    assert await svc.is_mcp_enabled("user-1") is False


@pytest.mark.asyncio
async def test_set_mcp_enabled_succeeds_on_paid_plan():
    svc = _make_service(plan_by_user={"user-1": "pro"})
    await svc.set_mcp_enabled("user-1", True)
    assert await svc.is_mcp_enabled("user-1") is True


@pytest.mark.asyncio
async def test_set_mcp_enabled_false_always_allowed_regardless_of_plan():
    svc = _make_service(plan_by_user={"user-1": "free"}, mcp_enabled_by_user={"user-1": True})
    await svc.set_mcp_enabled("user-1", False)
    assert await svc.is_mcp_enabled("user-1") is False
