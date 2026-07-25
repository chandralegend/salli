"""Pure-function tests for content_gating.py — no I/O, no DB."""

from __future__ import annotations

import copy

import pytest

from salli.domain.billing.content_gating import (
    truncate_projections,
    truncate_recommendations,
    truncate_strategy,
)
from salli.domain.billing.plans import PLANS

FREE = PLANS["free"]
PLUS = PLANS["plus"]
PRO = PLANS["pro"]


def _projections() -> dict:
    return {
        "points": [
            {"year": 1, "conservative": "100", "base": "110", "growth": "120"},
            {"year": 2, "conservative": "200", "base": "220", "growth": "240"},
        ],
        "fi_number": "5000000",
        "fire_year_conservative": 14,
        "fire_year_base": 12,
        "fire_year_growth": 10,
        "current_portfolio": "1000000",
    }


class TestTruncateProjections:
    def test_free_redacts_non_base_scenarios(self):
        data = _projections()
        out = truncate_projections(data, FREE)

        for point in out["points"]:
            assert point["conservative"] is None
            assert point["growth"] is None
            assert point["base"] is not None
        assert out["fire_year_conservative"] is None
        assert out["fire_year_growth"] is None
        assert out["fire_year_base"] == 12
        assert out["scenario_access"] == {
            "visible": ["base"],
            "locked": ["conservative", "growth"],
            "requires_plan": "plus",
        }

    @pytest.mark.parametrize("plan", [PLUS, PRO])
    def test_paid_plans_passthrough(self, plan):
        data = _projections()
        out = truncate_projections(data, plan)

        assert out["points"] == data["points"]
        assert out["fire_year_conservative"] == 14
        assert out["fire_year_growth"] == 10
        assert out["scenario_access"] == {
            "visible": ["conservative", "base", "growth"],
            "locked": [],
            "requires_plan": None,
        }

    def test_does_not_mutate_input(self):
        data = _projections()
        original = copy.deepcopy(data)
        truncate_projections(data, FREE)
        assert data == original

    def test_fallback_path_harmless_when_scenarios_equal(self):
        data = _projections()
        for point in data["points"]:
            point["conservative"] = point["base"]
            point["growth"] = point["base"]
        out = truncate_projections(data, FREE)
        for point in out["points"]:
            assert point["conservative"] is None
            assert point["growth"] is None


def _strategy(rationale: str = "Save aggressively. Invest the surplus. Retire early.") -> dict:
    return {
        "fire_style": "standard",
        "buckets": [
            {"key": "equity", "name": "Equity", "target_pct": 60, "description": "d", "color": "c"}
        ],
        "ai_rationale": rationale,
        "theories_applied": ["4% rule", "Bucket strategy", "Coast FIRE"],
        "is_initial": True,
        "version": 1,
    }


class TestTruncateStrategy:
    def test_free_truncates_rationale_and_theories(self):
        strategy = _strategy()
        out = truncate_strategy(strategy, FREE)

        assert out["ai_rationale"] is None
        assert out["rationale_locked"] is True
        assert out["rationale_preview"] == "Save aggressively."
        assert out["theories_applied"] is None
        assert out["theories_applied_count"] == 3
        # Core value invariant: buckets are never gated.
        assert out["buckets"] == strategy["buckets"]

    @pytest.mark.parametrize("plan", [PLUS, PRO])
    def test_paid_plans_full_visibility(self, plan):
        strategy = _strategy()
        out = truncate_strategy(strategy, plan)

        assert out["ai_rationale"] == strategy["ai_rationale"]
        assert out["theories_applied"] == strategy["theories_applied"]
        assert out["rationale_locked"] is False
        assert "rationale_preview" not in out
        assert "theories_applied_count" not in out

    @pytest.mark.parametrize(
        "text,expected",
        [
            ("Save aggressively. Invest the surplus.", "Save aggressively."),
            (
                "No punctuation at all just plain text under the limit",
                "No punctuation at all just plain text under the limit",
            ),
            ("", ""),
            ("x" * 300, "x" * 220 + "…"),
        ],
    )
    def test_first_sentence_extraction(self, text, expected):
        out = truncate_strategy(_strategy(rationale=text), FREE)
        assert out["rationale_preview"] == expected


def _recommendation(rec_id: str, priority: int, title: str = "Do something") -> dict:
    return {
        "id": rec_id,
        "title": title,
        "rationale": f"Rationale for {rec_id}",
        "category": "savings",
        "priority": priority,
        "bucket_key": None,
        "action_type": "none",
        "action_params": {"label": "", "due_in_days": None},
        "status": "pending",
    }


def _report(recs: list[dict]) -> dict:
    return {"id": "report-1", "summary": "s", "fire_tier_assessment": "f", "recommendations": recs}


class TestTruncateRecommendations:
    def test_free_limits_to_top_n_by_priority(self):
        recs = [
            _recommendation("a", 3),
            _recommendation("b", 1),
            _recommendation("c", 2),
            _recommendation("d", 1),
            _recommendation("e", 3),
        ]
        out = truncate_recommendations(_report(recs), FREE)
        out_recs = out["recommendations"]

        assert [r["id"] for r in out_recs] == ["a", "b", "c", "d", "e"]  # original order preserved
        unlocked = [r for r in out_recs if not r["locked"]]
        locked = [r for r in out_recs if r["locked"]]
        assert {r["id"] for r in unlocked} == {"b", "d"}  # the two priority-1 entries
        assert len(locked) == 3
        for r in locked:
            assert set(r.keys()) == {"id", "title", "category", "priority", "locked"}
        assert out["recommendations_locked_count"] == 3

    def test_tiebreak_is_stable(self):
        recs = [_recommendation(str(i), 1) for i in range(5)]
        out1 = truncate_recommendations(_report(recs), FREE)
        out2 = truncate_recommendations(_report(recs), FREE)
        unlocked1 = [r["id"] for r in out1["recommendations"] if not r["locked"]]
        unlocked2 = [r["id"] for r in out2["recommendations"] if not r["locked"]]
        assert unlocked1 == unlocked2 == ["0", "1"]

    @pytest.mark.parametrize("plan", [PLUS, PRO])
    def test_paid_plans_unlimited(self, plan):
        recs = [_recommendation(str(i), 2) for i in range(5)]
        out = truncate_recommendations(_report(recs), plan)
        assert all(not r["locked"] for r in out["recommendations"])
        assert out["recommendations_locked_count"] == 0
        assert all("rationale" in r for r in out["recommendations"])

    def test_fewer_than_limit_no_stubs_added(self):
        out = truncate_recommendations(_report([_recommendation("a", 1)]), FREE)
        assert len(out["recommendations"]) == 1
        assert out["recommendations"][0]["locked"] is False
        assert "rationale" in out["recommendations"][0]
        assert out["recommendations_locked_count"] == 0

    def test_empty_list(self):
        out = truncate_recommendations(_report([]), FREE)
        assert out["recommendations"] == []
        assert out["recommendations_locked_count"] == 0
