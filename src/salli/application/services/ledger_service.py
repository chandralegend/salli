from __future__ import annotations

import uuid
from collections.abc import Callable
from decimal import Decimal
from typing import Any

from salli.domain.accounting import ledger as ledger_ops
from salli.domain.accounting.models import (
    Account,
    AccountType,
    JournalEntry,
    Posting,
    Source,
    StoredJournalEntry,
)


class LedgerService:
    def __init__(self, uow_factory: Callable[[], Any]) -> None:
        self._uow_factory = uow_factory

    async def add_account(
        self,
        user_id: str,
        code: str,
        name: str,
        type: AccountType,
        currency: str = "LKR",
        parent_id: str | None = None,
    ) -> str:
        account = Account(
            id=str(uuid.uuid4()),
            user_id=user_id,
            code=code,
            name=name,
            type=type,
            currency=currency,
            parent_id=parent_id,
        )
        async with self._uow_factory() as uow:
            return await uow.ledger.save_account(user_id, account)

    async def list_accounts(self, user_id: str) -> list[Account]:
        async with self._uow_factory() as uow:
            return await uow.ledger.get_accounts(user_id)

    async def add_entry(
        self,
        user_id: str,
        entry_date: str,
        description: str,
        source: Source,
        postings_data: list[dict[str, Any]],
    ) -> str:
        postings = [Posting(**p) for p in postings_data]
        # JournalEntry.__init__ runs must_balance validator — raises ValueError if unbalanced
        entry = JournalEntry(
            entry_date=entry_date,
            description=description,
            source=source,
            postings=postings,
        )
        async with self._uow_factory() as uow:
            return await uow.ledger.save_entry(user_id, entry)

    async def get_entries(
        self,
        user_id: str,
        from_date: str | None = None,
        to_date: str | None = None,
    ) -> list[StoredJournalEntry]:
        async with self._uow_factory() as uow:
            return await uow.ledger.get_entries(user_id, from_date, to_date)

    async def get_trial_balance(
        self,
        user_id: str,
        from_date: str | None = None,
        to_date: str | None = None,
    ) -> dict[str, Decimal]:
        async with self._uow_factory() as uow:
            entries: list[StoredJournalEntry] = await uow.ledger.get_entries(
                user_id, from_date, to_date
            )
        return ledger_ops.trial_balance(entries)

    async def get_income_statement(
        self,
        user_id: str,
        from_date: str,
        to_date: str,
        income_account_ids: set[str],
        expense_account_ids: set[str],
    ) -> Decimal:
        async with self._uow_factory() as uow:
            entries = await uow.ledger.get_entries(user_id, from_date, to_date)
        return ledger_ops.income_for_period(entries, income_account_ids, expense_account_ids)

    async def get_net_worth(
        self,
        user_id: str,
        asset_account_ids: set[str],
        liability_account_ids: set[str],
    ) -> Decimal:
        async with self._uow_factory() as uow:
            entries = await uow.ledger.get_entries(user_id)
        return ledger_ops.net_worth(entries, asset_account_ids, liability_account_ids)
