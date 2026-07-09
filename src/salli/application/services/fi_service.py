"""
FiService — builds a FinancialSnapshot from the ledger, runs the deterministic FI
engine, persists score snapshots, and manages goals. The LLM is only used in
generate_strategy() to create the AI-generated FireStrategy.
"""

from __future__ import annotations

import datetime
import hashlib
import json
from collections.abc import AsyncGenerator, Callable
from dataclasses import asdict
from decimal import Decimal
from typing import Any

from salli.domain.accounting import ledger as ledger_ops
from salli.domain.accounting.models import Account, Direction, StoredJournalEntry
from salli.domain.fi import engine
from salli.domain.fi.models import FinancialSnapshot, FiScore
from salli.domain.fi.packs import registry

# Asset-name keywords that mark an account as an *investment* (vs liquid savings).
_INVESTMENT_KEYWORDS = (
    "fixed deposit",
    "fd",
    "investment",
    "invest",
    "stock",
    "share",
    "mutual",
    "unit trust",
    "bond",
    "treasury",
    "t-bill",
    "tbill",
    "crypto",
    "etf",
    "pension",
    "epf",
    "etf",
    "portfolio",
)


def _is_investment(acc: Account) -> bool:
    n = acc.name.lower()
    return any(k in n for k in _INVESTMENT_KEYWORDS)


def _months_ago_iso(months: int) -> str:
    today = datetime.date.today()
    # approximate months as 30-day steps is fine for a trailing window
    d = today - datetime.timedelta(days=months * 30)
    return d.isoformat()


def _dec(v: Decimal) -> str:
    return str(v)


def _score_to_dict(score: FiScore, projected_fi_date: str | None) -> dict[str, Any]:
    d = asdict(score)
    # JSONB can't hold Decimal — stringify money/ratio fields (frontend formats)
    for k, v in list(d.items()):
        if isinstance(v, Decimal):
            d[k] = str(v)
    d["components"] = [
        {**c, "score": str(c["score"]), "weight": str(c["weight"])} for c in d["components"]
    ]
    d["projected_fi_date"] = projected_fi_date
    return d


