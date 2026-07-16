from __future__ import annotations

import uuid
from collections.abc import Callable
from decimal import Decimal
from typing import Any

from salli.domain.accounting import ledger as ledger_ops
from salli.domain.accounting.models import (
    Account,
    AccountType,
    Direction,
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

    async def get_account(self, user_id: str, account_id: str) -> Account | None:
        async with self._uow_factory() as uow:
            return await uow.ledger.get_account(user_id, account_id)

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

    async def update_account(
        self,
        user_id: str,
        account_id: str,
        code: str,
        name: str,
        type: str,
        currency: str,
    ) -> None:
        async with self._uow_factory() as uow:
            await uow.ledger.update_account(
                user_id, account_id, code=code, name=name, type=type, currency=currency
            )

    async def deactivate_account(self, user_id: str, account_id: str) -> None:
        async with self._uow_factory() as uow:
            await uow.ledger.deactivate_account(user_id, account_id)

    async def reactivate_account(self, user_id: str, account_id: str) -> None:
        async with self._uow_factory() as uow:
            await uow.ledger.reactivate_account(user_id, account_id)

    async def get_account_overview(
        self,
        user_id: str,
        account_id: str,
        from_date: str | None = None,
        to_date: str | None = None,
    ) -> dict[str, Any] | None:
        """Account detail + full-history running balance, sliced to [from_date, to_date]
        for display — the running balance itself is always computed over the account's
        entire history so figures stay historically accurate even under a date filter."""
        async with self._uow_factory() as uow:
            account = await uow.ledger.get_account(user_id, account_id)
            if account is None:
                return None
            all_entries = await uow.ledger.get_entries(user_id)

        history = ledger_ops.account_running_balance(all_entries, account_id)
        current_balance = history[-1][1] if history else Decimal(0)

        transactions = [
            {
                "entry_id": entry.id,
                "entry_date": entry.entry_date,
                "description": entry.description,
                "source": entry.source,
                "external_ref": entry.external_ref,
                "running_balance": str(balance),
            }
            for entry, balance in history
            if (from_date is None or entry.entry_date >= from_date)
            and (to_date is None or entry.entry_date <= to_date)
        ]

        return {
            "account": {
                "id": account.id,
                "code": account.code,
                "name": account.name,
                "type": account.type,
                "currency": account.currency,
                "parent_id": account.parent_id,
                "is_active": account.is_active,
            },
            "current_balance": str(current_balance),
            "transactions": transactions,
        }

    async def reverse_entry(self, user_id: str, entry_id: str) -> str:
        """Create a reversing journal entry and mark the original as reversed."""
        async with self._uow_factory() as uow:
            original = await uow.ledger.get_entry_by_id(user_id, entry_id)
            if original is None:
                raise ValueError(f"Entry {entry_id} not found")
            if original.reversed_by:
                raise ValueError("Entry is already reversed")

            reversed_postings = [
                Posting(
                    account_id=p.account_id,
                    direction=Direction(-p.direction.value),
                    amount=p.amount,
                    currency=p.currency,
                    fx_rate=p.fx_rate,
                    fx_rate_source=p.fx_rate_source,
                )
                for p in original.postings
            ]
            reversing = JournalEntry(
                entry_date=original.entry_date,
                description=f"REVERSAL: {original.description}",
                source="manual",
                postings=reversed_postings,
            )
            reversing_id = await uow.ledger.save_entry(user_id, reversing)
            await uow.ledger.set_reversed_by(entry_id, reversing_id)
        return reversing_id
