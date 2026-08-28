"""
Shared BillingService fixtures.

They live here rather than in `test_billing_service.py` because more than one
module needs them now — credit spend, top-up grants, and webhook idempotency
are tested separately from the subscription/entitlement surface. Importing
fixtures across test modules works, but every test that then names one as a
parameter trips ruff's F811 redefinition check, so a conftest is both cleaner
and quieter.

The fake repositories themselves stay in `test_billing_service.py`, next to
the tests that document what they are standing in for.
"""

from __future__ import annotations

from contextlib import asynccontextmanager

import pytest

from salli.application.services.billing_service import BillingService
from tests.unit.application.test_billing_service import (
    FakeBillingPort,
    FakeCreditRepo,
    FakeSubscriptionRepo,
    FakeUnitOfWork,
    FakeUsageRepo,
    FakeUserProfileRepo,
)


@pytest.fixture
def repos():
    return FakeSubscriptionRepo(), FakeUsageRepo(), FakeUserProfileRepo()


@pytest.fixture
def uow_factory(repos):
    subs, usage, profiles = repos
    # Built once, outside the factory. A fresh FakeCreditRepo per `async with`
    # would drop purchased credits between calls, so a top-up would vanish the
    # moment the next unit of work opened — the real table obviously persists.
    credits = FakeCreditRepo(usage)

    @asynccontextmanager
    async def _factory():
        yield FakeUnitOfWork(subs, usage, profiles, credits)

    return _factory


@pytest.fixture
def billing_port():
    return FakeBillingPort()


@pytest.fixture
def service(uow_factory, billing_port):
    return BillingService(uow_factory, billing_port=billing_port)
