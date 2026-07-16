"""
Port interfaces — abstract contracts the domain depends on.
Adapters (in salli/adapters/) implement these; the domain never imports adapters.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from decimal import Decimal
from typing import Any


class LedgerRepository(ABC):
    @abstractmethod
    async def save_entry(self, user_id: str, entry: Any) -> str:
        """Persist a JournalEntry and return its generated ID."""
        ...

    @abstractmethod
    async def get_entries(
        self,
        user_id: str,
        from_date: str | None = None,
        to_date: str | None = None,
    ) -> list[Any]:
        """Return StoredJournalEntry list, optionally filtered by date range."""
        ...

    @abstractmethod
    async def get_entry_by_id(self, user_id: str, entry_id: str) -> Any | None:
        """Return a single StoredJournalEntry by ID, or None."""
        ...

    @abstractmethod
    async def set_reversed_by(self, entry_id: str, reversing_id: str) -> None:
        """Mark an entry as reversed by another entry."""
        ...

    @abstractmethod
    async def get_accounts(self, user_id: str) -> list[Any]:
        """Return Account list for the user."""
        ...

    @abstractmethod
    async def get_account(self, user_id: str, account_id: str) -> Any | None:
        """Return a single Account by ID (active or inactive), or None."""
        ...

    @abstractmethod
    async def save_account(self, user_id: str, account: Any) -> str:
        """Persist an Account and return its ID."""
        ...

    @abstractmethod
    async def update_account(
        self, user_id: str, account_id: str, *, code: str, name: str, type: str, currency: str
    ) -> None:
        """Update mutable fields of an existing account."""
        ...

    @abstractmethod
    async def deactivate_account(self, user_id: str, account_id: str) -> None:
        """Soft-delete an account by setting is_active=False."""
        ...

    @abstractmethod
    async def reactivate_account(self, user_id: str, account_id: str) -> None:
        """Reverse a soft-delete by setting is_active=True."""
        ...


class TaxComputationRepository(ABC):
    @abstractmethod
    async def save(self, user_id: str, computation: Any) -> str: ...

    @abstractmethod
    async def get_latest(self, user_id: str, year: str) -> Any | None: ...


class ReminderRepository(ABC):
    @abstractmethod
    async def list_reminders(self, user_id: str, status: str | None = None) -> list[Any]: ...

    @abstractmethod
    async def create_reminder(
        self, user_id: str, reminder_id: str, kind: str, due_date: str
    ) -> None: ...

    @abstractmethod
    async def mark_done(self, user_id: str, reminder_id: str) -> None: ...

    @abstractmethod
    async def delete_reminder(self, user_id: str, reminder_id: str) -> None: ...


class StatementRepository(ABC):
    @abstractmethod
    async def save_statement(
        self,
        user_id: str,
        statement_id: str,
        bank: str,
        period_start: str,
        period_end: str,
        transactions: list[Any],
        storage_key: str = "",
    ) -> None: ...

    @abstractmethod
    async def get_all_pending(self, user_id: str) -> list[Any]: ...

    @abstractmethod
    async def get_pending(self, user_id: str, statement_id: str) -> list[Any]: ...

    @abstractmethod
    async def get_by_ids(self, user_id: str, ids: list[str]) -> list[Any]: ...

    @abstractmethod
    async def mark_posted(self, transaction_id: str, entry_id: str) -> None: ...

    @abstractmethod
    async def get_statement(self, user_id: str, statement_id: str) -> dict[str, Any] | None:
        """Return a single statement's metadata (bank, period, storage key), or None."""
        ...


class LLMPort(ABC):
    """
    Single gateway to the LLM — tiering, retries, and usage metering live here.
    The domain never calls Anthropic directly.
    """

    @abstractmethod
    async def extract_structured(
        self,
        prompt: str,
        schema: dict[str, Any],
        *,
        model_tier: str = "fast",
    ) -> dict[str, Any]:
        """Run structured extraction; returns validated JSON matching schema."""
        ...

    @abstractmethod
    async def stream_agent(
        self,
        thread_id: str,
        user_message: str,
    ):
        """Stream agent tokens; yields (event_type, payload) tuples."""
        ...


class StoragePort(ABC):
    @abstractmethod
    async def upload(self, user_id: str, key: str, data: bytes) -> str:
        """Upload and return the storage URL."""
        ...

    @abstractmethod
    async def download(self, key: str) -> bytes: ...


class FxRatePort(ABC):
    @abstractmethod
    async def get_buying_rate(self, currency: str, date: str) -> Decimal:
        """Return the CBSL buying rate for the given currency on the given date."""
        ...


