"""
AdvisorService — orchestrates the daily/on-command Wealth Advisor.

Flow: quota gate → gather (deterministic FI score + goals + profile memories +
current rates) → advise (structured LLM) → persist an advisory report. Acting on a
recommendation (create a reminder) happens later, on the user's approval.
"""

from __future__ import annotations

import datetime
import uuid
from typing import Any

from salli.application.services.billing_service import QuotaExceeded
from salli.domain.agents import advisor as advisor_llm
from salli.domain.billing.plans import METRIC_ADVISOR_RUNS


class AdvisorService:
    def __init__(self, uow_factory, fi_service, billing_service, doc_service=None) -> None:
        self._uow_factory = uow_factory
        self._fi = fi_service
        self._billing = billing_service
        self._doc = doc_service

    # ── Run ─────────────────────────────────────────────────────────────────────

    async def run_advisor(
        self, user_id: str, email: str | None = None, trigger: str = "manual"
    ) -> dict[str, Any]:
        # Quota gate (raises QuotaExceeded → 402 for manual; cron catches & skips)
        await self._billing.check_and_increment(user_id, METRIC_ADVISOR_RUNS, email)

        from salli.domain.agents.tools import set_current_user

        set_current_user(user_id)

        # ── Gather (all deterministic) ──────────────────────────────────────────
        score = await self._fi.compute_score(user_id)
        goals = await self._fi.list_goals(user_id)
        profile = await self._gather_profile(user_id)
        rates = await self._research_rates()

        context = {
            "currency": score.get("currency", "LKR"),
            "fi_score": {
                "overall": score.get("overall_score"),
                "grade": score.get("grade"),
                "savings_rate": score.get("savings_rate"),
                "monthly_income": score.get("monthly_income"),
                "monthly_expenses": score.get("monthly_expenses"),
                "monthly_surplus": score.get("monthly_surplus"),
                "emergency_fund_months": score.get("emergency_fund_months"),
                "fi_number": score.get("fi_number"),
                "net_worth": score.get("net_worth"),
                "progress_to_fi": score.get("progress_to_fi"),
                "debt_to_asset": score.get("debt_to_asset"),
                "projected_fi_date": score.get("projected_fi_date"),
                "components": score.get("components"),
            },
            "goals": goals,
            "profile": profile,   # primary_goal, motivation, risk_appetite, target year/amount
            "current_rates_research": rates,
        }

        advice = await advisor_llm.generate_advice(context)

        recommendations = [
            {
                "id": str(uuid.uuid4()),
                "title": r.title,
                "rationale": r.rationale,
                "category": r.category,
                "priority": r.priority,
                "action_type": r.action.type,
                "action_params": {
                    "label": r.action.label,
                    "due_in_days": r.action.due_in_days,
                },
                "status": "pending",
            }
            for r in advice.recommendations
        ]

        report = {
            "trigger": trigger,
            "fi_score_id": None,
            "summary": advice.summary,
            "recommendations": recommendations,
        }
        async with self._uow_factory() as uow:
            report_id = await uow.advisories.save(user_id, report)
        report["id"] = report_id
        return report

    async def _gather_profile(self, user_id: str) -> dict[str, Any]:
        if not self._doc:
            return {}
        keys = ("primary_goal", "motivation", "risk_appetite", "goal_target_amount", "goal_target_year")
        out: dict[str, Any] = {}
        for k in keys:
            mem = await self._doc.get_memory(user_id, k)
            if mem and mem.get("content"):
                out[k] = mem["content"]
        return out

    async def _research_rates(self) -> str:
        """Best-effort: fetch current SL deposit/T-bill rates via web search."""
        try:
            from langchain_community.tools.tavily_search import TavilySearchResults

            tool = TavilySearchResults(max_results=3)
            results = await tool.ainvoke(
                "current fixed deposit and treasury bill interest rates Sri Lanka banks"
            )
            if isinstance(results, list):
                return " | ".join(
                    r.get("content", "")[:300] for r in results if isinstance(r, dict)
                )[:1200]
            return str(results)[:1200]
        except Exception:
            return ""

    # ── Reports ─────────────────────────────────────────────────────────────────

    async def list_reports(self, user_id: str) -> list[dict[str, Any]]:
        async with self._uow_factory() as uow:
            return await uow.advisories.list(user_id)

    async def get_latest_report(self, user_id: str) -> dict[str, Any] | None:
        async with self._uow_factory() as uow:
            return await uow.advisories.get_latest(user_id)

    # ── Act on a recommendation (user approval) ──────────────────────────────────

    async def apply_recommendation(self, user_id: str, report_id: str, rec_id: str) -> dict[str, Any]:
        async with self._uow_factory() as uow:
            report = await uow.advisories.get(user_id, report_id)
            if not report:
                raise ValueError("Report not found")
            recs = report["recommendations"]
            rec = next((r for r in recs if r["id"] == rec_id), None)
            if not rec:
                raise ValueError("Recommendation not found")

            if rec.get("action_type") == "reminder":
                params = rec.get("action_params") or {}
                due_days = params.get("due_in_days") or 14
                due = (datetime.date.today() + datetime.timedelta(days=int(due_days))).isoformat()
                label = params.get("label") or rec["title"]
                await uow.reminders.create_reminder(user_id, str(uuid.uuid4()), label, due)

            rec["status"] = "applied"
            await uow.advisories.update_recommendations(user_id, report_id, recs)
        return {"id": rec_id, "status": "applied"}

    async def dismiss_recommendation(self, user_id: str, report_id: str, rec_id: str) -> dict[str, Any]:
        async with self._uow_factory() as uow:
            report = await uow.advisories.get(user_id, report_id)
            if not report:
                raise ValueError("Report not found")
            recs = report["recommendations"]
            for r in recs:
                if r["id"] == rec_id:
                    r["status"] = "dismissed"
            await uow.advisories.update_recommendations(user_id, report_id, recs)
        return {"id": rec_id, "status": "dismissed"}

    # ── Scheduling helper ────────────────────────────────────────────────────────

    async def due_users(self) -> list[dict[str, str]]:
        """Active paid subscribers who have not had an advisory report today."""
        today = datetime.date.today().isoformat()
        async with self._uow_factory() as uow:
            subs = await uow.subscriptions.list_active_paid()  # see repo
            due = []
            for s in subs:
                if not await uow.advisories.ran_today(s["user_id"], today):
                    due.append(s)
        return due
