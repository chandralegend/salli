"""
Plan registry — pure domain, no I/O.

Plans and their limits live in code (versioned with the app), not the database, so
they are reviewable and reproducible. A subscription row only stores which plan key
a user is on; the limits are looked up here. Metered quotas reset monthly (UTC).

Paddle price IDs are environment-specific and therefore NOT stored here — the
billing service maps a Paddle price ID to a plan key using config.
"""

from __future__ import annotations

from dataclasses import dataclass, field

# Metric keys (must match UsageCounterORM.metric values)
METRIC_AGENT_MESSAGES = "agent_messages"
METRIC_STATEMENT_UPLOADS = "statement_uploads"
METRIC_ADVISOR_RUNS = "advisor_runs"

METRICS = (METRIC_AGENT_MESSAGES, METRIC_STATEMENT_UPLOADS, METRIC_ADVISOR_RUNS)


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
    # from the interface layer. Defaults match Free, so a future plan added
    # without specifying these degrades to "most restricted," not "unlocked."
    fi_scenario_limit: int = 1
    advisor_recommendation_limit: int | None = 2
    fire_rationale_visible: bool = False
    yearly_price_usd: float = 0.0  # display only; 0 = no annual price offered


PLANS: dict[str, Plan] = {
    # Free is deliberately tuned for LEARNING, not gross margin.
    #
    # Salli's core loop is a conversation ("can I afford this?") whose persuasive
    # power is the *explanation* — the reasoning, and what the purchase costs the
    # user's Freedom date. Gating that depth makes the product land flat for
    # exactly the people we most need feedback from, while gating *volume* costs
    # us nothing pedagogically. So Free gets the full depth of an answer and a
    # modest allowance of them; paid plans buy throughput, MCP clients, web
    # search and document management.
    #
    # Concretely: the content-depth entitlements below match the paid plans on
    # purpose. Differentiation is the metered `limits`. This is a reversible
    # commercial decision (plans live in code, no migration) — revisit once
    # there is evidence about what people will actually pay for, not before.
    "free": Plan(
        key="free",
        name="Free",
        description="The full Salli answer, with a monthly allowance.",
        monthly_price_usd=0.0,
        limits={METRIC_AGENT_MESSAGES: 150, METRIC_STATEMENT_UPLOADS: 10, METRIC_ADVISOR_RUNS: 10},
        features=[
            "Ledger & double-entry bookkeeping",
            "Sri Lanka tax engine (unlimited)",
            "150 AI agent messages / month",
            "10 statement uploads / month",
            "10 wealth-advisor runs / month (manual)",
            "Full FIRE scenarios, AI rationale & all advisor recommendations",
        ],
        fi_scenario_limit=3,
        advisor_recommendation_limit=None,
        fire_rationale_visible=True,
    ),
    "plus": Plan(
        key="plus",
        name="Starter",
        description="For individuals actively managing their finances and tax.",
        monthly_price_usd=9.0,
        yearly_price_usd=100.0,
        limits={METRIC_AGENT_MESSAGES: 500, METRIC_STATEMENT_UPLOADS: 50, METRIC_ADVISOR_RUNS: 45},
        paid=True,
        features=[
            "Everything in Free",
            "500 AI agent messages / month",
            "50 statement uploads / month",
            "Web search & document management",
            "Daily wealth advisor (FI score + recommendations)",
            "Connect Claude, ChatGPT, and other MCP clients",
        ],
        fi_scenario_limit=3,
        advisor_recommendation_limit=None,
        fire_rationale_visible=True,
    ),
    "pro": Plan(
        key="pro",
        name="Pro",
        description="For power users and professionals with heavy AI use.",
        monthly_price_usd=29.0,
        yearly_price_usd=200.0,
        limits={
            METRIC_AGENT_MESSAGES: 5000,
            METRIC_STATEMENT_UPLOADS: 500,
            METRIC_ADVISOR_RUNS: 150,
        },
        paid=True,
        features=[
            "Everything in Plus",
            "5,000 AI agent messages / month",
            "500 statement uploads / month",
            "Priority model access",
            "Daily wealth advisor + more runs",
            "Connect Claude, ChatGPT, and other MCP clients",
        ],
        fi_scenario_limit=3,
        advisor_recommendation_limit=None,
        fire_rationale_visible=True,
    ),
}

DEFAULT_PLAN = "free"


def get_plan(key: str | None) -> Plan:
    """Return the plan for a key, falling back to Free for unknown/None."""
    return PLANS.get(key or DEFAULT_PLAN, PLANS[DEFAULT_PLAN])


def limit_for(plan_key: str | None, metric: str) -> int:
    return get_plan(plan_key).limits.get(metric, 0)
