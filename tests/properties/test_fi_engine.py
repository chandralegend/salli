"""
Property-based tests for the FI ("Freedom") engine using Hypothesis.

The headline property here is SCALE INVARIANCE, and it is the one this repo was
missing. Every other engine's property tests assert self-consistency (a trial
balance nets zero, total_gain == value − cost), which holds at *any* scale and so
cannot catch a units error. Multiplying every money input by k must leave the
dimensionless outputs — savings rate, progress, scores — completely unchanged.
A ×100 slip anywhere in the ratio path breaks that immediately.
"""

from decimal import Decimal
from typing import Any

from hypothesis import given, settings
from hypothesis import strategies as st

from salli.domain.fi import engine
from salli.domain.fi.models import FinancialSnapshot, FiPack, FireStrategy

PACK = FiPack(
    version="prop-1",
    safe_withdrawal_rate=Decimal("0.04"),
    emergency_fund_target_months=6,
    expected_real_return=Decimal("0.05"),
    expected_inflation=Decimal("0.05"),
    savings_rate_for_full_score=Decimal("0.50"),
    weights={
        "savings_rate": Decimal("0.25"),
        "emergency_fund": Decimal("0.15"),
        "fi_progress": Decimal("0.35"),
        "debt": Decimal("0.10"),
        "goals": Decimal("0.15"),
    },
)

money = st.decimals(
    min_value=Decimal("0"),
    max_value=Decimal("10000000"),
    places=2,
    allow_nan=False,
    allow_infinity=False,
)
positive_money = st.decimals(
    min_value=Decimal("1000"),
    max_value=Decimal("10000000"),
    places=2,
    allow_nan=False,
    allow_infinity=False,
)
scale_factor = st.sampled_from([Decimal("2"), Decimal("10"), Decimal("100"), Decimal("0.5")])


@st.composite
def snapshot(draw: Any) -> FinancialSnapshot:
    income = draw(positive_money)
    expenses = draw(st.decimals(min_value=Decimal("1"), max_value=income, places=2))
    liquid = draw(money)
    investments = draw(money)
    liabilities = draw(money)
    return FinancialSnapshot(
        monthly_income=income,
        monthly_expenses=expenses,
        liquid_savings=liquid,
        investments=investments,
        total_assets=liquid + investments,
        total_liabilities=liabilities,
        goal_progress=None,
    )


def _scaled(s: FinancialSnapshot, k: Decimal) -> FinancialSnapshot:
    return FinancialSnapshot(
        monthly_income=s.monthly_income * k,
        monthly_expenses=s.monthly_expenses * k,
        liquid_savings=s.liquid_savings * k,
        investments=s.investments * k,
        total_assets=s.total_assets * k,
        total_liabilities=s.total_liabilities * k,
        goal_progress=s.goal_progress,
    )


# ── The unit-bug catcher ──────────────────────────────────────────────────────


@given(snapshot(), scale_factor)
@settings(max_examples=100, deadline=None)
def test_dimensionless_outputs_are_scale_invariant(s: FinancialSnapshot, k: Decimal) -> None:
    """Scaling all money by k must not move any ratio or score."""
    a = engine.compute(s, PACK)
    b = engine.compute(_scaled(s, k), PACK)

    assert a.savings_rate == b.savings_rate
    assert a.debt_to_asset == b.debt_to_asset
    assert a.emergency_fund_months == b.emergency_fund_months
    assert a.progress_to_fi == b.progress_to_fi
    assert a.overall_score == b.overall_score
    assert a.grade == b.grade


@given(snapshot(), scale_factor)
@settings(max_examples=50, deadline=None)
def test_money_outputs_scale_linearly(s: FinancialSnapshot, k: Decimal) -> None:
    """The converse: money outputs must scale exactly with the inputs."""
    a = engine.compute(s, PACK)
    b = engine.compute(_scaled(s, k), PACK)

    assert b.fi_number == a.fi_number * k
    assert b.net_worth == a.net_worth * k
    assert b.fi_asset_base == a.fi_asset_base * k
    assert b.monthly_surplus == a.monthly_surplus * k


# ── Range invariants: fractions stay fractions, scores stay 0..100 ────────────


@given(snapshot())
@settings(max_examples=100, deadline=None)
def test_ratios_stay_in_fraction_range(s: FinancialSnapshot) -> None:
    score = engine.compute(s, PACK)
    # savings_rate: expenses <= income by construction, so 0..1.
    assert Decimal(0) <= score.savings_rate <= Decimal(1)
    assert Decimal(0) <= score.debt_to_asset
    assert score.progress_to_fi >= Decimal(0)


@given(snapshot())
@settings(max_examples=100, deadline=None)
def test_scores_stay_in_percent_range(s: FinancialSnapshot) -> None:
    score = engine.compute(s, PACK)
    assert Decimal(0) <= score.overall_score <= Decimal(100)
    for c in score.components:
        assert Decimal(0) <= c.score <= Decimal(100)


