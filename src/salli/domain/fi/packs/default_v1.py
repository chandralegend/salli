"""
Default FIRE pack v1 — methodology + assumptions for the FI score.

Must be reviewed by a financial planner before being presented as advice in
production (same gate as tax packs).
"""

from __future__ import annotations

from decimal import Decimal

from salli.domain.fi.models import FiPack

DEFAULT_V1 = FiPack(
    version="1.0.0",
    safe_withdrawal_rate=Decimal("0.04"),     # 4% rule → FI number = 25× annual expenses
    emergency_fund_target_months=6,
    expected_real_return=Decimal("0.05"),     # 5% real annual return for projections
    savings_rate_for_full_score=Decimal("0.50"),  # saving 50%+ of income scores full marks
    weights={
        "savings_rate": Decimal("0.25"),
        "emergency_fund": Decimal("0.15"),
        "fi_progress": Decimal("0.35"),
        "debt": Decimal("0.10"),
        "goals": Decimal("0.15"),
    },
)
