"""
Financial Independence domain models — pure, frozen dataclasses, Decimal money.

Mirrors the tax domain: a versioned `FiPack` (the methodology + assumptions), an
aggregated input `FinancialSnapshot`, and a fully-recorded `FiScore` output. No I/O.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal


@dataclass(frozen=True)
class FiPack:
    """Versioned FIRE methodology + assumptions (reviewable, like a tax pack)."""

    version: str
    # 4% rule → FI number = annual_expenses / safe_withdrawal_rate (= ×25 at 0.04)
    safe_withdrawal_rate: Decimal
    emergency_fund_target_months: int
    # Annual real (post-inflation) return assumed for the FI-date projection
    expected_real_return: Decimal
    # Savings rate that earns a full component score (e.g. 0.50 = 50%)
    savings_rate_for_full_score: Decimal
    # Component weights — must sum to 1. Keys: savings_rate, emergency_fund,
    # fi_progress, debt, goals. (When the user has no goals, the goals weight is
    # dropped and the rest are renormalised by the engine.)
    weights: dict[str, Decimal]


@dataclass(frozen=True)
class FinancialSnapshot:
    """Aggregated inputs derived from the ledger (built by FiService, never the LLM)."""

    monthly_income: Decimal
    monthly_expenses: Decimal
    liquid_savings: Decimal       # cash + bank + savings (emergency-fund eligible)
    investments: Decimal          # FD / stocks / funds / bonds, etc.
    total_assets: Decimal
    total_liabilities: Decimal    # positive magnitude
    goal_progress: Decimal | None  # 0..1 weighted across active goals; None if none
    currency: str = "LKR"


@dataclass(frozen=True)
class FiComponent:
    key: str
    label: str
    score: Decimal   # 0..100
    weight: Decimal  # effective weight used (after renormalisation)
    detail: str


@dataclass(frozen=True)
class FiScore:
    pack_version: str
    overall_score: Decimal   # 0..100
    grade: str

    # Figures (all recorded for transparency, like TaxComputation.band_workings)
    monthly_income: Decimal
    monthly_expenses: Decimal
    monthly_surplus: Decimal
    savings_rate: Decimal            # 0..1
    annual_expenses: Decimal
    fi_number: Decimal               # annual_expenses / SWR
    net_worth: Decimal
    progress_to_fi: Decimal          # 0..1 (clamped)
    emergency_fund_months: Decimal
    debt_to_asset: Decimal           # 0..1
    projected_fi_years: Decimal | None  # None = not reachable within horizon
    currency: str

    components: list[FiComponent] = field(default_factory=list)
