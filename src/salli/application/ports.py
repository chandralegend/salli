"""
Port interfaces — abstract contracts the domain depends on.
Adapters (in salli/adapters/) implement these; the domain never imports adapters.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime
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
        self,
        user_id: str,
        account_id: str,
        *,
        code: str,
        name: str,
        type: str,
        currency: str,
        tax_role: str | None = None,
    ) -> None:
        """Update mutable fields of an existing account."""
        ...

    @abstractmethod
    async def deactivate_account(self, user_id: str, account_id: str) -> None:
        """Soft-delete an account by setting is_active=False."""
        ...

    @abstractmethod
    async def ensure_system_tags(self, user_id: str, tags: list[tuple[str, str, str]]) -> None:
        """Create the closed `need` tag axis for a user. Idempotent."""
        ...

    @abstractmethod
    async def list_tags(self, user_id: str, kind: str | None = None) -> list[Any]:
        """This user's tags, optionally filtered to one axis."""
        ...

    @abstractmethod
    async def set_posting_tags(
        self, user_id: str, posting_id: str, tags: dict[str, str]
    ) -> None:
        """Replace a posting's tags. Tags are mutable; the posting is not."""
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

    @abstractmethod
    async def list_computation_keys(self) -> list[tuple[str, str]]:
        """Every (user_id, year) that has at least one stored computation.

        Admin-only. Used to re-run stored computations after an engine fix, so
        users are not left looking at a number the engine no longer agrees with.
        """
        ...


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

    @abstractmethod
    async def upsert_alert(
        self,
        user_id: str,
        alert_type: str,
        source_domain: str,
        source_id: str,
        kind: str,
        due_date: str,
        severity: str,
    ) -> str:
        """Create or refresh a system-detected alert, keyed on
        (user_id, source_domain, source_id, alert_type) — re-running a sync
        against the same still-active condition updates the existing row
        (kind/due_date/severity, and resets status to "pending" if it had been
        dismissed) rather than creating a duplicate."""
        ...


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
    async def list_statements(self, user_id: str, limit: int = 50) -> list[Any]:
        """Every statement this user has uploaded, newest first.

        The rows were always persisted; nothing exposed them, so the mobile app
        told users a statement history "isn't tracked by the server yet".
        """
        ...

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


class TranscriptionPort(ABC):
    """Speech-to-text for a single recorded voice message (mobile Voice Mode)."""

    @abstractmethod
    async def transcribe(self, audio_bytes: bytes, *, filename: str, mime_type: str) -> str:
        """Transcribe spoken audio to text."""
        ...


class AgentSessionRepository(ABC):
    @abstractmethod
    async def upsert(self, user_id: str, thread_id: str, persona: str = "scrooge") -> None:
        """Create or touch (update last_active_at) a session. `persona` is only
        used on creation — an existing session keeps its original persona."""
        ...

    @abstractmethod
    async def set_title(self, user_id: str, thread_id: str, title: str) -> None:
        """Set the generated title for a session."""
        ...

    @abstractmethod
    async def list(
        self, user_id: str, limit: int = 50, persona: str = "scrooge"
    ) -> list[dict[str, Any]]:
        """Return this persona's sessions sorted by last_active_at desc."""
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

    @abstractmethod
    async def set_flag(self, user_id: str, field: str, value: bool) -> None:
        """Set a boolean flag, including to False (which `upsert` cannot do)."""
        ...

    @abstractmethod
    async def list_daily_briefing_optins(self) -> list[dict[str, Any]]:
        """Users who opted in to the scheduled daily advisor run."""
        ...


class LlmCredentialRepository(ABC):
    """Per-user provider API keys (BYOK), stored encrypted.

    Deliberately dumb: it moves ciphertext in and out and never encrypts,
    decrypts, or validates. All crypto lives in LlmCredentialService so there
    is exactly one place a plaintext key can exist.
    """

    @abstractmethod
    async def list_for_user(self, user_id: str) -> list[dict[str, Any]]:
        """All stored credentials for a user, ciphertext included."""
        ...

    @abstractmethod
    async def get(self, user_id: str, provider: str) -> dict[str, Any] | None:
        """One credential, or None."""
        ...

    @abstractmethod
    async def upsert(
        self,
        user_id: str,
        provider: str,
        *,
        ciphertext: str,
        last4: str,
        validated_at: Any,
        key_version: int,
    ) -> None:
        """Create or replace this user's credential for the provider.

        `key_version` records which encryption key sealed the ciphertext, so a
        rotated-away key is a loud failure rather than a silent wrong-key
        decrypt attempt.
        """
        ...

    @abstractmethod
    async def delete(self, user_id: str, provider: str) -> bool:
        """Remove it. Returns False when there was nothing to remove."""
        ...


