"""
content_gating.py — server-side "peek" redaction for premium-depth surfaces.

Pure domain functions: no I/O, no framework imports. Given the FULL, truthful
payload a service already computed and a Plan, return a new dict shaped for
what that plan is entitled to see. Never trust a client-supplied flag; the
caller (interface layer) must always look up the Plan server-side.

Redaction is unconditional per-field — never a "is this value actually
different" heuristic — so behaviour stays correct even when scenario values
happen to coincide (e.g. the projections fallback path with no persisted
strategy yet).
"""

from __future__ import annotations

import copy
from typing import Any

from salli.domain.billing.plans import Plan

_ALL_SCENARIOS = ("conservative", "base", "growth")
_LOCKABLE_SCENARIOS = ("conservative", "growth")  # base is always visible


def truncate_projections(data: dict[str, Any], plan: Plan) -> dict[str, Any]:
    """Redact non-base scenario fields from /fi/projections for plans below
    `plan.fi_scenario_limit` (free sees only 1 of the 3 scenarios)."""
    out = copy.deepcopy(data)

    if plan.fi_scenario_limit >= len(_ALL_SCENARIOS):
        out["scenario_access"] = {
            "visible": list(_ALL_SCENARIOS),
            "locked": [],
            "requires_plan": None,
        }
        return out

    for point in out.get("points", []):
        for scenario in _LOCKABLE_SCENARIOS:
            if scenario in point:
                point[scenario] = None
    for scenario in _LOCKABLE_SCENARIOS:
        key = f"fire_year_{scenario}"
        if key in out:
            out[key] = None

    out["scenario_access"] = {
        "visible": ["base"],
        "locked": list(_LOCKABLE_SCENARIOS),
        "requires_plan": "pro",
    }
    return out


def _first_sentence(text: str, max_len: int = 220) -> str:
    """Best-effort first-sentence extraction for the free-tier preview."""
    if not text:
        return ""
    for sep in (". ", "! ", "? ", "\n"):
        idx = text.find(sep)
        if 0 < idx < max_len:
            return text[: idx + 1].strip()
    return (text[:max_len].rstrip() + "…") if len(text) > max_len else text.strip()


def truncate_strategy(strategy: dict[str, Any], plan: Plan) -> dict[str, Any]:
    """Redact ai_rationale/theories_applied on /fi/strategy (and the `done`
    SSE event of /fi/strategy/generate). `buckets` is never touched — it's
    real actionable allocation data, kept free by product decision."""
    out = copy.deepcopy(strategy)

    if plan.fire_rationale_visible:
        out["rationale_locked"] = False
        return out

    rationale = out.get("ai_rationale") or ""
    out["rationale_preview"] = _first_sentence(rationale)
    out["ai_rationale"] = None
    out["rationale_locked"] = True

    theories = out.get("theories_applied") or []
    out["theories_applied_count"] = len(theories)
    out["theories_applied"] = None
    return out


def truncate_recommendations(report: dict[str, Any], plan: Plan) -> dict[str, Any]:
    """Redact lower-priority recommendations on advisor reports beyond
    `plan.advisor_recommendation_limit` (None = unlimited, no truncation)."""
    out = copy.deepcopy(report)
    limit = plan.advisor_recommendation_limit
    recs = out.get("recommendations") or []

    if limit is None or len(recs) <= limit:
        for r in recs:
            r["locked"] = False
        out["recommendations"] = recs
        out["recommendations_locked_count"] = 0
        return out

    ordered = sorted(enumerate(recs), key=lambda pair: (pair[1].get("priority", 99), pair[0]))
    visible_idx = {i for i, _ in ordered[:limit]}

    new_recs = []
    locked_count = 0
    for i, r in enumerate(recs):
        if i in visible_idx:
            r = dict(r)
            r["locked"] = False
            new_recs.append(r)
        else:
            new_recs.append(
                {
                    "id": r.get("id"),
                    "title": r.get("title"),
                    "category": r.get("category"),
                    "priority": r.get("priority"),
                    "locked": True,
                }
            )
            locked_count += 1

    out["recommendations"] = new_recs
    out["recommendations_locked_count"] = locked_count
    return out
