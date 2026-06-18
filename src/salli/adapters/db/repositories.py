"""
SQLAlchemy repository implementations — concrete adapters for the port interfaces.
Translate between ORM models and domain models via mappers below.
"""

from __future__ import annotations

import hashlib
import json
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from salli.adapters.db.models import (
    AccountORM,
    JournalEntryORM,
    ParsedTransactionORM,
    PostingORM,
    ReminderORM,
    StatementORM,
    TaxComputationORM,
)
from salli.application.ports import (
    LedgerRepository,
    ReminderRepository,
    StatementRepository,
    TaxComputationRepository,
)
from salli.domain.accounting.models import (
    Account,
    Direction,
    JournalEntry,
    Posting,
    StoredJournalEntry,
)
from salli.domain.tax.models import TaxComputation

# ── Mappers ───────────────────────────────────────────────────────────────────

_MINOR_FACTOR = 100  # LKR has 2 decimal places


def _posting_to_orm(p: Posting, entry_id: str) -> PostingORM:
    # base_amount_minor is the unsigned FX-converted amount in minor units.
    # The trigger multiplies by `direction` to get the signed contribution, so
    # storing p.base_signed here would double-sign credits and break the check.
    return PostingORM(
        entry_id=entry_id,
        account_id=p.account_id,
        direction=p.direction.value,
        amount_minor=int(p.amount * _MINOR_FACTOR),
        currency=p.currency,
        fx_rate=float(p.fx_rate),
        fx_rate_source=p.fx_rate_source,
        base_amount_minor=int(p.amount * p.fx_rate * _MINOR_FACTOR),
    )


def _posting_from_orm(row: PostingORM) -> Posting:
    return Posting(
        account_id=row.account_id,
        direction=Direction(row.direction),
        amount=Decimal(row.amount_minor) / _MINOR_FACTOR,
        currency=row.currency,
        fx_rate=Decimal(str(row.fx_rate)),
        fx_rate_source=row.fx_rate_source,
    )


def _entry_from_orm(row: JournalEntryORM) -> StoredJournalEntry:
    return StoredJournalEntry(
        id=row.id,
        user_id=row.user_id,
        entry_date=row.entry_date,
        description=row.description,
        source=row.source,  # type: ignore[arg-type]
        external_ref=row.external_ref,
        reversed_by=row.reversed_by,
        postings=[_posting_from_orm(p) for p in row.postings],
    )


def _account_from_orm(row: AccountORM) -> Account:
    return Account(
        id=row.id,
        user_id=row.user_id,
        code=row.code,
        name=row.name,
        type=row.type,  # type: ignore[arg-type]
        currency=row.currency,
        parent_id=row.parent_id,
        is_active=row.is_active,
    )


# ── LedgerRepository ─────────────────────────────────────────────────────────


