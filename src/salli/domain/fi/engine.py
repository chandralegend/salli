"""
Deterministic Financial Independence engine.

Pure function: compute(snapshot, pack) -> FiScore. No I/O, no LLM, no Date.now —
the FI-date *years* are computed here; the calendar date is derived by the caller.

Methodology (FIRE composite):
  • FI number      = annual expenses / safe withdrawal rate (4% rule → ×25)
  • Progress to FI = net worth / FI number
  • Savings rate   = (income − expenses) / income
  • Emergency fund = liquid savings / monthly expenses  (target 3–6 months)
  • Debt load      = liabilities / assets  (lower is better)
  • Goal progress  = weighted progress across the user's active goals
The 0–100 score is a weighted blend of the five component scores.
"""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal

from salli.domain.fi.models import FiComponent, FinancialSnapshot, FiPack, FiScore

_HUNDRED = Decimal(100)
_MAX_PROJECTION_YEARS = 100


def _clamp(value: Decimal, lo: Decimal = Decimal(0), hi: Decimal = _HUNDRED) -> Decimal:
    return max(lo, min(hi, value))


def _q2(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _grade(score: Decimal) -> str:
    if score >= 80:
        return "FI-ready"
    if score >= 60:
        return "Strong"
    if score >= 40:
        return "On track"
    if score >= 20:
        return "Building"
    return "Just starting"


def _years_to_fi(
    net_worth: Decimal, fi_number: Decimal, annual_contribution: Decimal, real_return: Decimal
) -> Decimal | None:
    """Years for net worth + yearly contributions (compounded at real_return) to reach FI."""
    if fi_number <= 0 or net_worth >= fi_number:
        return Decimal(0)
    if annual_contribution <= 0 and real_return <= 0:
        return None
    nw = net_worth
    for year in range(1, _MAX_PROJECTION_YEARS + 1):
        nw = nw * (Decimal(1) + real_return) + annual_contribution
        if nw >= fi_number:
            return Decimal(year)
    return None


def compute(snapshot: FinancialSnapshot, pack: FiPack) -> FiScore:
    income = snapshot.monthly_income
    expenses = snapshot.monthly_expenses
    surplus = income - expenses
    savings_rate = (surplus / income) if income > 0 else Decimal(0)

    annual_expenses = expenses * 12
    fi_number = (annual_expenses / pack.safe_withdrawal_rate) if annual_expenses > 0 else Decimal(0)
    net_worth = snapshot.total_assets - snapshot.total_liabilities
    progress = (net_worth / fi_number) if fi_number > 0 else Decimal(0)
    progress_clamped = max(Decimal(0), min(Decimal(1), progress))
    ef_months = (snapshot.liquid_savings / expenses) if expenses > 0 else Decimal(0)
    debt_ratio = (
        snapshot.total_liabilities / snapshot.total_assets if snapshot.total_assets > 0 else Decimal(0)
    )

    # ── Component scores (0..100) ──────────────────────────────────────────────
    sr_score = _clamp(savings_rate / pack.savings_rate_for_full_score * _HUNDRED)
    ef_target = Decimal(pack.emergency_fund_target_months)
    ef_score = _clamp(ef_months / ef_target * _HUNDRED) if ef_target > 0 else Decimal(0)
    fi_score_c = _clamp(progress_clamped * _HUNDRED)
    debt_score = _clamp((Decimal(1) - debt_ratio) * _HUNDRED)

    comp_defs = [
        ("savings_rate", "Savings rate", sr_score,
         f"Saving {_q2(savings_rate * 100)}% of income"),
        ("emergency_fund", "Emergency fund", ef_score,
         f"{_q2(ef_months)} of {pack.emergency_fund_target_months} months covered"),
        ("fi_progress", "Progress to FI", fi_score_c,
         f"{_q2(progress * 100)}% of your FI number"),
        ("debt", "Debt load", debt_score,
         f"Liabilities are {_q2(debt_ratio * 100)}% of assets"),
    ]
    if snapshot.goal_progress is not None:
        goal_score = _clamp(snapshot.goal_progress * _HUNDRED)
        comp_defs.append(
            ("goals", "Goal progress", goal_score,
             f"{_q2(snapshot.goal_progress * 100)}% toward your goals")
        )

    # Effective weights: drop missing components (e.g. goals) and renormalise.
    raw = {k: pack.weights.get(k, Decimal(0)) for k, *_ in comp_defs}
    total_w = sum(raw.values(), Decimal(0)) or Decimal(1)
    components: list[FiComponent] = []
    overall = Decimal(0)
    for key, label, score, detail in comp_defs:
        w = raw[key] / total_w
        overall += score * w
        components.append(FiComponent(key=key, label=label, score=_q2(score), weight=_q2(w), detail=detail))

    overall = _q2(_clamp(overall))
    projected_years = _years_to_fi(net_worth, fi_number, surplus * 12, pack.expected_real_return)

    return FiScore(
        pack_version=pack.version,
        overall_score=overall,
        grade=_grade(overall),
        monthly_income=income,
        monthly_expenses=expenses,
        monthly_surplus=surplus,
        savings_rate=savings_rate,
        annual_expenses=annual_expenses,
        fi_number=fi_number,
        net_worth=net_worth,
        progress_to_fi=progress_clamped,
        emergency_fund_months=ef_months,
        debt_to_asset=debt_ratio,
        projected_fi_years=projected_years,
        currency=snapshot.currency,
        components=components,
    )