@given(snapshot())
@settings(max_examples=100, deadline=None)
def test_effective_weights_always_sum_to_one(s: FinancialSnapshot) -> None:
    score = engine.compute(s, PACK)
    total = sum((c.weight for c in score.components), Decimal(0))
    # Quantised to 2dp per component, so allow a rounding cent.
    assert abs(total - Decimal(1)) <= Decimal("0.01")


# ── Monotonicity: the engine must respond in the right direction ──────────────


@given(positive_money, positive_money)
@settings(max_examples=50, deadline=None)
def test_fi_number_rises_with_expenses(a: Decimal, b: Decimal) -> None:
    lo, hi = min(a, b), max(a, b)
    income = hi * 2
    s_lo = FinancialSnapshot(
        monthly_income=income,
        monthly_expenses=lo,
        liquid_savings=Decimal(0),
        investments=Decimal(0),
        total_assets=Decimal(0),
        total_liabilities=Decimal(0),
        goal_progress=None,
    )
    s_hi = FinancialSnapshot(
        monthly_income=income,
        monthly_expenses=hi,
        liquid_savings=Decimal(0),
        investments=Decimal(0),
        total_assets=Decimal(0),
        total_liabilities=Decimal(0),
        goal_progress=None,
    )
    assert engine.compute(s_lo, PACK).fi_number <= engine.compute(s_hi, PACK).fi_number


@given(
    st.decimals(min_value=Decimal("0.01"), max_value=Decimal("0.10"), places=4),
    st.decimals(min_value=Decimal("0.01"), max_value=Decimal("0.10"), places=4),
)
@settings(max_examples=50, deadline=None)
def test_lower_swr_means_a_larger_target(a: Decimal, b: Decimal) -> None:
    """A more conservative withdrawal rate must require a bigger pot."""
    lo, hi = min(a, b), max(a, b)
    s = FinancialSnapshot(
        monthly_income=Decimal("100000"),
        monthly_expenses=Decimal("50000"),
        liquid_savings=Decimal(0),
        investments=Decimal(0),
        total_assets=Decimal(0),
        total_liabilities=Decimal(0),
        goal_progress=None,
    )
    assert engine.compute(s, PACK, swr=lo).fi_number >= engine.compute(s, PACK, swr=hi).fi_number


@given(
    st.decimals(min_value=Decimal("100"), max_value=Decimal("100000"), places=2),
    st.decimals(min_value=Decimal("100"), max_value=Decimal("100000"), places=2),
)
@settings(max_examples=50, deadline=None)
def test_more_contribution_never_takes_longer(a: Decimal, b: Decimal) -> None:
    lo, hi = min(a, b), max(a, b)
    target = Decimal("10000000")
    y_lo = engine.years_to_target(Decimal(0), lo, Decimal("0.05"), target)
    y_hi = engine.years_to_target(Decimal(0), hi, Decimal("0.05"), target)
    if y_lo is not None and y_hi is not None:
        assert y_hi <= y_lo


# ── Real returns ──────────────────────────────────────────────────────────────


@given(
    st.decimals(min_value=Decimal("0"), max_value=Decimal("0.40"), places=4),
    st.decimals(min_value=Decimal("0"), max_value=Decimal("0.30"), places=4),
)
@settings(max_examples=100, deadline=None)
def test_real_return_never_exceeds_nominal_under_positive_inflation(
    nominal: Decimal, inflation: Decimal
) -> None:
    r = engine.real_return(nominal, inflation)
    if inflation > 0:
        assert r < nominal
    else:
        assert r == nominal


# ── The projected series and the solver must never disagree ────────────────────


@given(snapshot())
@settings(max_examples=50, deadline=None)
def test_projection_crossing_matches_the_solver(s: FinancialSnapshot) -> None:
    strat = FireStrategy(
        version=1,
        fire_style="standard",
        swr=Decimal("0.04"),
        return_conservative=Decimal("0.06"),
        return_base=Decimal("0.10"),
        return_growth=Decimal("0.14"),
        target_monthly_expenses=None,
        target_age=None,
        buckets=[],
        ai_rationale="",
        theories_applied=[],
        created_at="",
        is_initial=True,
    )
    rates = engine.scenario_real_returns(strat, PACK)
    score = engine.compute(s, PACK, swr=strat.swr, annual_real_return=rates["base"])
    if score.fi_number <= 0 or score.projected_fi_years is None:
        return
    horizon = int(score.projected_fi_years) + 1
    points = engine.project_portfolio(s, strat, PACK, horizon_years=horizon)
    crossing = next((p.year for p in points if p.base >= score.fi_number), None)
    assert crossing == int(score.projected_fi_years)
