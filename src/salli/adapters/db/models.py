"""
SQLAlchemy ORM models — the adapter layer only.
Domain models (Pydantic) live in domain/accounting/models.py.
These are the storage representations; mappers translate between them.
"""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
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
    """A due-date task, or (via the nullable alert_type/source_* /severity columns
    added for the Alert/Notification generalization) a system-detected condition
    like a budget overspend or an expiring policy. Additive, not a schema
    rewrite — plain user-created reminders leave the new columns null."""

    __tablename__ = "reminders"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    due_date: Mapped[str] = mapped_column(String(10), nullable=False)
    kind: Mapped[str] = mapped_column(String(500), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    alert_type: Mapped[str | None] = mapped_column(String(40), nullable=True)
    source_domain: Mapped[str | None] = mapped_column(String(40), nullable=True)
    source_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    severity: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )

    __table_args__ = (
        Index("ix_reminders_user_alert_source", "user_id", "source_domain", "source_id"),
    )


# ── Billing: user profile, subscription, usage ───────────────────────────────


class UserProfileORM(Base):
    """Identity, fact-find, and billing linkage. `id` is the Supabase auth uid (JWT `sub`)."""

    __tablename__ = "user_profiles"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    display_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    paddle_customer_id: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Fact-find (Phase 1 onboarding redo) — all nullable: unanswered until the user
    # completes the corresponding step.
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    dependents_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    employment_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    residency_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    employer: Mapped[str | None] = mapped_column(String(200), nullable=True)
    employment_type: Mapped[str | None] = mapped_column(String(32), nullable=True)
    ird_number: Mapped[str | None] = mapped_column(String(32), nullable=True)
    risk_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    risk_category: Mapped[str | None] = mapped_column(String(16), nullable=True)
    life_stage: Mapped[str | None] = mapped_column(String(32), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )


class SubscriptionORM(Base):
    """One row per user. Absence of a row is treated as the free plan."""

    __tablename__ = "subscriptions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False)
    plan: Mapped[str] = mapped_column(String(20), nullable=False, default="free")
    # active | trialing | past_due | canceled
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    provider: Mapped[str] = mapped_column(String(20), nullable=False, default="paddle")
    provider_customer_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    provider_subscription_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    current_period_start: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    current_period_end: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    cancel_at_period_end: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )

    __table_args__ = (UniqueConstraint("user_id", name="uq_subscriptions_user"),)


class UsageCounterORM(Base):
    """Per-user monthly counter for a metered action. period = 'YYYY-MM' (UTC)."""

    __tablename__ = "usage_counters"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False)
    period: Mapped[str] = mapped_column(String(7), nullable=False)  # YYYY-MM
    # agent_messages | statement_uploads
    metric: Mapped[str] = mapped_column(String(40), nullable=False)
    count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )

    __table_args__ = (
        UniqueConstraint("user_id", "period", "metric", name="uq_usage_user_period_metric"),
        Index("ix_usage_user", "user_id"),
    )


# ── Financial Independence: goals, score snapshots, advisory reports ──────────


class GoalORM(Base):
    __tablename__ = "fi_goals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    # fi | retirement | home | emergency_fund | debt_free | wealth_growth | custom
    kind: Mapped[str] = mapped_column(String(40), nullable=False, default="custom")
    target_amount_minor: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    current_amount_minor: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    target_date: Mapped[str | None] = mapped_column(String(10), nullable=True)  # YYYY-MM-DD
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=2)  # 1 high … 3 low
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    extra: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )

    __table_args__ = (Index("ix_fi_goals_user_active", "user_id", "is_active"),)


class FiScoreORM(Base):
    """Snapshot of a computed FI score (history for trend lines)."""

    __tablename__ = "fi_scores"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    pack_version: Mapped[str] = mapped_column(String(20), nullable=False)
    inputs_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    result_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )

    __table_args__ = (Index("ix_fi_scores_user_date", "user_id", "created_at"),)


class FireStrategyORM(Base):
    """Versioned AI-generated FIRE strategy for a user."""

    __tablename__ = "fire_strategies"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    strategy: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )

    __table_args__ = (Index("ix_fire_strategies_user_version", "user_id", "version"),)


