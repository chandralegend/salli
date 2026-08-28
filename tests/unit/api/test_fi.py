import json
from unittest.mock import MagicMock

import pytest

from salli.domain.billing.plans import PLANS
from tests.billing_fixtures import RESTRICTED_PLAN
from tests.unit.api.conftest import AUTH


def _projections() -> dict:
    return {
        "points": [{"year": 1, "conservative": "100", "base": "110", "growth": "120"}],
        "fi_number": "5000000",
        "fire_year_conservative": 14,
        "fire_year_base": 12,
        "fire_year_growth": 10,
        "current_portfolio": "1000000",
    }


def _strategy() -> dict:
    return {
        "fire_style": "standard",
        "buckets": [
            {"key": "equity", "name": "Equity", "target_pct": 60, "description": "d", "color": "c"}
        ],
        "ai_rationale": "Save aggressively. Invest the surplus.",
        "theories_applied": ["4% rule", "Coast FIRE"],
        "is_initial": True,
        "version": 1,
    }


async def _fake_stream():
    yield 'data: {"type": "status", "message": "Working..."}\n\n'
    yield f"data: {json.dumps({'type': 'done', 'strategy': _strategy()})}\n\n"


@pytest.mark.asyncio
async def test_projections_restricted_redacts_scenarios(client, mock_services):
    mock_services.fi.get_projections.return_value = _projections()
    mock_services.billing.get_current_plan.return_value = RESTRICTED_PLAN

    r = await client.get("/fi/projections", headers=AUTH)
    assert r.status_code == 200
    data = r.json()
    assert data["points"][0]["conservative"] is None
    assert data["points"][0]["growth"] is None
    assert data["points"][0]["base"] == "110"
    assert data["scenario_access"]["locked"] == ["conservative", "growth"]


@pytest.mark.asyncio
async def test_projections_plus_full(client, mock_services):
    mock_services.fi.get_projections.return_value = _projections()
    mock_services.billing.get_current_plan.return_value = PLANS["pro"]

    r = await client.get("/fi/projections", headers=AUTH)
    assert r.status_code == 200
    data = r.json()
    assert data["points"][0]["conservative"] == "100"
    assert data["scenario_access"]["locked"] == []


@pytest.mark.asyncio
async def test_strategy_restricted_truncates_rationale(client, mock_services):
    mock_services.fi.get_strategy.return_value = _strategy()
    mock_services.billing.get_current_plan.return_value = RESTRICTED_PLAN

    r = await client.get("/fi/strategy", headers=AUTH)
    assert r.status_code == 200
    data = r.json()
    assert data["ai_rationale"] is None
    assert data["rationale_locked"] is True
    assert data["theories_applied"] is None
    assert data["theories_applied_count"] == 2
    assert data["buckets"] == _strategy()["buckets"]


@pytest.mark.asyncio
async def test_strategy_404_skips_plan_lookup(client, mock_services):
    mock_services.fi.get_strategy.return_value = None

    r = await client.get("/fi/strategy", headers=AUTH)
    assert r.status_code == 404
    mock_services.billing.get_current_plan.assert_not_awaited()


@pytest.mark.asyncio
async def test_strategy_history_truncates_each_entry(client, mock_services):
    mock_services.fi.get_strategy_history.return_value = [_strategy(), _strategy()]
    mock_services.billing.get_current_plan.return_value = RESTRICTED_PLAN

    r = await client.get("/fi/strategy/history", headers=AUTH)
    assert r.status_code == 200
    history = r.json()["history"]
    assert len(history) == 2
    assert all(h["ai_rationale"] is None for h in history)


@pytest.mark.asyncio
async def test_strategy_generate_truncates_done_event_only(client, mock_services):
    mock_services.fi.generate_strategy = MagicMock(side_effect=lambda *a, **kw: _fake_stream())
    mock_services.billing.get_current_plan.return_value = RESTRICTED_PLAN

    r = await client.post("/fi/strategy/generate", headers=AUTH)
    assert r.status_code == 200
    events = [
        json.loads(chunk.removeprefix("data: ")) for chunk in r.text.split("\n\n") if chunk.strip()
    ]
    assert events[0] == {"type": "status", "message": "Working..."}
    assert events[1]["type"] == "done"
    assert events[1]["strategy"]["ai_rationale"] is None
    assert events[1]["strategy"]["rationale_locked"] is True
    mock_services.billing.spend_credits.assert_awaited_once()