class KnowledgeBasePort(ABC):
    @abstractmethod
    async def search(self, query: str, *, top_k: int = 5) -> list[dict[str, Any]]:
        """Retrieve relevant chunks from the tax knowledge base with citations."""
        ...


class AgentSessionRepository(ABC):
    @abstractmethod
    async def upsert(self, user_id: str, thread_id: str) -> None:
        """Create or touch (update last_active_at) a session."""
        ...

    @abstractmethod
    async def set_title(self, user_id: str, thread_id: str, title: str) -> None:
        """Set the generated title for a session."""
        ...

    @abstractmethod
    async def list(self, user_id: str, limit: int = 50) -> list[dict[str, Any]]:
        """Return sessions sorted by last_active_at desc."""
        ...

    @abstractmethod
    async def get(self, user_id: str, thread_id: str) -> dict[str, Any] | None:
        """Return a single session or None."""
        ...

    @abstractmethod
    async def delete(self, user_id: str, thread_id: str) -> None:
        """Hard-delete a session record."""
        ...


class AgentDocumentRepository(ABC):
    @abstractmethod
    async def save(self, user_id: str, doc: dict[str, Any]) -> str:
        """Persist an agent document and return its ID."""
        ...

    @abstractmethod
    async def get(self, user_id: str, doc_id: str) -> dict[str, Any] | None:
        """Return a document by ID, or None if not found/not owned by user."""
        ...

    @abstractmethod
    async def update(self, user_id: str, doc_id: str, updates: dict[str, Any]) -> None:
        """Update mutable fields of an existing document."""
        ...

    @abstractmethod
    async def list(
        self,
        user_id: str,
        tags: list[str] | None = None,
        namespace: str | None = None,
        search: str | None = None,
    ) -> list[dict[str, Any]]:
        """Return documents for the user, optionally filtered."""
        ...

    @abstractmethod
    async def delete(self, user_id: str, doc_id: str) -> None:
        """Hard-delete a document."""
        ...

    @abstractmethod
    async def get_by_slug(self, user_id: str, namespace: str, slug: str) -> dict[str, Any] | None:
        """Return a document by its user+namespace+slug key."""
        ...

    @abstractmethod
    async def upsert_by_slug(
        self, user_id: str, namespace: str, slug: str, doc: dict[str, Any]
    ) -> str:
        """Insert or update a document keyed by user+namespace+slug. Returns ID."""
        ...


# ── Billing ──────────────────────────────────────────────────────────────────


class SubscriptionRepository(ABC):
    @abstractmethod
    async def get(self, user_id: str) -> dict[str, Any] | None:
        """Return the user's subscription row, or None (treated as free)."""
        ...

    @abstractmethod
    async def upsert(self, user_id: str, fields: dict[str, Any]) -> None:
        """Create or update the user's subscription row."""
        ...

    @abstractmethod
    async def list_active_paid(self) -> list[dict[str, Any]]:
        """Active subscriptions on a paid plan (for scheduled jobs)."""
        ...


class UsageRepository(ABC):
    @abstractmethod
    async def get_count(self, user_id: str, period: str, metric: str) -> int:
        """Current count for (user, month, metric); 0 if no row."""
        ...

    @abstractmethod
    async def increment(self, user_id: str, period: str, metric: str, by: int = 1) -> int:
        """Atomically add to the counter (creating the row) and return the new value."""
        ...

    @abstractmethod
    async def get_counts(self, user_id: str, period: str) -> dict[str, int]:
        """All metric counts for the user in the period, keyed by metric."""
        ...


class UserProfileRepository(ABC):
    @abstractmethod
    async def get(self, user_id: str) -> dict[str, Any] | None: ...

    @abstractmethod
    async def upsert(self, user_id: str, fields: dict[str, Any]) -> None: ...


class BillingPort(ABC):
    """Payment-provider boundary (Paddle today). Adapters live in adapters/billing/."""

    @abstractmethod
    async def create_checkout(
        self, user_id: str, email: str | None, plan_key: str, customer_id: str | None
    ) -> dict[str, Any]:
        """Return data the client needs to open checkout (price id, customer, txn)."""
        ...

    @abstractmethod
    async def get_portal_url(self, customer_id: str) -> str:
        """Return a customer-portal URL for managing/cancelling the subscription."""
        ...

    @abstractmethod
    def verify_and_parse_webhook(
        self, raw_body: bytes, signature: str | None
    ) -> dict[str, Any] | None:
        """Verify the webhook signature and return a normalized event, or None if invalid."""
        ...

    @abstractmethod
    def plan_for_price_id(self, price_id: str) -> str:
        """Map a provider price ID to a plan key (falls back to 'free')."""
        ...


