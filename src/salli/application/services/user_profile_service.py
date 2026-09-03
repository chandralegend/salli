"""
UserProfileService — the fact-find profile: identity, risk profile, life stage, and
the onboarding steps that reuse LedgerService/FiService to record real opening
balances and income (rather than the old empty-accounts-only flow).
"""

from __future__ import annotations

import datetime
from collections.abc import Callable
from decimal import Decimal
from typing import Any

from salli.application.services.document_service import DocumentService
from salli.application.services.fi_service import FiService
from salli.application.services.ledger_service import LedgerService
from salli.domain.accounting.models import AccountType, Direction
from salli.domain.ai_models import DEFAULT_MODEL
from salli.domain.risk import engine as risk_engine
from salli.domain.risk.life_stage import derive_life_stage
from salli.domain.risk.models import RiskQuestionnaireAnswers

_OPENING_EQUITY_CODE = "3000"
_OPENING_EQUITY_NAME = "Opening Equity"
_OPENING_EQUITY_TYPE: AccountType = "equity"

_DEFAULT_DEPOSIT_CODE = "1200"
_DEFAULT_DEPOSIT_NAME = "Bank Account"

# Legacy onboarding stored these as free-text agent_documents "memories" (namespace
# "memories"). Best-effort, self-healing backfill into the structured columns the
# first time a profile is read after this migration — narrative fields like
# "motivation" have no structured equivalent and stay as memories.
_LEGACY_MEMORY_TO_COLUMN = {
    "user_name": "display_name",
    "residency_status": "residency_status",
    "employer": "employer",
    "employment_type": "employment_type",
    "ird_number": "ird_number",
}


def _age_from_dob(dob: datetime.date | str | None) -> int | None:
    if dob is None:
        return None
    if isinstance(dob, str):
        dob = datetime.date.fromisoformat(dob)
    today = datetime.date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


