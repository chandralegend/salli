"""
Shared billing test fixtures.

`RESTRICTED_PLAN` is a synthetic most-restricted plan, used by every test that
needs to prove gating actually happens — the pure `content_gating` functions and
the API routers that call them.

Why not `PLANS["free"]`? Because Free's entitlements are a commercial dial that
moves with go-to-market (it is currently wide open on purpose — see the comment
above `PLANS["free"]` in `src/salli/domain/billing/plans.py`). Binding gating
assertions to Free means loosening Free silently deletes the coverage, which is
precisely the moment you want it intact. The gating machinery must stay correct
whatever Free happens to be this quarter.

Tests that deliberately assert Salli's *commercial* intent — as opposed to the
gating mechanism — should still use `PLANS["free"]` directly.
"""

from __future__ import annotations

from salli.domain.billing.plans import Plan

RESTRICTED_PLAN = Plan(
    key="restricted",
    name="Restricted",
    description="Synthetic most-restricted plan — test fixture only.",
    monthly_price_usd=0.0,
    limits={},
    fi_scenario_limit=1,
    advisor_recommendation_limit=2,
    fire_rationale_visible=False,
)
