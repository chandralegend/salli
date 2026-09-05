"""
Plan registry — pure domain, no I/O.

Plans and their limits live in code (versioned with the app), not the database, so
they are reviewable and reproducible. A subscription row only stores which plan key
a user is on; the limits are looked up here. The monthly allowance resets on the
1st (UTC).

Paddle price IDs are environment-specific and therefore NOT stored here — the
billing service maps a Paddle price ID to a plan key using config.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

_log = logging.getLogger(__name__)

# The one metered thing. Everything a user can spend inference on — chat,
# statement parsing, the advisor, FIRE strategies — draws down this single
# balance, priced by domain/billing/credits.py.
#
# This replaced three separate counters (agent_messages, statement_uploads,
# advisor_runs). Three numbers were harder to reason about than one, and,
# worse, they were model-blind: a message cost the same whether it ran on
# Haiku or Opus, so users of expensive models were subsidised by everyone
# else. Old counter rows are simply never read again; they are left in place
# rather than migrated, since they are a historical record of a period that
# was billed under different rules.
METRIC_AI_CREDITS = "ai_credits"

METRICS = (METRIC_AI_CREDITS,)


@dataclass(frozen=True)
class Plan:
    key: str
    name: str
    description: str
    monthly_price_usd: float  # display only; Paddle is source of truth for charging
    limits: dict[str, int]  # metric -> monthly allowance
    features: list[str] = field(default_factory=list)
    paid: bool = False
    # Content-depth entitlements — distinct from `limits` above. `limits` are
    # usage counters that reset monthly; these govern how much of a single
    # response's payload is visible, enforced by domain/billing/content_gating.py
    # from the interface layer. Defaults match the most restricted case, so a
    # future plan added without specifying these degrades closed, not open.
    fi_scenario_limit: int = 1
    advisor_recommendation_limit: int | None = 2
    fire_rationale_visible: bool = False
    yearly_price_usd: float = 0.0  # display only; 0 = no annual price offered


PLANS: dict[str, Plan] = {
    # Two tiers, and they differ in exactly one thing: how many credits you get
    # each month. Every feature and every model is available on both.
    #
    # Free is deliberately tuned for LEARNING, not gross margin. Salli's core
    # loop is a conversation ("can I afford this?") whose persuasive power is
    # the *explanation*. Gating that depth makes the product land flat for
    # exactly the people we most need feedback from, while gating *volume*
    # costs us nothing pedagogically.
    #
    # Letting Free users run Opus looks expensive and is not: at x5 they spend
    # their allowance five times faster, so the ceiling is the same. Making the
    # price of the choice visible is what lets us offer the choice at all.
    #
    # The content-depth entitlements below therefore match across both plans,
    # and content_gating.py is a no-op in practice. Kept rather than deleted
    # because this is a reversible commercial decision (plans live in code, no
    # migration), and re-adding the machinery later would be the expensive part.
    "free": Plan(
        key="free",
        name="Free",
        description="The full Salli answer, with a monthly credit allowance.",
        monthly_price_usd=0.0,
        limits={METRIC_AI_CREDITS: 30_000},
        features=[
            "Ledger & double-entry bookkeeping",
            "Sri Lanka tax engine (unlimited)",
            "30,000 AI credits / month",
            "Runs on Claude Haiku 4.5, around 150 conversations a month",
            "Full FIRE scenarios, AI rationale & all advisor recommendations",
            "Connect Claude/ChatGPT via MCP",
            "Top up any time, or bring your own API key",
        ],
        fi_scenario_limit=3,
        advisor_recommendation_limit=None,
        fire_rationale_visible=True,
    ),
    "pro": Plan(
        key="pro",
        name="Pro",
        description="For people running their whole financial life through Salli.",
        monthly_price_usd=29.0,
        yearly_price_usd=200.0,
        limits={METRIC_AI_CREDITS: 500_000},
        paid=True,
        features=[
            "Everything in Free",
            "500,000 AI credits / month",
            "Around 2,500 conversations a month",
            "Daily wealth advisor",
            "Priority support",
        ],
        fi_scenario_limit=3,
        advisor_recommendation_limit=None,
        fire_rationale_visible=True,
    ),
}

DEFAULT_PLAN = "free"

# Ceiling applied instead of the plan's allowance when a user supplies their
# own LLM API key. They pay for their own inference, so metering them serves no
# commercial purpose — but the requests still run on our server, so this is a
# runaway-loop backstop, not a product limit. An order of magnitude above Pro,
# so a Pro subscriber who adds a key gains something real.
BYOK_LIMITS: dict[str, int] = {
    METRIC_AI_CREDITS: 1_000_000,
}


def get_plan(key: str | None) -> Plan:
    """
    Return the plan for a key, falling back to Free for unknown/None.

    The fallback is deliberately noisy. A stored plan key that no longer exists
    means a paying subscriber is about to be served Free limits, and the silent
    version of that bug is invisible until someone complains that they paid for
    nothing. `plus` (the retired Starter tier) is the live example: any row
    still carrying it lands here.
    """
    if key and key not in PLANS:
        _log.error(
            "Unknown plan key %r on a subscription row — falling back to %s. "
            "A paying subscriber may be receiving free limits.",
            key,
            DEFAULT_PLAN,
        )
    return PLANS.get(key or DEFAULT_PLAN, PLANS[DEFAULT_PLAN])


def limit_for(plan_key: str | None, metric: str) -> int:
    return get_plan(plan_key).limits.get(metric, 0)