class AdvisoryReportORM(Base):
    """A Wealth Advisor run: summary + structured, actionable recommendations."""

    __tablename__ = "advisory_reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    trigger: Mapped[str] = mapped_column(
        String(20), nullable=False, default="manual"
    )  # manual | scheduled
    fi_score_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    # list of {id,title,rationale,category,action_type(none|reminder|journal_entry),
    #          action_params,status(pending|applied|dismissed)}
    recommendations: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )

    __table_args__ = (Index("ix_advisory_reports_user_date", "user_id", "created_at"),)


# ── Budget ────────────────────────────────────────────────────────────────────


class BudgetORM(Base):
    """One row per budget period. `lines` is a JSONB list of

    {account_id, limit_minor} — mirrors FireStrategyORM's JSONB sub-list convention
    rather than a separate join table, since a budget's category limits are always
    read/written together with their parent period.
    """

    __tablename__ = "budgets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    period_start: Mapped[str] = mapped_column(String(10), nullable=False)  # YYYY-MM-DD
    period_end: Mapped[str] = mapped_column(String(10), nullable=False)
    lines: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )

    __table_args__ = (Index("ix_budgets_user_period", "user_id", "period_start"),)


# ── Debt ──────────────────────────────────────────────────────────────────────


class DebtORM(Base):
    """A structured debt — principal, rate, and minimum payment for payoff planning."""

    __tablename__ = "debts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    principal_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    apr: Mapped[float] = mapped_column(Numeric(6, 4), nullable=False)  # e.g. 0.1850 = 18.5%
    minimum_payment_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )

    __table_args__ = (Index("ix_debts_user_active", "user_id", "is_active"),)


# ── Portfolio ─────────────────────────────────────────────────────────────────


class HoldingORM(Base):
    """A manually-declared investment holding — cost basis and current value are
    user-entered, never fetched from a live market-data feed."""

    __tablename__ = "holdings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    symbol: Mapped[str] = mapped_column(String(20), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    asset_class: Mapped[str] = mapped_column(String(40), nullable=False)
    cost_basis_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    current_value_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )

    __table_args__ = (Index("ix_holdings_user_active", "user_id", "is_active"),)


# ── Recurring subscription ────────────────────────────────────────────────────


class RecurringSubscriptionORM(Base):
    """A declared recurring-expense expectation, matched against posted ledger
    entries at query time — never a live bank/merchant integration. Distinct from
    the billing `SubscriptionORM` (Paddle plan/entitlement state for Salli itself);
    this table is user-declared personal-finance data.
    """

    __tablename__ = "recurring_subscriptions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    amount_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    frequency: Mapped[str] = mapped_column(String(20), nullable=False)
    next_due_date: Mapped[str] = mapped_column(String(10), nullable=False)  # YYYY-MM-DD
    account_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("accounts.id"), nullable=True
    )
    grace_days: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    amount_tolerance_pct: Mapped[float] = mapped_column(Numeric(5, 4), nullable=False, default=0.05)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )

    __table_args__ = (Index("ix_recurring_subscriptions_user_active", "user_id", "is_active"),)


# ── Insurance ─────────────────────────────────────────────────────────────────


class PolicyORM(Base):
    """A declared insurance policy — coverage/premium are user-entered, never
    fetched from an insurer's API."""

    __tablename__ = "policies"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    policy_type: Mapped[str] = mapped_column(String(20), nullable=False)
    provider: Mapped[str] = mapped_column(String(200), nullable=False)
    coverage_amount_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    premium_amount_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    premium_frequency: Mapped[str] = mapped_column(String(20), nullable=False)
    expiry_date: Mapped[str] = mapped_column(String(10), nullable=False)  # YYYY-MM-DD
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )

    __table_args__ = (Index("ix_policies_user_active", "user_id", "is_active"),)


class InsuranceTargetORM(Base):
    """A declared desired coverage amount per policy type — at most one per
    (user, policy_type), analogous to a budget category limit."""

    __tablename__ = "insurance_targets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    policy_type: Mapped[str] = mapped_column(String(20), nullable=False)
    target_amount_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )

    __table_args__ = (
        UniqueConstraint("user_id", "policy_type", name="uq_insurance_targets_user_type"),
    )