class UserProfileService:
    def __init__(
        self,
        uow_factory: Callable[[], Any],
        ledger_service: LedgerService,
        fi_service: FiService,
        document_service: DocumentService,
    ) -> None:
        self._uow_factory = uow_factory
        self._ledger = ledger_service
        self._fi = fi_service
        self._documents = document_service

    # ── Profile ──────────────────────────────────────────────────────────────

    async def get_profile(self, user_id: str) -> dict[str, Any]:
        async with self._uow_factory() as uow:
            profile = await uow.user_profiles.get(user_id)
        if profile is None:
            profile = {"id": user_id}
        await self._backfill_from_legacy_memories(user_id, profile)
        return profile

    async def get_preferred_model(self, user_id: str) -> str:
        """
        The model this user's conversations run on: always the pinned one.

        The name is kept because four call sites and a guard test reference it,
        but there is no longer a preference to read. It deliberately does NOT
        consult the stored `preferred_model` — doing so would leave every user
        who had already chosen Opus or Fable running (and being charged) on it
        forever, which is the opposite of pinning the cost.

        No longer touches the database at all, so the agent and FI routes lose a
        profile read per request.
        """
        return DEFAULT_MODEL

    async def update_identity(self, user_id: str, data: dict[str, Any]) -> None:
        fields: dict[str, Any] = {}
        for key in (
            "display_name",
            "employer",
            "employment_status",
            "employment_type",
            "residency_status",
            "ird_number",
        ):
            if key in data:
                fields[key] = data[key]
        if data.get("date_of_birth"):
            fields["date_of_birth"] = datetime.date.fromisoformat(data["date_of_birth"])
        if "dependents_count" in data:
            fields["dependents_count"] = int(data["dependents_count"])
        if not fields:
            return
        async with self._uow_factory() as uow:
            await uow.user_profiles.upsert(user_id, fields)
        await self._recompute_life_stage(user_id)

    async def _recompute_life_stage(self, user_id: str) -> None:
        async with self._uow_factory() as uow:
            profile = await uow.user_profiles.get(user_id)
            if profile is None:
                return
            life_stage = derive_life_stage(
                _age_from_dob(profile.get("date_of_birth")),
                profile.get("dependents_count") or 0,
                profile.get("employment_status"),
            )
            await uow.user_profiles.upsert(user_id, {"life_stage": life_stage})

    async def _backfill_from_legacy_memories(self, user_id: str, profile: dict[str, Any]) -> None:
        missing = {
            slug: column
            for slug, column in _LEGACY_MEMORY_TO_COLUMN.items()
            if profile.get(column) is None
        }
        updates: dict[str, Any] = {}
        for slug, column in missing.items():
            mem = await self._documents.get_memory(user_id, slug)
            if mem and mem.get("content"):
                updates[column] = mem["content"]
                profile[column] = mem["content"]
        if profile.get("risk_category") is None:
            mem = await self._documents.get_memory(user_id, "risk_appetite")
            if mem and mem.get("content") in ("conservative", "balanced", "aggressive"):
                updates["risk_category"] = mem["content"]
                profile["risk_category"] = mem["content"]
        if updates:
            async with self._uow_factory() as uow:
                await uow.user_profiles.upsert(user_id, updates)

    # ── Risk questionnaire ───────────────────────────────────────────────────

    async def submit_risk_questionnaire(
        self, user_id: str, answers_data: dict[str, Any]
    ) -> dict[str, Any]:
        answers = RiskQuestionnaireAnswers(
            time_horizon_years=int(answers_data["time_horizon_years"]),
            drawdown_reaction=answers_data["drawdown_reaction"],
            income_stability=answers_data["income_stability"],
            investment_experience=answers_data["investment_experience"],
            dependents_count=int(answers_data.get("dependents_count", 0)),
        )
        profile = risk_engine.compute(answers)
        async with self._uow_factory() as uow:
            await uow.user_profiles.upsert(
                user_id,
                {
                    "risk_score": profile.score,
                    "risk_category": profile.category,
                    "dependents_count": answers.dependents_count,
                },
            )
        await self._recompute_life_stage(user_id)
        return {
            "score": profile.score,
            "category": profile.category,
            "breakdown": profile.breakdown,
        }

    # ── Opening balances / income (reuse LedgerService, never reinvent it) ──

    async def _ensure_account(
        self, user_id: str, cache: dict[str, str], code: str, name: str, type_: AccountType
    ) -> str:
        if code in cache:
            return cache[code]
        new_id = await self._ledger.add_account(user_id, code, name, type_)
        cache[code] = new_id
        return new_id

    async def declare_opening_balances(
        self, user_id: str, balances: list[dict[str, Any]]
    ) -> list[str]:
        """balances: [{"code", "name", "type": "asset"|"liability", "amount"}]."""
        today = datetime.date.today().isoformat()
        cache = {a.code: a.id for a in await self._ledger.list_accounts(user_id)}
        entry_ids: list[str] = []

        for item in balances:
            amount = Decimal(str(item["amount"]))
            if amount == 0:
                continue
            acc_type = item["type"]
            if acc_type not in ("asset", "liability"):
                raise ValueError(f"Unsupported opening-balance account type: {acc_type}")

            acc_id = await self._ensure_account(
                user_id, cache, item["code"], item["name"], acc_type
            )
            equity_id = await self._ensure_account(
                user_id, cache, _OPENING_EQUITY_CODE, _OPENING_EQUITY_NAME, _OPENING_EQUITY_TYPE
            )
            if acc_type == "asset":
                debit_id, credit_id = acc_id, equity_id
            else:
                debit_id, credit_id = equity_id, acc_id

            postings = [
                {
                    "account_id": debit_id,
                    "direction": Direction.DEBIT,
                    "amount": amount,
                    "currency": "LKR",
                },
                {
                    "account_id": credit_id,
                    "direction": Direction.CREDIT,
                    "amount": amount,
                    "currency": "LKR",
                },
            ]
            entry_id = await self._ledger.add_entry(
                user_id, today, f"Opening balance: {item['name']}", "manual", postings
            )
            entry_ids.append(entry_id)
        return entry_ids

    async def declare_income(self, user_id: str, incomes: list[dict[str, Any]]) -> list[str]:
        """incomes: [{"code", "name", "amount", "deposit_account_code"?, "deposit_account_name"?}].

        Posts one representative monthly entry per income source so FI/cash-flow
        calculations have real data to work from immediately after onboarding.
        """
        today = datetime.date.today().isoformat()
        cache = {a.code: a.id for a in await self._ledger.list_accounts(user_id)}
        entry_ids: list[str] = []

        for item in incomes:
            amount = Decimal(str(item["amount"]))
            if amount == 0:
                continue
            income_id = await self._ensure_account(
                user_id, cache, item["code"], item["name"], "income"
            )
            deposit_code = item.get("deposit_account_code", _DEFAULT_DEPOSIT_CODE)
            deposit_name = item.get("deposit_account_name", _DEFAULT_DEPOSIT_NAME)
            deposit_id = await self._ensure_account(
                user_id, cache, deposit_code, deposit_name, "asset"
            )

            postings = [
                {
                    "account_id": deposit_id,
                    "direction": Direction.DEBIT,
                    "amount": amount,
                    "currency": "LKR",
                },
                {
                    "account_id": income_id,
                    "direction": Direction.CREDIT,
                    "amount": amount,
                    "currency": "LKR",
                },
            ]
            entry_id = await self._ledger.add_entry(
                user_id, today, f"Declared income: {item['name']}", "manual", postings
            )
            entry_ids.append(entry_id)
        return entry_ids
