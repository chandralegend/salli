"""
SQLAlchemy ORM models — the adapter layer only.
Domain models (Pydantic) live in domain/accounting/models.py.
These are the storage representations; mappers translate between them.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(UTC)


class Base(DeclarativeBase):
    pass


# ── Accounts ──────────────────────────────────────────────────────────────────


class AccountORM(Base):
    __tablename__ = "accounts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(20), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="LKR")
    parent_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("accounts.id"), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )

    __table_args__ = (
        UniqueConstraint("user_id", "code", name="uq_accounts_user_code"),
        CheckConstraint(
            "type IN ('asset','liability','equity','income','expense')",
            name="ck_accounts_type",
        ),
    )


# ── Journal Entries & Postings ─────────────────────────────────────────────────


class JournalEntryORM(Base):
    __tablename__ = "journal_entries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    entry_date: Mapped[str] = mapped_column(String(10), nullable=False)  # YYYY-MM-DD
    description: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str] = mapped_column(String(20), nullable=False)
    external_ref: Mapped[str | None] = mapped_column(String(200), nullable=True)
    reversed_by: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("journal_entries.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )

    postings: Mapped[list[PostingORM]] = relationship(
        "PostingORM", back_populates="entry", cascade="all, delete-orphan"
    )

    __table_args__ = (
        CheckConstraint(
            "source IN ('manual','statement','sms','system')",
            name="ck_journal_entries_source",
        ),
        Index("ix_journal_entries_user_date", "user_id", "entry_date"),
    )


class PostingORM(Base):
    __tablename__ = "postings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    entry_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("journal_entries.id", ondelete="CASCADE"), nullable=False
    )
    account_id: Mapped[str] = mapped_column(String(36), ForeignKey("accounts.id"), nullable=False)
    # +1 = DEBIT, -1 = CREDIT
    direction: Mapped[int] = mapped_column(Integer, nullable=False)
    # Transaction currency amount (minor units, e.g. cents)
    amount_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    # FX to base currency (LKR); stored as high-precision decimal
    fx_rate: Mapped[float] = mapped_column(Numeric(20, 8), nullable=False, default=1)
    fx_rate_source: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # Base-currency amount (minor units); DB constraint enforces balance
    base_amount_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)

    entry: Mapped[JournalEntryORM] = relationship("JournalEntryORM", back_populates="postings")

    __table_args__ = (
        CheckConstraint("direction IN (1, -1)", name="ck_postings_direction"),
        CheckConstraint("amount_minor > 0", name="ck_postings_amount_positive"),
        Index("ix_postings_entry", "entry_id"),
        Index("ix_postings_account", "account_id"),
    )


# ── Statement parsing ─────────────────────────────────────────────────────────


class StatementORM(Base):
    __tablename__ = "statements"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    storage_key: Mapped[str] = mapped_column(String(500), nullable=False)
    bank: Mapped[str | None] = mapped_column(String(100), nullable=True)
    period_start: Mapped[str | None] = mapped_column(String(10), nullable=True)
    period_end: Mapped[str | None] = mapped_column(String(10), nullable=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="pending")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )

    parsed_transactions: Mapped[list[ParsedTransactionORM]] = relationship(
        "ParsedTransactionORM", back_populates="statement", cascade="all, delete-orphan"
    )


class ParsedTransactionORM(Base):
    __tablename__ = "parsed_transactions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    statement_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("statements.id", ondelete="CASCADE"), nullable=False
    )
    raw: Mapped[str] = mapped_column(Text, nullable=False)
    extracted_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    confidence: Mapped[float | None] = mapped_column(Numeric(4, 3), nullable=True)
    dedup_key: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    dedup_status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    posted_entry_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("journal_entries.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )

    statement: Mapped[StatementORM] = relationship(
        "StatementORM", back_populates="parsed_transactions"
    )


# ── Tax computations ──────────────────────────────────────────────────────────


class TaxComputationORM(Base):
    __tablename__ = "tax_computations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    year: Mapped[str] = mapped_column(String(10), nullable=False)
    pack_version: Mapped[str] = mapped_column(String(20), nullable=False)
    inputs_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    result_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )

    __table_args__ = (Index("ix_tax_computations_user_year", "user_id", "year"),)


# ── Documents ─────────────────────────────────────────────────────────────────


class DocumentORM(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    kind: Mapped[str] = mapped_column(String(50), nullable=False)  # T10, AIT_CERT, etc.
    storage_key: Mapped[str] = mapped_column(String(500), nullable=False)
    year: Mapped[str | None] = mapped_column(String(10), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )


# ── Agent documents (document management + agent memory) ──────────────────────


class AgentDocumentORM(Base):
    __tablename__ = "agent_documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    storage_key: Mapped[str | None] = mapped_column(String(500), nullable=True)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False, default="text/plain")
    tags: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    # "user_upload" | "agent_created" | "agent_memory"
    source: Mapped[str] = mapped_column(String(30), nullable=False, default="agent_created")
    # "documents" | "memories" | "context"
    namespace: Mapped[str] = mapped_column(String(50), nullable=False, default="documents")
    # Named key for memories (unique per user+namespace)
    slug: Mapped[str | None] = mapped_column(String(200), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )

    __table_args__ = (
        UniqueConstraint("user_id", "namespace", "slug", name="uq_agent_docs_user_ns_slug"),
        Index("ix_agent_documents_user_id", "user_id"),
        Index("ix_agent_documents_namespace", "user_id", "namespace"),
    )


# ── Agent sessions (persistent conversation threads) ─────────────────────────


class AgentSessionORM(Base):
    __tablename__ = "agent_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String(36), nullable=False)
    thread_id: Mapped[str] = mapped_column(String(36), nullable=False)
    title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    last_active_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )

    __table_args__ = (
        UniqueConstraint("user_id", "thread_id", name="uq_agent_sessions_user_thread"),
        Index("ix_agent_sessions_user_active", "user_id", "last_active_at"),
    )


# ── Reminders ─────────────────────────────────────────────────────────────────


class ReminderORM(Base):
    __tablename__ = "reminders"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    due_date: Mapped[str] = mapped_column(String(10), nullable=False)
    kind: Mapped[str] = mapped_column(String(500), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