class FiService:
    def __init__(self, uow_factory: Callable[[], Any]) -> None:
        self._uow_factory = uow_factory

    # ── Snapshot ────────────────────────────────────────────────────────────────

    async def build_snapshot(self, user_id: str) -> FinancialSnapshot:
        async with self._uow_factory() as uow:
            accounts: list[Account] = await uow.ledger.get_accounts(user_id)
            all_entries: list[StoredJournalEntry] = await uow.ledger.get_entries(user_id)
            recent: list[StoredJournalEntry] = await uow.ledger.get_entries(
                user_id, from_date=_months_ago_iso(12)
            )
            goals = await uow.goals.list(user_id, active_only=True)

        acc_map = {a.id: a for a in accounts}
        balances = ledger_ops.trial_balance(all_entries)  # {account_id: signed}

        total_assets = Decimal(0)
        total_liabilities = Decimal(0)
        liquid = Decimal(0)
        investments = Decimal(0)
        for a in accounts:
            bal = balances.get(a.id, Decimal(0))
            if a.type == "asset":
                total_assets += bal
                if _is_investment(a):
                    investments += bal
                else:
                    liquid += bal
            elif a.type == "liability":
                total_liabilities += -bal  # liabilities are credit-normal (negative)

        # Trailing-12-month income & expenses (separately)
        income = Decimal(0)
        expenses = Decimal(0)
        for e in recent:
            for p in e.postings:
                acc = acc_map.get(p.account_id)
                if acc is None:
                    continue
                if acc.type == "income" and p.direction == Direction.CREDIT:
                    income += abs(p.base_signed)
                elif acc.type == "expense" and p.direction == Direction.DEBIT:
                    expenses += abs(p.base_signed)
        monthly_income = income / Decimal(12)
        monthly_expenses = expenses / Decimal(12)

        # Weighted goal progress (current/target), active goals with a target
        goal_progress: Decimal | None = None
        prog = [
            min(Decimal(1), Decimal(g["current_amount_minor"]) / Decimal(g["target_amount_minor"]))
            for g in goals
            if g.get("target_amount_minor", 0) > 0
        ]
        if prog:
            goal_progress = sum(prog, Decimal(0)) / Decimal(len(prog))

        return FinancialSnapshot(
            monthly_income=monthly_income,
            monthly_expenses=monthly_expenses,
            liquid_savings=max(Decimal(0), liquid),
            investments=max(Decimal(0), investments),
            total_assets=max(Decimal(0), total_assets),
            total_liabilities=max(Decimal(0), total_liabilities),
            goal_progress=goal_progress,
        )

    # ── Score ─────────────────────────────────────────────────────────────────

    async def compute_score(self, user_id: str) -> dict[str, Any]:
        snapshot = await self.build_snapshot(user_id)
        score = engine.compute(snapshot, registry.get_pack())

        projected_date = None
        if score.projected_fi_years is not None:
            yrs = int(score.projected_fi_years)
            target = datetime.date.today() + datetime.timedelta(days=yrs * 365)
            projected_date = target.isoformat()

        result = _score_to_dict(score, projected_date)
        result["inputs_hash"] = hashlib.sha256(
            json.dumps(asdict(snapshot), default=str, sort_keys=True).encode()
        ).hexdigest()

        async with self._uow_factory() as uow:
            await uow.fi_scores.save(user_id, result)
        return result

    async def get_latest_score(self, user_id: str) -> dict[str, Any] | None:
        async with self._uow_factory() as uow:
            return await uow.fi_scores.get_latest(user_id)

    async def get_or_compute_score(self, user_id: str) -> dict[str, Any]:
        latest = await self.get_latest_score(user_id)
        return latest if latest else await self.compute_score(user_id)

    async def get_score_history(self, user_id: str) -> list[dict[str, Any]]:
        async with self._uow_factory() as uow:
            return await uow.fi_scores.history(user_id)

    # ── Goals ───────────────────────────────────────────────────────────────────

    @staticmethod
    def _goal_view(g: dict[str, Any]) -> dict[str, Any]:
        target = g.get("target_amount_minor", 0)
        progress = (g["current_amount_minor"] / target) if target > 0 else 0.0
        return {
            "id": g["id"],
            "name": g["name"],
            "kind": g["kind"],
            "target_amount": str(Decimal(g["target_amount_minor"]) / 100),
            "current_amount": str(Decimal(g["current_amount_minor"]) / 100),
            "target_date": g.get("target_date"),
            "priority": g["priority"],
            "progress": round(min(1.0, progress), 4),
            "created_at": g.get("created_at"),
        }

    async def list_goals(self, user_id: str) -> list[dict[str, Any]]:
        async with self._uow_factory() as uow:
            goals = await uow.goals.list(user_id, active_only=True)
        return [self._goal_view(g) for g in goals]

    async def create_goal(self, user_id: str, data: dict[str, Any]) -> str:
        goal = {
            "name": data["name"],
            "kind": data.get("kind", "custom"),
            "target_amount_minor": int(Decimal(str(data.get("target_amount", 0))) * 100),
            "current_amount_minor": int(Decimal(str(data.get("current_amount", 0))) * 100),
            "target_date": data.get("target_date"),
            "priority": int(data.get("priority", 2)),
        }
        async with self._uow_factory() as uow:
            return await uow.goals.save(user_id, goal)

    async def update_goal(self, user_id: str, goal_id: str, data: dict[str, Any]) -> None:
        updates: dict[str, Any] = {}
        for k in ("name", "kind", "target_date", "priority", "is_active"):
            if k in data:
                updates[k] = data[k]
        if "target_amount" in data:
            updates["target_amount_minor"] = int(Decimal(str(data["target_amount"])) * 100)
        if "current_amount" in data:
            updates["current_amount_minor"] = int(Decimal(str(data["current_amount"])) * 100)
        async with self._uow_factory() as uow:
            await uow.goals.update(user_id, goal_id, updates)

    async def delete_goal(self, user_id: str, goal_id: str) -> None:
        async with self._uow_factory() as uow:
            await uow.goals.delete(user_id, goal_id)

    # ── FIRE Strategy ────────────────────────────────────────────────────────────

    async def get_strategy(self, user_id: str) -> dict[str, Any] | None:
        async with self._uow_factory() as uow:
            return await uow.fire_strategies.get_latest(user_id)

    async def get_strategy_history(self, user_id: str) -> list[dict[str, Any]]:
        async with self._uow_factory() as uow:
            return await uow.fire_strategies.get_history(user_id)

    async def generate_strategy(
        self, user_id: str, email: str | None = None
    ) -> AsyncGenerator[str, None]:
        """SSE generator: streams status events, then persists and yields the result."""
        from salli.domain.agents import fire_strategy as fs_llm

        yield _sse({"type": "status", "message": "Gathering your financial profile..."})

        snapshot = await self.build_snapshot(user_id)
        goals = await self.list_goals(user_id)
        previous = await self.get_strategy(user_id)

        # Build raw account detail for LLM context (type, currency, name)
        async with self._uow_factory() as uow:
            accounts = await uow.ledger.get_accounts(user_id)
            recent_entries = await uow.ledger.get_entries(user_id, from_date=_months_ago_iso(12))

        account_summary = [
            {"name": a.name, "type": a.type, "currency": a.currency} for a in accounts
        ]

        surplus_data = engine.compute_surplus_breakdown(recent_entries, accounts, months=12)

        yield _sse({"type": "status", "message": "Applying FIRE theories to your data..."})

        context: dict[str, Any] = {
            "monthly_income": str(snapshot.monthly_income),
            "monthly_expenses": str(snapshot.monthly_expenses),
            "monthly_surplus": str(snapshot.monthly_income - snapshot.monthly_expenses),
            "savings_rate": str(
                (snapshot.monthly_income - snapshot.monthly_expenses) / snapshot.monthly_income
                if snapshot.monthly_income > 0
                else Decimal(0)
            ),
            "liquid_savings": str(snapshot.liquid_savings),
            "investments": str(snapshot.investments),
            "total_assets": str(snapshot.total_assets),
            "total_liabilities": str(snapshot.total_liabilities),
            "net_worth": str(snapshot.total_assets - snapshot.total_liabilities),
            "currency": snapshot.currency,
            "income_by_source": {k: str(v) for k, v in surplus_data.income_by_source.items()},
            "expense_by_category": {k: str(v) for k, v in surplus_data.expense_by_category.items()},
            "accounts": account_summary,
            "goals": goals,
            "previous_strategy": previous,
        }

        yield _sse({"type": "status", "message": "Generating personalised FIRE configuration..."})

        result = await fs_llm.generate_strategy(context)

        yield _sse({"type": "status", "message": "Saving your FIRE strategy..."})

        strategy_dict = {
            "fire_style": result.fire_style,
            "swr": result.swr,
            "return_conservative": result.return_conservative,
            "return_base": result.return_base,
            "return_growth": result.return_growth,
            "target_monthly_expenses": result.target_monthly_expenses,
            "target_age": result.target_age,
            "buckets": [b.model_dump() for b in result.buckets],
            "ai_rationale": result.ai_rationale,
            "theories_applied": result.theories_applied,
            "is_initial": previous is None,
        }

        async with self._uow_factory() as uow:
            version = await uow.fire_strategies.save(user_id, strategy_dict)

        strategy_dict["version"] = version
        yield _sse({"type": "done", "strategy": strategy_dict})

    # ── Projections ──────────────────────────────────────────────────────────────

    async def get_projections(self, user_id: str) -> dict[str, Any]:
        strategy_data = await self.get_strategy(user_id)
        snapshot = await self.build_snapshot(user_id)

        if strategy_data is None:
            # Fallback: use pack defaults
            pack = registry.get_pack()
            from salli.domain.fi.models import AllocationBucket, FireStrategy

            strategy = FireStrategy(
                version=0,
                fire_style="standard",
                swr=pack.safe_withdrawal_rate,
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
        else:
            from salli.domain.fi.models import AllocationBucket, FireStrategy

            strategy = FireStrategy(
                version=strategy_data.get("version", 1),
                fire_style=strategy_data.get("fire_style", "standard"),
                swr=Decimal(str(strategy_data.get("swr", "0.04"))),
                return_conservative=Decimal(str(strategy_data.get("return_conservative", "0.06"))),
                return_base=Decimal(str(strategy_data.get("return_base", "0.10"))),
                return_growth=Decimal(str(strategy_data.get("return_growth", "0.14"))),
                target_monthly_expenses=(
                    Decimal(str(strategy_data["target_monthly_expenses"]))
                    if strategy_data.get("target_monthly_expenses")
                    else None
                ),
                target_age=strategy_data.get("target_age"),
                buckets=[
                    AllocationBucket(
                        key=b["key"],
                        name=b["name"],
                        target_pct=Decimal(str(b["target_pct"])),
                        description=b["description"],
                        color=b["color"],
                    )
                    for b in strategy_data.get("buckets", [])
                ],
                ai_rationale=strategy_data.get("ai_rationale", ""),
                theories_applied=strategy_data.get("theories_applied", []),
                created_at=strategy_data.get("created_at", ""),
                is_initial=strategy_data.get("is_initial", True),
            )

        points = engine.project_portfolio(snapshot, strategy)
        pack = registry.get_pack()
        expenses = strategy.target_monthly_expenses or snapshot.monthly_expenses
        fi_number = (expenses * 12 / strategy.swr) if strategy.swr > 0 else Decimal(0)

        def _fire_year(scenario_key: str) -> int | None:
            for p in points:
                val = getattr(p, scenario_key)
                if val >= fi_number:
                    return p.year
            return None

        return {
            "points": [
                {
                    "year": p.year,
                    "conservative": str(p.conservative),
                    "base": str(p.base),
                    "growth": str(p.growth),
                }
                for p in points
            ],
            "fi_number": str(fi_number),
            "fire_year_conservative": _fire_year("conservative"),
            "fire_year_base": _fire_year("base"),
            "fire_year_growth": _fire_year("growth"),
            "current_portfolio": str(snapshot.liquid_savings + snapshot.investments),
        }

    # ── Surplus Breakdown ────────────────────────────────────────────────────────

    async def get_surplus_breakdown(self, user_id: str) -> dict[str, Any]:
        async with self._uow_factory() as uow:
            accounts = await uow.ledger.get_accounts(user_id)
            entries = await uow.ledger.get_entries(user_id, from_date=_months_ago_iso(12))

        breakdown = engine.compute_surplus_breakdown(entries, accounts, months=12)
        return {
            "income_by_source": {k: str(v) for k, v in breakdown.income_by_source.items()},
            "expense_by_category": {k: str(v) for k, v in breakdown.expense_by_category.items()},
            "gross_monthly_income": str(breakdown.gross_monthly_income),
            "gross_monthly_expenses": str(breakdown.gross_monthly_expenses),
            "monthly_surplus": str(breakdown.monthly_surplus),
            "savings_rate": str(breakdown.savings_rate),
        }


def _sse(data: dict) -> str:
    return f"data: {json.dumps(data, default=str)}\n\n"
