"""
Composition root — the single place adapters are bound to ports.
Both the CLI (Phase 1) and FastAPI (Phase 2) wire up services here.
"""

from __future__ import annotations

from dataclasses import dataclass

from salli.adapters.db.session import make_session_factory
from salli.adapters.fx.cbsl import CBSLFxRateAdapter
from salli.application.ports import StoragePort
from salli.application.services.agent_service import AgentService
from salli.application.services.billing_service import BillingService
from salli.application.services.document_service import DocumentService
from salli.application.services.fi_service import FiService
from salli.application.services.ledger_service import LedgerService
from salli.application.services.parsing_service import ParsingService
from salli.application.services.reminder_service import ReminderService
from salli.application.services.tax_service import TaxService
from salli.application.unit_of_work import UnitOfWork
from salli.config import Settings


@dataclass
class Services:
    ledger: LedgerService
    tax: TaxService
    agent: AgentService
    parsing: ParsingService
    reminders: ReminderService
    fx: CBSLFxRateAdapter
    storage: StoragePort
    documents: DocumentService
    billing: BillingService
    fi: FiService


def build_services(settings: Settings, checkpointer=None) -> Services:
    import os

    # LangChain reads API keys directly from os.environ; pydantic-settings
    # loads .env into Settings fields but doesn't populate the process env.
    if settings.anthropic_api_key:
        os.environ.setdefault("ANTHROPIC_API_KEY", settings.anthropic_api_key)
    if settings.tavily_api_key:
        os.environ.setdefault("TAVILY_API_KEY", settings.tavily_api_key)

    session_factory = make_session_factory(settings)

    def uow_factory() -> UnitOfWork:
        return UnitOfWork(session_factory)

    storage = _build_storage(settings)

    ledger = LedgerService(uow_factory)
    tax = TaxService(uow_factory)
    documents = DocumentService(uow_factory, storage)
    agent = AgentService(ledger, tax, documents, checkpointer=checkpointer, uow_factory=uow_factory)
    parsing = ParsingService(uow_factory, storage)
    reminders = ReminderService(uow_factory)
    fx = CBSLFxRateAdapter()
    billing = BillingService(uow_factory, billing_port=_build_billing(settings))
    fi = FiService(uow_factory)

    return Services(
        ledger=ledger,
        tax=tax,
        agent=agent,
        parsing=parsing,
        reminders=reminders,
        fx=fx,
        storage=storage,
        documents=documents,
        billing=billing,
        fi=fi,
    )


def _build_billing(settings: Settings):
    """Return a Paddle adapter when configured, else None (entitlements/metering still work)."""
    if not settings.paddle_api_key:
        return None
    from salli.adapters.billing.paddle import PaddleBillingAdapter

    return PaddleBillingAdapter(
        api_key=settings.paddle_api_key,
        webhook_secret=settings.paddle_webhook_secret,
        environment=settings.paddle_environment,
        price_map={
            "plus": settings.paddle_price_plus,
            "pro": settings.paddle_price_pro,
        },
    )


def _build_storage(settings: Settings) -> StoragePort:
    if settings.supabase_url and settings.supabase_service_role_key:
        from salli.adapters.storage.supabase import SupabaseStorageAdapter

        return SupabaseStorageAdapter(settings.supabase_url, settings.supabase_service_role_key)
    from salli.adapters.storage.local import LocalStorageAdapter

    return LocalStorageAdapter()