class BillingChangeRejected(RuntimeError):
    """The provider refused a subscription change for a business reason.

    A declined card, a subscription locked mid-renewal, a scheduled change already
    pending. The caller's state is unchanged — the provider applied nothing. Subclasses
    RuntimeError so routers that already catch RuntimeError keep working.
    """

    def __init__(self, code: str, detail: str) -> None:
        self.code = code
        self.detail = detail
        super().__init__(f"{code}: {detail}" if code else detail)


class BillingChangePending(RuntimeError):
    """A subscription change is in flight and its outcome is unknown.

    Raised on timeout: the provider may well have charged the card and applied the
    change before we gave up waiting. Callers must NOT retry — there is no idempotency
    key for a subscription update, so a retry would prorate a second time. Wait for the
    provider's webhook instead.
    """


class BillingPort(ABC):
    """Payment-provider boundary (Paddle today). Adapters live in adapters/billing/."""

    @abstractmethod
    async def create_checkout(
        self,
        user_id: str,
        email: str | None,
        plan_key: str,
        cycle: str,
        customer_id: str | None,
    ) -> dict[str, Any]:
        """Return data the client needs to open checkout (price id, customer, txn).

        `cycle` is "month" or "year" and selects which price to charge.
        """
        ...

    @abstractmethod
    async def get_portal_url(self, customer_id: str) -> str:
        """Return a customer-portal URL for managing/cancelling the subscription."""
        ...

    @abstractmethod
    async def preview_subscription_change(
        self, subscription_id: str, plan_key: str, cycle: str
    ) -> dict[str, Any]:
        """Cost of moving an existing subscription to `plan_key`/`cycle`, charging nothing.

        Returns provider-neutral keys, all money as int minor units:
        `immediate_charge_minor`, `credit_applied_minor`, `currency`, `result`
        ("charge" | "credit" | "none"), `result_amount_minor`, `recurring_amount_minor`,
        `next_billed_at`. `result` is a label with an unsigned amount rather than a signed
        number because a credit goes to provider account balance, not back to the card —
        the distinction has to survive to the UI.
        """
        ...

    @abstractmethod
    async def change_subscription(
        self, subscription_id: str, plan_key: str, cycle: str
    ) -> dict[str, Any]:
        """Move an existing subscription to `plan_key`/`cycle`, prorated and charged now.

        Returns the same shape as the subscription branch of `verify_and_parse_webhook`
        (minus `user_id`), so the caller can persist it through the same path a webhook
        takes. Raises BillingChangeRejected if the provider refuses, BillingChangePending
        if the outcome is unknown.
        """
        ...

    @abstractmethod
    async def find_subscription_id(self, customer_id: str) -> str | None:
        """The customer's live subscription ID, or None if they have none.

        Recovery path for a row that has a customer ID but no subscription ID — without
        it such a user would be routed to a fresh checkout and end up billed twice.
        """
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

    @abstractmethod
    def cycle_for_price_id(self, price_id: str) -> str | None:
        """Map a provider price ID to "month" or "year", or None if unmapped."""
        ...


# ── Financial Independence ───────────────────────────────────────────────────


class GoalRepository(ABC):
    """Goals and their claims on real accounts.

    Allocation methods live here rather than on their own repository because a
    claim has no meaning apart from the goal that makes it, and both are written
    inside the same unit of work.
    """

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


    @abstractmethod
    async def list_allocations(self, user_id: str, goal_id: str | None = None) -> list[Any]:
        """Every claim this user's goals make on their accounts."""
        ...

    @abstractmethod
    async def set_allocation(
        self, user_id: str, goal_id: str, account_id: str, allocated_minor: int
    ) -> None:
        """Create, update, or (with zero) clear one goal's claim on one account."""
        ...

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

    @abstractmethod
    async def list(self, user_id: str, limit: int = 30) -> list[dict[str, Any]]: ...

    @abstractmethod
    async def update_recommendations(
        self, user_id: str, report_id: str, recommendations: list[Any]
    ) -> None: ...

    @abstractmethod
    async def ran_today(self, user_id: str, day: str) -> bool: ...


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


# ── Insurance ──────────────────────────────────────────────────────────────────


class PolicyRepository(ABC):
    @abstractmethod
    async def save(self, user_id: str, policy: dict[str, Any]) -> str: ...

    @abstractmethod
    async def get(self, user_id: str, policy_id: str) -> dict[str, Any] | None: ...

    @abstractmethod
    async def list(self, user_id: str, active_only: bool = True) -> list[dict[str, Any]]: ...

    @abstractmethod
    async def update(self, user_id: str, policy_id: str, updates: dict[str, Any]) -> None: ...

    @abstractmethod
    async def delete(self, user_id: str, policy_id: str) -> None: ...


class InsuranceTargetRepository(ABC):
    @abstractmethod
    async def upsert(self, user_id: str, policy_type: str, target_amount_minor: int) -> str: ...

    @abstractmethod
    async def list(self, user_id: str) -> list[dict[str, Any]]: ...

    @abstractmethod
    async def delete(self, user_id: str, policy_type: str) -> None: ...