class SQLLedgerRepository(LedgerRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def save_entry(self, user_id: str, entry: JournalEntry) -> str:
        import uuid

        entry_id = str(uuid.uuid4())
        orm_entry = JournalEntryORM(
            id=entry_id,
            user_id=user_id,
            entry_date=entry.entry_date,
            description=entry.description,
            source=entry.source,
            external_ref=entry.external_ref,
        )
        orm_entry.postings = [_posting_to_orm(p, entry_id) for p in entry.postings]
        self._session.add(orm_entry)
        return entry_id

    async def get_entries(
        self,
        user_id: str,
        from_date: str | None = None,
        to_date: str | None = None,
    ) -> list[StoredJournalEntry]:
        stmt = (
            select(JournalEntryORM)
            .where(JournalEntryORM.user_id == user_id)
            .options(selectinload(JournalEntryORM.postings))
            .order_by(JournalEntryORM.entry_date, JournalEntryORM.created_at)
        )
        if from_date:
            stmt = stmt.where(JournalEntryORM.entry_date >= from_date)
        if to_date:
            stmt = stmt.where(JournalEntryORM.entry_date <= to_date)

        result = await self._session.execute(stmt)
        return [_entry_from_orm(row) for row in result.scalars().all()]

    async def get_accounts(self, user_id: str) -> list[Account]:
        stmt = (
            select(AccountORM)
            .where(AccountORM.user_id == user_id, AccountORM.is_active == True)  # noqa: E712
            .order_by(AccountORM.code)
        )
        result = await self._session.execute(stmt)
        return [_account_from_orm(row) for row in result.scalars().all()]

    async def save_account(self, user_id: str, account: Account) -> str:
        import uuid

        account_id = account.id or str(uuid.uuid4())
        orm = AccountORM(
            id=account_id,
            user_id=user_id,
            code=account.code,
            name=account.name,
            type=account.type,
            currency=account.currency,
            parent_id=account.parent_id,
            is_active=account.is_active,
        )
        self._session.add(orm)
        return account_id


# ── TaxComputationRepository ──────────────────────────────────────────────────


class SQLTaxComputationRepository(TaxComputationRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _serialize(self, computation: TaxComputation) -> dict[str, Any]:
        import dataclasses

        return json.loads(json.dumps(dataclasses.asdict(computation), default=str))

    async def save(self, user_id: str, computation: TaxComputation) -> str:
        import uuid

        result_dict = self._serialize(computation)
        inputs_hash = hashlib.sha256(
            json.dumps(
                {
                    "gross": str(computation.gross_income),
                    "relief": str(computation.personal_relief_applied),
                },
                sort_keys=True,
            ).encode()
        ).hexdigest()

        orm = TaxComputationORM(
            id=str(uuid.uuid4()),
            user_id=user_id,
            year=computation.pack_year,
            pack_version=computation.pack_version,
            inputs_hash=inputs_hash,
            result_json=result_dict,
        )
        self._session.add(orm)
        return orm.id

    async def get_latest(self, user_id: str, year: str) -> TaxComputation | None:
        stmt = (
            select(TaxComputationORM)
            .where(
                TaxComputationORM.user_id == user_id,
                TaxComputationORM.year == year,
            )
            .order_by(TaxComputationORM.created_at.desc())
            .limit(1)
        )
        result = await self._session.execute(stmt)
        row = result.scalar_one_or_none()
        if row is None:
            return None
        # Deserialize back — used only for display/reporting, not recomputation.
        return row.result_json  # type: ignore[return-value]


# ── StatementRepository ───────────────────────────────────────────────────────


class SQLStatementRepository(StatementRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def save_statement(
        self,
        user_id: str,
        statement_id: str,
        bank: str,
        period_start: str,
        period_end: str,
        transactions: list[Any],
        storage_key: str = "",
    ) -> None:
        import uuid as _uuid

        orm = StatementORM(
            id=statement_id,
            user_id=user_id,
            storage_key=storage_key,
            bank=bank,
            period_start=period_start,
            period_end=period_end,
            status="pending",
        )
        self._session.add(orm)

        for txn in transactions:
            raw = txn.raw
            pt = ParsedTransactionORM(
                id=str(_uuid.uuid4()),
                statement_id=statement_id,
                raw=f"{raw.date}|{raw.description}|{raw.amount}|{raw.credit_flag}",
                extracted_json={
                    "date": raw.date,
                    "description": raw.description,
                    "amount": str(raw.amount),
                    "credit_flag": raw.credit_flag,
                    "bank_ref": raw.bank_ref,
                    "debit_account_id": txn.debit_account_id,
                    "credit_account_id": txn.credit_account_id,
                    "category": txn.category,
                    "currency": raw.currency,
                },
                confidence=txn.confidence,
                dedup_key=txn.dedup_key or None,
                dedup_status=txn.dedup_status,
            )
            self._session.add(pt)

    async def get_all_pending(self, user_id: str) -> list[Any]:
        stmt = (
            select(ParsedTransactionORM)
            .join(StatementORM)
            .where(
                StatementORM.user_id == user_id,
                ParsedTransactionORM.posted_entry_id.is_(None),
            )
            .order_by(ParsedTransactionORM.statement_id)
        )
        result = await self._session.execute(stmt)
        return [_orm_to_parsed(r) for r in result.scalars().all()]

    async def get_pending(self, user_id: str, statement_id: str) -> list[Any]:

        stmt = (
            select(ParsedTransactionORM)
            .join(StatementORM)
            .where(
                StatementORM.user_id == user_id,
                ParsedTransactionORM.statement_id == statement_id,
                ParsedTransactionORM.posted_entry_id.is_(None),
            )
        )
        result = await self._session.execute(stmt)
        rows = result.scalars().all()
        return [_orm_to_parsed(r) for r in rows]

    async def get_by_ids(self, user_id: str, ids: list[str]) -> list[Any]:
        stmt = (
            select(ParsedTransactionORM)
            .join(StatementORM)
            .where(
                StatementORM.user_id == user_id,
                ParsedTransactionORM.id.in_(ids),
            )
        )
        result = await self._session.execute(stmt)
        return [_orm_to_parsed(r) for r in result.scalars().all()]

    async def mark_posted(self, transaction_id: str, entry_id: str) -> None:
        stmt = select(ParsedTransactionORM).where(ParsedTransactionORM.id == transaction_id)
        result = await self._session.execute(stmt)
        row = result.scalar_one_or_none()
        if row:
            row.posted_entry_id = entry_id
            row.dedup_status = "posted"


def _orm_to_parsed(row: ParsedTransactionORM) -> Any:
    from decimal import Decimal

    from salli.domain.parsing.models import ParsedTransaction, RawRow

    j = row.extracted_json
    raw = RawRow(
        date=j["date"],
        description=j["description"],
        amount=Decimal(str(j["amount"])),
        credit_flag=j["credit_flag"],
        bank_ref=j.get("bank_ref", ""),
        currency=j.get("currency", "LKR"),
    )
    return ParsedTransaction(
        raw=raw,
        debit_account_id=j.get("debit_account_id", ""),
        credit_account_id=j.get("credit_account_id", ""),
        category=j.get("category", ""),
        confidence=float(row.confidence or 0.5),
        dedup_key=row.dedup_key or "",
        dedup_status=row.dedup_status,
        id=row.id,
    )


# ── ReminderRepository ────────────────────────────────────────────────────────


class SQLReminderRepository(ReminderRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_reminders(self, user_id: str, status: str | None = None) -> list[Any]:
        stmt = select(ReminderORM).where(ReminderORM.user_id == user_id)
        if status:
            stmt = stmt.where(ReminderORM.status == status)
        stmt = stmt.order_by(ReminderORM.due_date)
        result = await self._session.execute(stmt)
        return [
            {
                "id": r.id,
                "kind": r.kind,
                "due_date": r.due_date,
                "status": r.status,
            }
            for r in result.scalars().all()
        ]

    async def create_reminder(
        self, user_id: str, reminder_id: str, kind: str, due_date: str
    ) -> None:
        self._session.add(
            ReminderORM(
                id=reminder_id,
                user_id=user_id,
                kind=kind,
                due_date=due_date,
                status="pending",
            )
        )

    async def mark_done(self, user_id: str, reminder_id: str) -> None:
        stmt = select(ReminderORM).where(
            ReminderORM.id == reminder_id, ReminderORM.user_id == user_id
        )
        result = await self._session.execute(stmt)
        row = result.scalar_one_or_none()
        if row:
            row.status = "done"
