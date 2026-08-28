"""
Spend order, top-up grants, and webhook idempotency.

These are the paths where a bug costs someone real money in one direction or
the other, so they are tested against the behaviour rather than the
implementation.
"""

from __future__ import annotations

import pytest

from salli.application.services.billing_service import QuotaExceeded, _period
from salli.domain.ai_models import DEFAULT_MODEL
from salli.domain.billing.credits import ACTION_AGENT_MESSAGE, cost
from salli.domain.billing.plans import METRIC_AI_CREDITS, get_plan
from tests.unit.application.test_billing_service import USER

pytestmark = pytest.mark.asyncio

FREE_ALLOWANCE = get_plan("free").limits[METRIC_AI_CREDITS]
MESSAGE = cost(ACTION_AGENT_MESSAGE, DEFAULT_MODEL)


async def test_allowance_is_spent_before_purchased_credits(service, repos):
    """Allowance expires at month end and purchases do not, so spending the
    perishable one first is strictly better for the user. Getting this backwards
    would quietly burn credits someone paid for while free ones expired unused."""
    _, usage, _ = repos
    await service.grant_credits(USER, 5_000, "txn_1")

    await service.spend_credits(USER, ACTION_AGENT_MESSAGE)

    bal = await service.get_balance(USER)
    assert await usage.get_count(USER, _period(), METRIC_AI_CREDITS) == MESSAGE
    assert bal["purchased_remaining"] == 5_000  # untouched


async def test_purchases_cover_the_shortfall_once_the_allowance_is_gone(service, repos):
    _, usage, _ = repos
    usage.seed(USER, _period(), METRIC_AI_CREDITS, FREE_ALLOWANCE)
    await service.grant_credits(USER, 5_000, "txn_1")

    await service.spend_credits(USER, ACTION_AGENT_MESSAGE)

    bal = await service.get_balance(USER)
    assert bal["allowance_remaining"] == 0
    assert bal["purchased_remaining"] == 5_000 - MESSAGE


async def test_a_spend_straddling_both_buckets_takes_from_each(service, repos):
    """The interesting case: not enough allowance alone, but enough in total."""
    _, usage, _ = repos
    usage.seed(USER, _period(), METRIC_AI_CREDITS, FREE_ALLOWANCE - 4)
    await service.grant_credits(USER, 1_000, "txn_1")

    await service.spend_credits(USER, ACTION_AGENT_MESSAGE)

    bal = await service.get_balance(USER)
    assert bal["allowance_remaining"] == 0
    assert bal["purchased_remaining"] == 1_000 - (MESSAGE - 4)


async def test_spend_is_refused_and_changes_nothing_when_short(service, repos):
    """A refused spend must not partially drain the balance — otherwise a user
    who cannot afford an action still pays part of its price."""
    _, usage, _ = repos
    usage.seed(USER, _period(), METRIC_AI_CREDITS, FREE_ALLOWANCE)
    await service.grant_credits(USER, MESSAGE - 1, "txn_1")

    with pytest.raises(QuotaExceeded) as exc:
        await service.spend_credits(USER, ACTION_AGENT_MESSAGE)

    assert exc.value.cost == MESSAGE
    assert exc.value.balance == MESSAGE - 1
    bal = await service.get_balance(USER)
    assert bal["purchased_remaining"] == MESSAGE - 1  # nothing taken


async def test_the_error_reports_what_the_action_costs_and_what_is_left(service, repos):
    """ "This needs 30 credits and you have 12" is actionable; "out of credits"
    is not. The 402 body is built from these two fields."""
    _, usage, _ = repos
    usage.seed(USER, _period(), METRIC_AI_CREDITS, FREE_ALLOWANCE)

    with pytest.raises(QuotaExceeded) as exc:
        await service.spend_credits(USER, ACTION_AGENT_MESSAGE)

    assert exc.value.cost > 0
    assert exc.value.balance == 0
    assert exc.value.action == ACTION_AGENT_MESSAGE


async def test_a_replayed_webhook_grants_only_once(service):
    """Paddle retries webhooks. Without the transaction id being unique, a
    redelivery would hand out the same pack a second time."""
    assert await service.grant_credits(USER, 10_000, "txn_abc") is True
    assert await service.grant_credits(USER, 10_000, "txn_abc") is False

    bal = await service.get_balance(USER)
    assert bal["purchased_remaining"] == 10_000


async def test_distinct_transactions_both_grant(service):
    await service.grant_credits(USER, 10_000, "txn_1")
    await service.grant_credits(USER, 25_000, "txn_2")

    bal = await service.get_balance(USER)
    assert bal["purchased_remaining"] == 35_000


async def test_model_choice_changes_what_a_message_costs(service, repos):
    """The point of the whole exercise: every model is available to everyone,
    and the multiplier does the rationing."""
    _, usage, _ = repos
    await service.spend_credits(USER, ACTION_AGENT_MESSAGE, "claude-haiku-4-5-20251001")
    cheap = await usage.get_count(USER, _period(), METRIC_AI_CREDITS)

    await service.spend_credits(USER, ACTION_AGENT_MESSAGE, "claude-opus-5")
    total = await usage.get_count(USER, _period(), METRIC_AI_CREDITS)

    assert total - cheap == cheap * 5


async def test_balance_reports_the_sum_a_user_can_actually_spend(service):
    await service.grant_credits(USER, 10_000, "txn_1")
    bal = await service.get_balance(USER)
    assert bal["total"] == bal["allowance_remaining"] + bal["purchased_remaining"]
    assert bal["total"] == FREE_ALLOWANCE + 10_000
