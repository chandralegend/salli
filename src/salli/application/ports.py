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
    async def get_accounts(self, user_id: str) -> list[Any]:
        """Return Account list for the user."""
        ...

    @abstractmethod
    async def save_account(self, user_id: str, account: Any) -> str:
        """Persist an Account and return its ID."""
        ...


class TaxComputationRepository(ABC):
    @abstractmethod
    async def save(self, user_id: str, computation: Any) -> str:
        ...

    @abstractmethod
    async def get_latest(self, user_id: str, year: str) -> Any | None:
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
    async def download(self, key: str) -> bytes:
        ...


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
