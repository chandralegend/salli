"""
FiService — builds a FinancialSnapshot from the ledger, runs the deterministic FI
engine, persists score snapshots, and manages goals. The LLM is only used in
generate_strategy() to create the AI-generated FireStrategy.
"""

from __future__ import annotations

import calendar
import datetime
import hashlib
import json
import re
from collections.abc import AsyncGenerator, Callable
from dataclasses import asdict
from decimal import ROUND_HALF_UP, Decimal
from typing import Any

from salli.domain.accounting import ledger as ledger_ops
from salli.domain.accounting.models import Account, Direction, StoredJournalEntry
from salli.domain.fi import engine
from salli.domain.fi.models import AllocationBucket, FinancialSnapshot, FireStrategy, FiScore
from salli.domain.fi.packs import registry
from salli.domain.money import to_minor

# Account-name patterns that mark an asset account as an *investment* rather than
# emergency-fund-eligible liquid savings.
#
# Anchored on word boundaries deliberately: an earlier unanchored substring list
# matched "fd" inside "Refund" and "share" inside "Sharepoint", quietly moving
# cash out of liquid savings and corrupting the emergency-fund component (15% of
# the score). Stems that need to match plurals/derivatives spell that out.
_INVESTMENT_PATTERN = re.compile(
    r"\b(?:"
    r"fixed deposits?"
    r"|fd"
    r"|invest\w*"
    r"|stocks?"
    r"|shares?"
    r"|mutual"
    r"|unit trusts?"
    r"|bonds?"
    r"|treasury"
    r"|t-?bills?"
    r"|crypto\w*"
    r"|etfs?"
    r"|pensions?"
    r"|epf"
    r"|etf"
    r"|portfolios?"
    r")\b"
)


def _is_investment(acc: Account) -> bool:
    return bool(_INVESTMENT_PATTERN.search(acc.name.lower()))


def _months_ago_iso(months: int) -> str:
    """
    First day of the trailing window, on calendar months.

    Previously approximated as 30-day steps, which made a "12 month" window 360
    days while still dividing the total by 12 — understating monthly income and
    expenses by ~1.4%.
    """
    today = datetime.date.today()
    month_index = today.month - 1 - months
    year = today.year + month_index // 12
    month = month_index % 12 + 1
    day = min(today.day, calendar.monthrange(year, month)[1])
    return datetime.date(year, month, day).isoformat()


def _months_observed(entries: list[StoredJournalEntry], cap: int = 12) -> Decimal:
    """
    Months of history the trailing window actually covers, clamped to 1..cap.

    Measured as the span from the earliest entry to today, so a steady earner with
    only four months of records is averaged over four months rather than twelve.
    """
    if not entries:
        return Decimal(cap)
    earliest = min(str(e.entry_date)[:10] for e in entries)
    try:
        start = datetime.date.fromisoformat(earliest)
    except ValueError:
        return Decimal(cap)
    today = datetime.date.today()
    months = (today.year - start.year) * 12 + (today.month - start.month)
    # A partial current month still counts as one month of observation.
    months += 1
    return Decimal(max(1, min(cap, months)))