# ── Audit log ──────────────────────────────────────────────────────────────────


class AuditLogRepository(ABC):
    @abstractmethod
    async def log(
        self, user_id: str, action: str, params: dict[str, Any], decision: str
    ) -> str: ...

    @abstractmethod
    async def list(self, user_id: str, limit: int = 100) -> list[dict[str, Any]]: ...


# ── Bug reports ────────────────────────────────────────────────────────────────


class BugReportRepository(ABC):
    @abstractmethod
    async def save(self, user_id: str, report: dict[str, Any]) -> str: ...

    @abstractmethod
    async def get(self, user_id: str, report_id: str) -> dict[str, Any] | None: ...

    @abstractmethod
    async def list(self, user_id: str, limit: int = 50) -> list[dict[str, Any]]: ...

    @abstractmethod
    async def update(self, user_id: str, report_id: str, updates: dict[str, Any]) -> None: ...

    @abstractmethod
    async def delete(self, user_id: str, report_id: str) -> None: ...

    @abstractmethod
    async def count_since(self, user_id: str, since: datetime) -> int:
        """Reports this user filed at or after `since` — the rate-limit window."""
        ...


class IssueTrackerPort(ABC):
    """
    An external issue tracker a bug report is best-effort mirrored into.

    Every method may raise. BugReportService treats failure as non-fatal: the
    report is already durably stored in Salli's own database before any of this
    is called, so a tracker outage must never cost us a user's report.
    """

    @abstractmethod
    async def create_issue(
        self,
        *,
        summary: str,
        description_adf: dict[str, Any],
        labels: list[str],
        priority_name: str | None,
    ) -> dict[str, Any]:
        """Create an issue. Returns {"key": "SAL-123", "url": "https://…/SAL-123"}."""
        ...

    @abstractmethod
    async def attach_file(
        self, issue_key: str, filename: str, content: bytes, mime_type: str
    ) -> None: ...


# ── Data portability ───────────────────────────────────────────────────────────


class DataPortabilityRepository(ABC):
    @abstractmethod
    async def delete_all(self, user_id: str) -> dict[str, int]:
        """Permanently delete every row belonging to this user across every
        user-scoped table. Returns {table_name: rows_deleted}. Irreversible."""
        ...


# ── MCP OAuth ────────────────────────────────────────────────────────────────


class OAuthClientRepository(ABC):
    @abstractmethod
    async def register(self, client_name: str | None, redirect_uris: list[str]) -> dict[str, Any]:
        """Dynamic Client Registration (RFC 7591). Returns the new client's record."""
        ...

    @abstractmethod
    async def get(self, client_id: str) -> dict[str, Any] | None: ...


class OAuthTokenRepository(ABC):
    @abstractmethod
    async def save_authorization_code(
        self,
        code: str,
        client_id: str,
        user_id: str,
        redirect_uri: str,
        code_challenge: str,
        scope: str,
        resource: str | None,
        expires_at: datetime,
    ) -> None: ...

    @abstractmethod
    async def get_authorization_code(self, code: str) -> dict[str, Any] | None:
        """Look up without consuming. None if missing/expired. Callers must
        call delete_authorization_code() only after validation succeeds, so a
        failed PKCE/client check doesn't burn a code a legitimate retry needs."""
        ...

    @abstractmethod
    async def delete_authorization_code(self, code: str) -> None:
        """Marks a code used — call only once the exchange has succeeded."""
        ...

    @abstractmethod
    async def save_access_token(
        self,
        token_hash: str,
        client_id: str,
        user_id: str,
        scope: str,
        resource: str | None,
        expires_at: datetime,
    ) -> str:
        """Returns the new access token row's id (FK target for its refresh token)."""
        ...

    @abstractmethod
    async def save_refresh_token(
        self,
        token_hash: str,
        access_token_id: str,
        client_id: str,
        user_id: str,
        scope: str,
        resource: str | None,
        expires_at: datetime,
    ) -> None: ...

    @abstractmethod
    async def get_access_token(self, token_hash: str) -> dict[str, Any] | None:
        """None if missing, expired, or revoked."""
        ...

    @abstractmethod
    async def get_refresh_token(self, token_hash: str) -> dict[str, Any] | None:
        """None if missing, expired, or revoked."""
        ...

    @abstractmethod
    async def revoke_access_token(self, token_id: str, user_id: str) -> bool:
        """Revokes only if the token belongs to user_id. Returns whether it revoked anything."""
        ...

    @abstractmethod
    async def revoke_refresh_token(self, token_hash: str) -> None: ...

    @abstractmethod
    async def list_active_connections(self, user_id: str) -> list[dict[str, Any]]:
        """Active (non-revoked, non-expired) client connections for a user,
        one row per access token, joined with the client's display name."""
        ...
