"""
API test fixtures.

Uses httpx.AsyncClient with the FastAPI test transport so no real DB or LLM
is needed. All services are replaced with async mocks.
"""

from __future__ import annotations

from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

import pytest
import pytest_asyncio
from fastapi import HTTPException, Request, status
from httpx import ASGITransport, AsyncClient

from salli.domain.accounting.models import Direction


@pytest.fixture
def mock_services():
    svc = MagicMock()
    svc.ledger = AsyncMock()
    # tax.list_packs is sync (reads in-memory registry); others are async
    svc.tax = AsyncMock()
    svc.tax.list_packs = MagicMock()
    svc.agent = AsyncMock()
    return svc


def _fake_current_user(request: Request) -> str:
    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return auth.removeprefix("Bearer ").strip()


def _fake_current_email(request: Request) -> str | None:
    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return None


@pytest.fixture
def app(mock_services):
    from salli.interfaces.api.deps import get_current_email, get_current_user, get_services
    from salli.interfaces.api.main import create_app

    application = create_app()
    application.dependency_overrides[get_services] = lambda: mock_services
    application.dependency_overrides[get_current_user] = _fake_current_user
    application.dependency_overrides[get_current_email] = _fake_current_email
    return application


@pytest_asyncio.fixture
async def client(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


AUTH = {"Authorization": "Bearer test-user-1"}


def make_account(id: str = "acc-1", code: str = "1000", name: str = "Cash"):
    a = MagicMock()
    a.id = id
    a.code = code
    a.name = name
    a.type = "asset"
    a.currency = "LKR"
    a.parent_id = None
    a.is_active = True
    return a


def make_entry():
    e = MagicMock()
    e.id = "entry-1"
    e.entry_date = "2025-01-15"
    e.description = "Salary"
    e.source = "manual"
    e.external_ref = None
    p = MagicMock()
    p.account_id = "acc-1"
    p.direction = Direction.DEBIT
    p.amount = Decimal("100000")
    p.currency = "LKR"
    p.fx_rate = Decimal("1")
    e.postings = [p]
    return e