# ── Financial Independence ───────────────────────────────────────────────────


class GoalRepository(ABC):
    @abstractmethod
    async def save(self, user_id: str, goal: dict[str, Any]) -> str: ...

    @abstractmethod
    async def get(self, user_id: str, goal_id: str) -> dict[str, Any] | None: ...

    @abstractmethod
    async def list(self, user_id: str, active_only: bool = True) -> list[dict[str, Any]]: ...

    @abstractmethod
    async def update(self, user_id: str, goal_id: str, updates: dict[str, Any]) -> None: ...

    @abstractmethod
    async def delete(self, user_id: str, goal_id: str) -> None: ...


class FiScoreRepository(ABC):
    @abstractmethod
    async def save(self, user_id: str, score: dict[str, Any]) -> str: ...

    @abstractmethod
    async def get_latest(self, user_id: str) -> dict[str, Any] | None: ...

    @abstractmethod
    async def history(self, user_id: str, limit: int = 90) -> list[dict[str, Any]]: ...


class AdvisoryRepository(ABC):
    @abstractmethod
    async def save(self, user_id: str, report: dict[str, Any]) -> str: ...

    @abstractmethod
    async def get(self, user_id: str, report_id: str) -> dict[str, Any] | None: ...

    @abstractmethod
    async def get_latest(self, user_id: str) -> dict[str, Any] | None: ...


class FireStrategyRepository(ABC):
    @abstractmethod
    async def get_latest(self, user_id: str) -> dict[str, Any] | None: ...

    @abstractmethod
    async def save(self, user_id: str, strategy: dict[str, Any]) -> int:
        """Persist a new strategy version and return the version number."""
        ...

    @abstractmethod
    async def get_history(self, user_id: str) -> list[dict[str, Any]]: ...


# ── Budget ────────────────────────────────────────────────────────────────────


class BudgetRepository(ABC):
    @abstractmethod
    async def save(self, user_id: str, budget: dict[str, Any]) -> str: ...

    @abstractmethod
    async def get(self, user_id: str, budget_id: str) -> dict[str, Any] | None: ...

    @abstractmethod
    async def list(self, user_id: str) -> list[dict[str, Any]]: ...

    @abstractmethod
    async def update(self, user_id: str, budget_id: str, updates: dict[str, Any]) -> None: ...

    @abstractmethod
    async def delete(self, user_id: str, budget_id: str) -> None: ...


# ── Debt ──────────────────────────────────────────────────────────────────────


class DebtRepository(ABC):
    @abstractmethod
    async def save(self, user_id: str, debt: dict[str, Any]) -> str: ...

    @abstractmethod
    async def get(self, user_id: str, debt_id: str) -> dict[str, Any] | None: ...

    @abstractmethod
    async def list(self, user_id: str, active_only: bool = True) -> list[dict[str, Any]]: ...

    @abstractmethod
    async def update(self, user_id: str, debt_id: str, updates: dict[str, Any]) -> None: ...

    @abstractmethod
    async def delete(self, user_id: str, debt_id: str) -> None: ...


# ── Portfolio ─────────────────────────────────────────────────────────────────


class PortfolioRepository(ABC):
    @abstractmethod
    async def save(self, user_id: str, holding: dict[str, Any]) -> str: ...

    @abstractmethod
    async def get(self, user_id: str, holding_id: str) -> dict[str, Any] | None: ...

    @abstractmethod
    async def list(self, user_id: str, active_only: bool = True) -> list[dict[str, Any]]: ...

    @abstractmethod
    async def update(self, user_id: str, holding_id: str, updates: dict[str, Any]) -> None: ...

    @abstractmethod
    async def delete(self, user_id: str, holding_id: str) -> None: ...


# ── Recurring subscription ────────────────────────────────────────────────────


class RecurringSubscriptionRepository(ABC):
    @abstractmethod
    async def save(self, user_id: str, subscription: dict[str, Any]) -> str: ...

    @abstractmethod
    async def get(self, user_id: str, subscription_id: str) -> dict[str, Any] | None: ...

    @abstractmethod
    async def list(self, user_id: str, active_only: bool = True) -> list[dict[str, Any]]: ...

    @abstractmethod
    async def update(self, user_id: str, subscription_id: str, updates: dict[str, Any]) -> None: ...

    @abstractmethod
    async def delete(self, user_id: str, subscription_id: str) -> None: ...