@pytest.mark.asyncio
async def test_strategy_generate_plus_full_rationale(client, mock_services):
    mock_services.fi.generate_strategy = MagicMock(side_effect=lambda *a, **kw: _fake_stream())
    mock_services.billing.get_current_plan.return_value = PLANS["pro"]

    r = await client.post("/fi/strategy/generate", headers=AUTH)
    assert r.status_code == 200
    events = [
        json.loads(chunk.removeprefix("data: ")) for chunk in r.text.split("\n\n") if chunk.strip()
    ]
    assert events[1]["strategy"]["ai_rationale"] == _strategy()["ai_rationale"]
    assert events[1]["strategy"]["rationale_locked"] is False


# ── POST /fi/simulate-purchase ────────────────────────────────────────────────


def _impact() -> dict:
    return {
        "amount": "450000.00",
        "currency": "LKR",
        "baseline_months_to_fi": 404,
        "payable_from_liquid": True,
        "emergency_months_before": "8.00",
        "emergency_months_after_cash": "5.75",
        "emergency_fund_target_months": 6,
        "options": [{"key": "cash", "months_delay": 8}],
        "cheapest_option_key": "cash",
        "is_stale": False,
        "data_as_of": "2026-07-23",
    }


@pytest.mark.asyncio
async def test_simulate_purchase_parses_money_as_decimal(client, mock_services):
    """Money crosses the wire as a string and must reach the service as Decimal."""
    from decimal import Decimal

    mock_services.fi.simulate_purchase.return_value = _impact()

    r = await client.post(
        "/fi/simulate-purchase",
        json={"amount": "450000", "term_months": 12, "annual_interest_rate": "0.18"},
        headers=AUTH,
    )

    assert r.status_code == 200
    assert r.json()["cheapest_option_key"] == "cash"

    args, kwargs = mock_services.fi.simulate_purchase.call_args
    amount = args[1]
    assert isinstance(amount, Decimal), f"money reached the service as {type(amount).__name__}"
    assert amount == Decimal("450000")
    assert kwargs["annual_interest_rate"] == Decimal("0.18")
    assert kwargs["term_months"] == 12


@pytest.mark.asyncio
async def test_simulate_purchase_rejects_a_percentage_as_a_rate(client, mock_services):
    """18 instead of 0.18 would overstate the finance cost ~100x — reject at the edge."""
    r = await client.post(
        "/fi/simulate-purchase",
        json={"amount": "450000", "term_months": 12, "annual_interest_rate": "18"},
        headers=AUTH,
    )
    assert r.status_code == 422
    mock_services.fi.simulate_purchase.assert_not_called()


@pytest.mark.asyncio
async def test_simulate_purchase_rejects_negative_and_bad_terms(client, mock_services):
    for body in (
        {"amount": "-1"},
        {"amount": "450000", "term_months": 0},
        {"amount": "450000", "term_months": 601},
        {"amount": "not a number"},
    ):
        r = await client.post("/fi/simulate-purchase", json=body, headers=AUTH)
        assert r.status_code == 422, body
    mock_services.fi.simulate_purchase.assert_not_called()


@pytest.mark.asyncio
async def test_simulate_purchase_needs_auth(client, mock_services):
    r = await client.post("/fi/simulate-purchase", json={"amount": "450000"})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_simulate_purchase_is_not_metered(client, mock_services):
    """
    Pure engine math with no LLM call. Metering it would teach users not to ask
    the one question the product exists to answer.
    """
    mock_services.fi.simulate_purchase.return_value = _impact()

    r = await client.post("/fi/simulate-purchase", json={"amount": "450000"}, headers=AUTH)

    assert r.status_code == 200
    mock_services.billing.spend_credits.assert_not_called()
