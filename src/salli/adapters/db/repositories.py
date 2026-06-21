"""
SQLAlchemy repository implementations — concrete adapters for the port interfaces.
Translate between ORM models and domain models via mappers below.
"""

from __future__ import annotations

import hashlib
import json
import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from salli.adapters.db.models import (
    AccountORM,
    AdvisoryReportORM,
    AgentDocumentORM,
    AgentSessionORM,
    FiScoreORM,
    GoalORM,
    JournalEntryORM,
    ParsedTransactionORM,
    PostingORM,
    ReminderORM,
    StatementORM,
    SubscriptionORM,
    TaxComputationORM,
    UsageCounterORM,
    UserProfileORM,
)
from salli.application.ports import (
    AdvisoryRepository,
    AgentDocumentRepository,
    AgentSessionRepository,
    FiScoreRepository,
    GoalRepository,
    LedgerRepository,
    ReminderRepository,
    StatementRepository,
    SubscriptionRepository,
    TaxComputationRepository,
    UsageRepository,
    UserProfileRepository,
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

    async def get_entry_by_id(self, user_id: str, entry_id: str) -> StoredJournalEntry | None:
        stmt = (
            select(JournalEntryORM)
            .where(JournalEntryORM.id == entry_id, JournalEntryORM.user_id == user_id)
            .options(selectinload(JournalEntryORM.postings))
        )
        result = await self._session.execute(stmt)
        row = result.scalar_one_or_none()
        return _entry_from_orm(row) if row else None

    async def set_reversed_by(self, entry_id: str, reversing_id: str) -> None:
        stmt = select(JournalEntryORM).where(JournalEntryORM.id == entry_id)
        result = await self._session.execute(stmt)
        row = result.scalar_one_or_none()
        if row:
            row.reversed_by = reversing_id

    async def update_account(
        self, user_id: str, account_id: str, *, code: str, name: str, type: str, currency: str
    ) -> None:
        stmt = select(AccountORM).where(
            AccountORM.id == account_id, AccountORM.user_id == user_id
        )
        result = await self._session.execute(stmt)
        row = result.scalar_one_or_none()
        if row:
            row.code = code
            row.name = name
            row.type = type
            row.currency = currency

    async def deactivate_account(self, user_id: str, account_id: str) -> None:
        stmt = select(AccountORM).where(
            AccountORM.id == account_id, AccountORM.user_id == user_id
        )
        result = await self._session.execute(stmt)
        row = result.scalar_one_or_none()
        if row:
            row.is_active = False


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

    async def delete_reminder(self, user_id: str, reminder_id: str) -> None:
        stmt = select(ReminderORM).where(
            ReminderORM.id == reminder_id, ReminderORM.user_id == user_id
        )
        result = await self._session.execute(stmt)
        row = result.scalar_one_or_none()
        if row:
            await self._session.delete(row)


# ── Agent Documents ────────────────────────────────────────────────────────────


def _doc_to_dict(row: AgentDocumentORM) -> dict[str, Any]:
    return {
        "id": row.id,
        "user_id": row.user_id,
        "title": row.title,
        "content": row.content,
        "storage_key": row.storage_key,
        "mime_type": row.mime_type,
        "tags": row.tags or [],
        "source": row.source,
        "namespace": row.namespace,
        "slug": row.slug,
        "description": row.description,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


class SQLAgentDocumentRepository(AgentDocumentRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def save(self, user_id: str, doc: dict[str, Any]) -> str:
        doc_id = doc.get("id") or str(uuid.uuid4())
        now = datetime.now(UTC)
        row = AgentDocumentORM(
            id=doc_id,
            user_id=user_id,
            title=doc.get("title", "Untitled"),
            content=doc.get("content"),
            storage_key=doc.get("storage_key"),
            mime_type=doc.get("mime_type", "text/plain"),
            tags=doc.get("tags", []),
            source=doc.get("source", "agent_created"),
            namespace=doc.get("namespace", "documents"),
            slug=doc.get("slug"),
            description=doc.get("description"),
            created_at=now,
            updated_at=now,
        )
        self._session.add(row)
        return doc_id

    async def get(self, user_id: str, doc_id: str) -> dict[str, Any] | None:
        stmt = select(AgentDocumentORM).where(
            AgentDocumentORM.id == doc_id, AgentDocumentORM.user_id == user_id
        )
        result = await self._session.execute(stmt)
        row = result.scalar_one_or_none()
        return _doc_to_dict(row) if row else None

    async def update(self, user_id: str, doc_id: str, updates: dict[str, Any]) -> None:
        stmt = select(AgentDocumentORM).where(
            AgentDocumentORM.id == doc_id, AgentDocumentORM.user_id == user_id
        )
        result = await self._session.execute(stmt)
        row = result.scalar_one_or_none()
        if not row:
            return
        for field in ("title", "content", "storage_key", "mime_type", "tags", "description"):
            if field in updates:
                setattr(row, field, updates[field])
        row.updated_at = datetime.now(UTC)

    async def list(
        self,
        user_id: str,
        tags: list[str] | None = None,
        namespace: str | None = None,
        search: str | None = None,
    ) -> list[dict[str, Any]]:
        stmt = select(AgentDocumentORM).where(AgentDocumentORM.user_id == user_id)
        if namespace:
            stmt = stmt.where(AgentDocumentORM.namespace == namespace)
        if search:
            pattern = f"%{search}%"
            stmt = stmt.where(
                or_(
                    AgentDocumentORM.title.ilike(pattern),
                    AgentDocumentORM.content.ilike(pattern),
                )
            )
        if tags:
            for tag in tags:
                stmt = stmt.where(AgentDocumentORM.tags.contains([tag]))
        stmt = stmt.order_by(AgentDocumentORM.updated_at.desc())
        result = await self._session.execute(stmt)
        return [_doc_to_dict(r) for r in result.scalars().all()]

    async def delete(self, user_id: str, doc_id: str) -> None:
        stmt = select(AgentDocumentORM).where(
            AgentDocumentORM.id == doc_id, AgentDocumentORM.user_id == user_id
        )
        result = await self._session.execute(stmt)
        row = result.scalar_one_or_none()
        if row:
            await self._session.delete(row)

    async def get_by_slug(
        self, user_id: str, namespace: str, slug: str
    ) -> dict[str, Any] | None:
        stmt = select(AgentDocumentORM).where(
            AgentDocumentORM.user_id == user_id,
            AgentDocumentORM.namespace == namespace,
            AgentDocumentORM.slug == slug,
        )
        result = await self._session.execute(stmt)
        row = result.scalar_one_or_none()
        return _doc_to_dict(row) if row else None

    async def upsert_by_slug(
        self, user_id: str, namespace: str, slug: str, doc: dict[str, Any]
    ) -> str:
        existing = await self.get_by_slug(user_id, namespace, slug)
        if existing:
            updates = {k: v for k, v in doc.items() if k not in ("id", "user_id", "slug", "namespace")}
            await self.update(user_id, existing["id"], updates)
            return existing["id"]
        return await self.save(
            user_id,
            {**doc, "namespace": namespace, "slug": slug, "user_id": user_id},
        )


# ── Agent session repository ──────────────────────────────────────────────────


def _session_to_dict(row: AgentSessionORM) -> dict[str, Any]:
    return {
        "id": row.id,
        "user_id": row.user_id,
        "thread_id": row.thread_id,
        "title": row.title,
        "created_at": row.created_at.isoformat(),
        "last_active_at": row.last_active_at.isoformat(),
    }


class SQLAgentSessionRepository(AgentSessionRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._s = session

    async def upsert(self, user_id: str, thread_id: str) -> None:
        stmt = select(AgentSessionORM).where(
            AgentSessionORM.user_id == user_id,
            AgentSessionORM.thread_id == thread_id,
        )
        result = await self._s.execute(stmt)
        row = result.scalar_one_or_none()
        if row:
            row.last_active_at = datetime.now(UTC)
        else:
            self._s.add(AgentSessionORM(
                id=str(uuid.uuid4()),
                user_id=user_id,
                thread_id=thread_id,
                last_active_at=datetime.now(UTC),
            ))
        await self._s.flush()

    async def set_title(self, user_id: str, thread_id: str, title: str) -> None:
        stmt = select(AgentSessionORM).where(
            AgentSessionORM.user_id == user_id,
            AgentSessionORM.thread_id == thread_id,
        )
        result = await self._s.execute(stmt)
        row = result.scalar_one_or_none()
        if row and not row.title:
            row.title = title
            await self._s.flush()

    async def list(self, user_id: str, limit: int = 50) -> list[dict[str, Any]]:
        stmt = (
            select(AgentSessionORM)
            .where(AgentSessionORM.user_id == user_id)
            .order_by(AgentSessionORM.last_active_at.desc())
            .limit(limit)
        )
        result = await self._s.execute(stmt)
        return [_session_to_dict(r) for r in result.scalars().all()]

    async def get(self, user_id: str, thread_id: str) -> dict[str, Any] | None:
        stmt = select(AgentSessionORM).where(
            AgentSessionORM.user_id == user_id,
            AgentSessionORM.thread_id == thread_id,
        )
        result = await self._s.execute(stmt)
        row = result.scalar_one_or_none()
        return _session_to_dict(row) if row else None

    async def delete(self, user_id: str, thread_id: str) -> None:
        stmt = select(AgentSessionORM).where(
            AgentSessionORM.user_id == user_id,
            AgentSessionORM.thread_id == thread_id,
        )
        result = await self._s.execute(stmt)
        row = result.scalar_one_or_none()
        if row:
            await self._s.delete(row)


# ── Billing repositories ──────────────────────────────────────────────────────


def _subscription_to_dict(row: SubscriptionORM) -> dict[str, Any]:
    return {
        "id": row.id,
        "user_id": row.user_id,
        "plan": row.plan,
        "status": row.status,
        "provider": row.provider,
        "provider_customer_id": row.provider_customer_id,
        "provider_subscription_id": row.provider_subscription_id,
        "current_period_start": row.current_period_start.isoformat()
        if row.current_period_start else None,
        "current_period_end": row.current_period_end.isoformat()
        if row.current_period_end else None,
        "cancel_at_period_end": row.cancel_at_period_end,
    }


class SQLSubscriptionRepository(SubscriptionRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._s = session

    async def get(self, user_id: str) -> dict[str, Any] | None:
        result = await self._s.execute(
            select(SubscriptionORM).where(SubscriptionORM.user_id == user_id)
        )
        row = result.scalar_one_or_none()
        return _subscription_to_dict(row) if row else None

    async def upsert(self, user_id: str, fields: dict[str, Any]) -> None:
        result = await self._s.execute(
            select(SubscriptionORM).where(SubscriptionORM.user_id == user_id)
        )
        row = result.scalar_one_or_none()
        if row is None:
            row = SubscriptionORM(id=str(uuid.uuid4()), user_id=user_id)
            self._s.add(row)
        for k, v in fields.items():
            if hasattr(row, k):
                setattr(row, k, v)
        await self._s.flush()


class SQLUsageRepository(UsageRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._s = session

    async def _row(self, user_id: str, period: str, metric: str) -> UsageCounterORM | None:
        result = await self._s.execute(
            select(UsageCounterORM).where(
                UsageCounterORM.user_id == user_id,
                UsageCounterORM.period == period,
                UsageCounterORM.metric == metric,
            )
        )
        return result.scalar_one_or_none()

    async def get_count(self, user_id: str, period: str, metric: str) -> int:
        row = await self._row(user_id, period, metric)
        return row.count if row else 0

    async def increment(self, user_id: str, period: str, metric: str, by: int = 1) -> int:
        row = await self._row(user_id, period, metric)
        if row is None:
            row = UsageCounterORM(
                id=str(uuid.uuid4()), user_id=user_id, period=period, metric=metric, count=by
            )
            self._s.add(row)
            await self._s.flush()
            return by
        row.count += by
        await self._s.flush()
        return row.count

    async def get_counts(self, user_id: str, period: str) -> dict[str, int]:
        result = await self._s.execute(
            select(UsageCounterORM).where(
                UsageCounterORM.user_id == user_id,
                UsageCounterORM.period == period,
            )
        )
        return {r.metric: r.count for r in result.scalars().all()}


class SQLUserProfileRepository(UserProfileRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._s = session

    async def get(self, user_id: str) -> dict[str, Any] | None:
        result = await self._s.execute(
            select(UserProfileORM).where(UserProfileORM.id == user_id)
        )
        row = result.scalar_one_or_none()
        if not row:
            return None
        return {
            "id": row.id,
            "email": row.email,
            "display_name": row.display_name,
            "paddle_customer_id": row.paddle_customer_id,
        }

    async def upsert(self, user_id: str, fields: dict[str, Any]) -> None:
        result = await self._s.execute(
            select(UserProfileORM).where(UserProfileORM.id == user_id)
        )
        row = result.scalar_one_or_none()
        if row is None:
            row = UserProfileORM(id=user_id)
            self._s.add(row)
        for k, v in fields.items():
            if hasattr(row, k) and v is not None:
                setattr(row, k, v)
        await self._s.flush()


# ── Financial Independence repositories ──────────────────────────────────────


def _goal_to_dict(r: GoalORM) -> dict[str, Any]:
    return {
        "id": r.id,
        "user_id": r.user_id,
        "name": r.name,
        "kind": r.kind,
        "target_amount_minor": r.target_amount_minor,
        "current_amount_minor": r.current_amount_minor,
        "target_date": r.target_date,
        "priority": r.priority,
        "is_active": r.is_active,
        "extra": r.extra or {},
        "created_at": r.created_at.isoformat(),
        "updated_at": r.updated_at.isoformat(),
    }


class SQLGoalRepository(GoalRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._s = session

    async def save(self, user_id: str, goal: dict[str, Any]) -> str:
        gid = goal.get("id") or str(uuid.uuid4())
        self._s.add(GoalORM(
            id=gid,
            user_id=user_id,
            name=goal["name"],
            kind=goal.get("kind", "custom"),
            target_amount_minor=int(goal.get("target_amount_minor", 0)),
            current_amount_minor=int(goal.get("current_amount_minor", 0)),
            target_date=goal.get("target_date"),
            priority=int(goal.get("priority", 2)),
            is_active=goal.get("is_active", True),
            extra=goal.get("extra", {}),
        ))
        await self._s.flush()
        return gid

    async def get(self, user_id: str, goal_id: str) -> dict[str, Any] | None:
        r = (await self._s.execute(
            select(GoalORM).where(GoalORM.id == goal_id, GoalORM.user_id == user_id)
        )).scalar_one_or_none()
        return _goal_to_dict(r) if r else None

    async def list(self, user_id: str, active_only: bool = True) -> list[dict[str, Any]]:
        stmt = select(GoalORM).where(GoalORM.user_id == user_id)
        if active_only:
            stmt = stmt.where(GoalORM.is_active == True)  # noqa: E712
        stmt = stmt.order_by(GoalORM.priority, GoalORM.created_at)
        return [_goal_to_dict(r) for r in (await self._s.execute(stmt)).scalars().all()]

    async def update(self, user_id: str, goal_id: str, updates: dict[str, Any]) -> None:
        r = (await self._s.execute(
            select(GoalORM).where(GoalORM.id == goal_id, GoalORM.user_id == user_id)
        )).scalar_one_or_none()
        if not r:
            return
        for k in ("name", "kind", "target_amount_minor", "current_amount_minor",
                  "target_date", "priority", "is_active", "extra"):
            if k in updates and updates[k] is not None:
                setattr(r, k, updates[k])
        await self._s.flush()

    async def delete(self, user_id: str, goal_id: str) -> None:
        r = (await self._s.execute(
            select(GoalORM).where(GoalORM.id == goal_id, GoalORM.user_id == user_id)
        )).scalar_one_or_none()
        if r:
            await self._s.delete(r)


class SQLFiScoreRepository(FiScoreRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._s = session

    async def save(self, user_id: str, score: dict[str, Any]) -> str:
        sid = str(uuid.uuid4())
        self._s.add(FiScoreORM(
            id=sid,
            user_id=user_id,
            score=score["overall_score"],
            pack_version=score["pack_version"],
            inputs_hash=score.get("inputs_hash", ""),
            result_json=score,
        ))
        await self._s.flush()
        return sid

    async def get_latest(self, user_id: str) -> dict[str, Any] | None:
        r = (await self._s.execute(
            select(FiScoreORM).where(FiScoreORM.user_id == user_id)
            .order_by(FiScoreORM.created_at.desc()).limit(1)
        )).scalar_one_or_none()
        return r.result_json if r else None

    async def history(self, user_id: str, limit: int = 90) -> list[dict[str, Any]]:
        rows = (await self._s.execute(
            select(FiScoreORM).where(FiScoreORM.user_id == user_id)
            .order_by(FiScoreORM.created_at.desc()).limit(limit)
        )).scalars().all()
        return [{"score": float(r.score), "created_at": r.created_at.isoformat()} for r in rows]


def _report_to_dict(r: AdvisoryReportORM) -> dict[str, Any]:
    return {
        "id": r.id,
        "user_id": r.user_id,
        "trigger": r.trigger,
        "fi_score_id": r.fi_score_id,
        "summary": r.summary,
        "recommendations": r.recommendations or [],
        "created_at": r.created_at.isoformat(),
    }


class SQLAdvisoryRepository(AdvisoryRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._s = session

    async def save(self, user_id: str, report: dict[str, Any]) -> str:
        rid = str(uuid.uuid4())
        self._s.add(AdvisoryReportORM(
            id=rid,
            user_id=user_id,
            trigger=report.get("trigger", "manual"),
            fi_score_id=report.get("fi_score_id"),
            summary=report.get("summary", ""),
            recommendations=report.get("recommendations", []),
        ))
        await self._s.flush()
        return rid

    async def get(self, user_id: str, report_id: str) -> dict[str, Any] | None:
        r = (await self._s.execute(
            select(AdvisoryReportORM).where(
                AdvisoryReportORM.id == report_id, AdvisoryReportORM.user_id == user_id
            )
        )).scalar_one_or_none()
        return _report_to_dict(r) if r else None

    async def get_latest(self, user_id: str) -> dict[str, Any] | None:
        r = (await self._s.execute(
            select(AdvisoryReportORM).where(AdvisoryReportORM.user_id == user_id)
            .order_by(AdvisoryReportORM.created_at.desc()).limit(1)
        )).scalar_one_or_none()
        return _report_to_dict(r) if r else None

    async def list(self, user_id: str, limit: int = 30) -> list[dict[str, Any]]:
        rows = (await self._s.execute(
            select(AdvisoryReportORM).where(AdvisoryReportORM.user_id == user_id)
            .order_by(AdvisoryReportORM.created_at.desc()).limit(limit)
        )).scalars().all()
        return [_report_to_dict(r) for r in rows]

    async def update_recommendations(self, user_id: str, report_id: str, recommendations: list) -> None:
        r = (await self._s.execute(
            select(AdvisoryReportORM).where(
                AdvisoryReportORM.id == report_id, AdvisoryReportORM.user_id == user_id
            )
        )).scalar_one_or_none()
        if r:
            r.recommendations = recommendations
            await self._s.flush()

    async def ran_today(self, user_id: str, day: str) -> bool:
        rows = (await self._s.execute(
            select(AdvisoryReportORM.created_at).where(AdvisoryReportORM.user_id == user_id)
            .order_by(AdvisoryReportORM.created_at.desc()).limit(1)
        )).scalar_one_or_none()
        return rows is not None and rows.isoformat().startswith(day)
