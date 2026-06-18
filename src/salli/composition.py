"""
Composition root — the single place adapters are bound to ports.
Both the CLI (Phase 1) and FastAPI (Phase 2) wire up services here.
"""
from __future__ import annotations

from dataclasses import dataclass

from salli.adapters.db.session import make_session_factory
from salli.application.services.agent_service import AgentService
from salli.application.services.ledger_service import LedgerService
from salli.application.services.tax_service import TaxService
from salli.application.unit_of_work import UnitOfWork
from salli.config import Settings


@dataclass
class Services:
    ledger: LedgerService
    tax: TaxService
    agent: AgentService


def build_services(settings: Settings, checkpointer=None) -> Services:
    session_factory = make_session_factory(settings)

    def uow_factory() -> UnitOfWork:
        return UnitOfWork(session_factory)

    ledger = LedgerService(uow_factory)
    tax = TaxService(uow_factory)
    agent = AgentService(ledger, tax, checkpointer=checkpointer)

    return Services(ledger=ledger, tax=tax, agent=agent)