def _plus_years_iso(years: int) -> str:
    """Calendar-correct year arithmetic (365-day years drift on leap years)."""
    today = datetime.date.today()
    try:
        return today.replace(year=today.year + years).isoformat()
    except ValueError:  # 29 Feb → 28 Feb in a non-leap target year
        return today.replace(year=today.year + years, day=28).isoformat()


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
        # Classify per account on its actual sign, rather than summing signed
        # balances and clamping the aggregate at zero. Clamping let an overdrawn
        # current account net silently against other assets (inflating net worth)
        # instead of being recognised as the borrowing it is.
        for a in accounts:
            bal = balances.get(a.id, Decimal(0))
            if a.type == "asset":
                if bal >= 0:
                    total_assets += bal
                    if _is_investment(a):
                        investments += bal
                    else:
                        liquid += bal
                else:
                    # Credit balance on an asset = an overdraft: economically debt.
                    total_liabilities += -bal
            elif a.type == "liability":
                magnitude = -bal  # liabilities are credit-normal (stored negative)
                if magnitude >= 0:
                    total_liabilities += magnitude
                else:
                    # Debit balance on a liability = overpaid: a receivable.
                    total_assets += -magnitude
                    liquid += -magnitude

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
        # Annualise over the period actually observed, not a blind 12 months.
        # Dividing a new user's 3 months of income by 12 understates their monthly
        # figure ~4x, which then propagates into savings_rate, the FI number and
        # every projection built on them.
        months_observed = _months_observed(recent)
        monthly_income = income / months_observed
        monthly_expenses = expenses / months_observed

        # Weighted goal progress (current/target), active goals with a target
        goal_progress: Decimal | None = None
        prog = [
            min(Decimal(1), Decimal(g["current_amount_minor"]) / Decimal(g["target_amount_minor"]))
            for g in goals
            if g.get("target_amount_minor", 0) > 0
        ]
        if prog:
            goal_progress = sum(prog, Decimal(0)) / Decimal(len(prog))

        # No aggregate clamping needed — every branch above contributes a
        # non-negative amount to the bucket it actually belongs in.
        return FinancialSnapshot(
            monthly_income=monthly_income,
            monthly_expenses=monthly_expenses,
            liquid_savings=liquid,
            investments=investments,
            total_assets=total_assets,
            total_liabilities=total_liabilities,
            goal_progress=goal_progress,
        )

    # ── Resolved strategy ──────────────────────────────────────────────────────

    @staticmethod
    def _resolve_strategy(strategy_data: dict[str, Any] | None) -> FireStrategy:
        """
        The single place raw strategy JSON becomes a typed, Decimal FireStrategy.

        The LLM emits these as floats; they are converted once, here, so nothing
        downstream does float arithmetic on a rate that divides money. When the
        user has no strategy the pack's defaults stand in, so callers always get a
        usable strategy and never have to branch.
        """
        pack = registry.get_pack()
        if strategy_data is None:
            return FireStrategy(
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
        return FireStrategy(
            version=strategy_data.get("version", 1),
            fire_style=strategy_data.get("fire_style", "standard"),
            swr=Decimal(str(strategy_data.get("swr", pack.safe_withdrawal_rate))),
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

    @staticmethod
    def _inputs_hash(snapshot: FinancialSnapshot, strategy: FireStrategy) -> str:
        """
        Fingerprint of everything the score depends on.

        Includes the strategy, not just the ledger snapshot: regenerating a
        strategy with a different SWR changes the FI number, so a score computed
        under the old one is stale even when the ledger has not moved.
        """
        payload = {
            "snapshot": asdict(snapshot),
            "swr": str(strategy.swr),
            "target_monthly_expenses": str(strategy.target_monthly_expenses),
            "return_base": str(strategy.return_base),
            "pack": registry.get_pack().version,
        }
        return hashlib.sha256(json.dumps(payload, default=str, sort_keys=True).encode()).hexdigest()

    # ── Score ─────────────────────────────────────────────────────────────────

    async def compute_score(self, user_id: str) -> dict[str, Any]:
        snapshot = await self.build_snapshot(user_id)
        strategy = self._resolve_strategy(await self.get_strategy(user_id))
        pack = registry.get_pack()

        # Same swr / target / real return the projection uses, so the Freedom
        # Number on the card and the target on the chart are one number.
        score = engine.compute(
            snapshot,
            pack,
            swr=strategy.swr,
            target_monthly_expenses=strategy.target_monthly_expenses,
            annual_real_return=engine.scenario_real_returns(strategy, pack)["base"],
        )

        projected_date = None
        if score.projected_fi_years is not None:
            projected_date = _plus_years_iso(int(score.projected_fi_years))

        result = _score_to_dict(score, projected_date)
        result["inputs_hash"] = self._inputs_hash(snapshot, strategy)

        async with self._uow_factory() as uow:
            await uow.fi_scores.save(user_id, result)
        return result

    async def get_latest_score(self, user_id: str) -> dict[str, Any] | None:
        async with self._uow_factory() as uow:
            return await uow.fi_scores.get_latest(user_id)

    async def get_or_compute_score(self, user_id: str) -> dict[str, Any]:
        """
        Latest score, recomputed whenever its inputs have moved.

        `inputs_hash` was previously written and never read, so the score card
        served the first-ever snapshot indefinitely while the projection chart was
        computed live — the two drifted apart with every posted entry.
        """
        latest = await self.get_latest_score(user_id)
        if latest is None:
            return await self.compute_score(user_id)

        snapshot = await self.build_snapshot(user_id)
        strategy = self._resolve_strategy(await self.get_strategy(user_id))
        if latest.get("inputs_hash") != self._inputs_hash(snapshot, strategy):
            return await self.compute_score(user_id)
        return latest

    async def get_score_history(self, user_id: str) -> list[dict[str, Any]]:
        async with self._uow_factory() as uow:
            return await uow.fi_scores.history(user_id)

    # ── Goals ───────────────────────────────────────────────────────────────────

    @staticmethod
    def _goal_view(g: dict[str, Any]) -> dict[str, Any]:
        target = g.get("target_amount_minor", 0)
        # Computed in Decimal (the score path already did); float only at the
        # JSON boundary, where this is a display ratio and not money.
        progress = (
            min(Decimal(1), Decimal(g["current_amount_minor"]) / Decimal(target))
            if target > 0
            else Decimal(0)
        )
        return {
            "id": g["id"],
            "name": g["name"],
            "kind": g["kind"],
            "target_amount": str(Decimal(g["target_amount_minor"]) / 100),
            "current_amount": str(Decimal(g["current_amount_minor"]) / 100),
            "target_date": g.get("target_date"),
            "priority": g["priority"],
            "progress": float(progress.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)),
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
            "target_amount_minor": to_minor(Decimal(str(data.get("target_amount", 0)))),
            "current_amount_minor": to_minor(Decimal(str(data.get("current_amount", 0)))),
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
            updates["target_amount_minor"] = to_minor(Decimal(str(data["target_amount"])))
        if "current_amount" in data:
            updates["current_amount_minor"] = to_minor(Decimal(str(data["current_amount"])))
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
        snapshot = await self.build_snapshot(user_id)
        strategy = self._resolve_strategy(await self.get_strategy(user_id))
        pack = registry.get_pack()

        # The score's own FI number, from the same swr/target — not a second
        # formula. These two used to disagree whenever the strategy SWR was not 4%.
        score = engine.compute(
            snapshot,
            pack,
            swr=strategy.swr,
            target_monthly_expenses=strategy.target_monthly_expenses,
        )
        fi_number = score.fi_number
        rates = engine.scenario_real_returns(strategy, pack)
        base = engine.fi_asset_base(snapshot)
        surplus = snapshot.monthly_income - snapshot.monthly_expenses

        # Years come from the shared solver, NOT from scanning the plotted series:
        # a 15-year chart cannot express an 18-year answer, and scanning one
        # returned None (which the UI rendered as a fallback ISO date).
        years = {
            key: engine.years_to_target(base, surplus, rate, fi_number)
            for key, rate in rates.items()
        }

        # Stretch the chart far enough to actually show the crossing when there is
        # one, so the plotted line and the headline number tell the same story.
        reachable = [int(v) for v in years.values() if v is not None and v > 0]
        horizon = min(40, max(15, (max(reachable) + 2) if reachable else 15))
        points = engine.project_portfolio(snapshot, strategy, pack, horizon_years=horizon)

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
            "swr": str(strategy.swr),
            "fire_year_conservative": (
                int(years["conservative"]) if years["conservative"] is not None else None
            ),
            "fire_year_base": int(years["base"]) if years["base"] is not None else None,
            "fire_year_growth": int(years["growth"]) if years["growth"] is not None else None,
            "current_portfolio": str(base),
            # Real (inflation-adjusted) rates actually used, so the UI can label
            # the scenarios honestly rather than echoing the nominal assumptions.
            "real_returns": {
                k: str(v) for k, v in engine.scenario_real_returns(strategy, pack).items()
            },
            "expected_inflation": str(pack.expected_inflation),
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
