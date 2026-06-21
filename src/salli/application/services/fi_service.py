"""
FiService — builds a FinancialSnapshot from the ledger, runs the deterministic FI
engine, persists score snapshots, and manages goals. The LLM is never involved here.
"""

from __future__ import annotations

import datetime
import hashlib
import json
from collections.abc import Callable
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
    "fixed deposit", "fd", "investment", "invest", "stock", "share", "mutual",
    "unit trust", "bond", "treasury", "t-bill", "tbill", "crypto", "etf",
    "pension", "epf", "etf", "portfolio",
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
