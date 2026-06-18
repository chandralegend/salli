"""
Unit of work — wraps a single DB transaction.
Both the CLI and the API use this to ensure all writes in a use-case commit together.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from salli.adapters.db.repositories import SQLLedgerRepository, SQLStatementRepository, SQLTaxComputationRepository
from salli.application.ports import LedgerRepository, StatementRepository, TaxComputationRepository

if TYPE_CHECKING:
    pass


class UnitOfWork:
    ledger: LedgerRepository
    tax_computations: TaxComputationRepository
    statements: StatementRepository

    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        self._factory = session_factory
        self._session: AsyncSession | None = None

    async def __aenter__(self) -> UnitOfWork:
        self._session = self._factory()
        self.ledger = SQLLedgerRepository(self._session)
        self.tax_computations = SQLTaxComputationRepository(self._session)
        self.statements = SQLStatementRepository(self._session)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        assert self._session is not None
        if exc_type is None:
            await self._session.commit()
        else:
            await self._session.rollback()
        await self._session.close()

    async def commit(self) -> None:
        assert self._session is not None
        await self._session.commit()
