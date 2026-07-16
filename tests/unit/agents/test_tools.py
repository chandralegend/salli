"""Unit tests for agent tools — verify shape and policy invariants."""

from __future__ import annotations

import uuid
from contextlib import asynccontextmanager
from decimal import Decimal

import pytest

from salli.application.services.ledger_service import LedgerService
from salli.application.services.tax_service import TaxService
from salli.domain.accounting.models import Account, Direction, Posting, StoredJournalEntry
from salli.domain.agents.tools import make_tools

# ── Fake repos (same pattern as service tests) ────────────────────────────────


class FakeLedgerRepo:
    def __init__(self, entries=None, accounts=None):
        self._entries = list(entries or [])
        self._accounts = list(accounts or [])

    async def save_account(self, user_id, account):
        self._accounts.append(account)
        return account.id

    async def get_accounts(self, user_id):
        return [a for a in self._accounts if a.user_id == user_id]

    async def save_entry(self, user_id, entry):
        return str(uuid.uuid4())

    async def get_entries(self, user_id, from_date=None, to_date=None):
        result = [e for e in self._entries if e.user_id == user_id]
        if from_date:
            result = [e for e in result if e.entry_date >= from_date]
        if to_date:
            result = [e for e in result if e.entry_date <= to_date]
        return result


class FakeTaxComputationRepo:
    def __init__(self):
        self._store = {}

    async def save(self, user_id, computation):
        self._store[(user_id, computation.pack_year)] = computation
        return str(uuid.uuid4())

    async def get_latest(self, user_id, year):
        return self._store.get((user_id, year))


class FakeUoW:
    def __init__(self, ledger_repo, tax_repo):
        self.ledger = ledger_repo
        self.tax_computations = tax_repo

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_):
        pass


def _make_services_with_income(income: Decimal = Decimal("3_000_000")):
    salary_acc = Account(
        id=str(uuid.uuid4()),
        user_id="u1",
        code="4001",
        name="Employment Income",
        type="income",
    )
    entry = StoredJournalEntry(
        id=str(uuid.uuid4()),
        user_id="u1",
        entry_date="2025-04-01",
        description="test",
        source="manual",
        postings=[
            Posting(account_id="bank", direction=Direction.DEBIT, amount=income, currency="LKR"),
            Posting(
                account_id=salary_acc.id, direction=Direction.CREDIT, amount=income, currency="LKR"
            ),
        ],
    )
    ledger_repo = FakeLedgerRepo(entries=[entry], accounts=[salary_acc])
    tax_repo = FakeTaxComputationRepo()

    @asynccontextmanager
    async def uow_factory():
        yield FakeUoW(ledger_repo, tax_repo)

    ledger_svc = LedgerService(uow_factory)
    tax_svc = TaxService(uow_factory)
    return ledger_svc, tax_svc


# ── Tests ──────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_accounts_returns_list():
    from salli.domain.agents.tools import set_current_user

    set_current_user("u1")
    ledger_svc, tax_svc = _make_services_with_income()
    tools = make_tools(ledger_svc, tax_svc)
    get_accounts = next(t for t in tools if t.name == "get_accounts")

    result = await get_accounts.ainvoke({})
    assert "accounts" in result
    assert len(result["accounts"]) == 1
    assert result["accounts"][0]["type"] == "income"


@pytest.mark.asyncio
async def test_get_trial_balance_keys():
    ledger_svc, tax_svc = _make_services_with_income()
    tools = make_tools(ledger_svc, tax_svc)
    get_tb = next(t for t in tools if t.name == "get_trial_balance")

    result = await get_tb.ainvoke({"user_id": "u1"})
    assert "trial_balance" in result
    assert "net" in result


@pytest.mark.asyncio
async def test_get_trial_balance_net_is_zero():
    ledger_svc, tax_svc = _make_services_with_income()
    tools = make_tools(ledger_svc, tax_svc)
    get_tb = next(t for t in tools if t.name == "get_trial_balance")

    result = await get_tb.ainvoke({"user_id": "u1"})
    assert Decimal(result["net"]) == Decimal(0)


@pytest.mark.asyncio
async def test_get_tax_computation_keys():
    ledger_svc, tax_svc = _make_services_with_income()
    tools = make_tools(ledger_svc, tax_svc)
    get_tax = next(t for t in tools if t.name == "get_tax_computation")

    result = await get_tax.ainvoke({"year": "2025/26", "user_id": "u1"})
    for key in (
        "year",
        "pack_version",
        "gross_income",
        "taxable_income",
        "tax_payable",
        "band_workings",
    ):
        assert key in result, f"Missing key: {key}"


@pytest.mark.asyncio
async def test_get_tax_computation_all_values_strings():
    """Tool must return string representations of Decimal values (LLM-safe)."""
    ledger_svc, tax_svc = _make_services_with_income()
    tools = make_tools(ledger_svc, tax_svc)
    get_tax = next(t for t in tools if t.name == "get_tax_computation")

    result = await get_tax.ainvoke({"year": "2025/26", "user_id": "u1"})
    # All monetary values should be strings, not Decimal (JSON-safe)
    for key in ("gross_income", "taxable_income", "tax_payable", "tax_before_credits"):
        assert isinstance(result[key], str), f"{key} should be str, got {type(result[key])}"


@pytest.mark.asyncio
async def test_get_tax_computation_below_relief():
    """Income below relief → tax_payable should be '0'."""
    ledger_svc, tax_svc = _make_services_with_income(income=Decimal("1_000_000"))
    tools = make_tools(ledger_svc, tax_svc)
    get_tax = next(t for t in tools if t.name == "get_tax_computation")

    result = await get_tax.ainvoke({"year": "2025/26", "user_id": "u1"})
    assert Decimal(result["tax_payable"]) == Decimal(0)


def test_list_tax_packs():
    ledger_svc, tax_svc = _make_services_with_income()
    tools = make_tools(ledger_svc, tax_svc)
    list_packs = next(t for t in tools if t.name == "list_tax_packs")

    result = list_packs.invoke({})
    assert "packs" in result
    keys = {(p["country"], p["year"]) for p in result["packs"]}
    assert ("LK", "2025/26") in keys


def test_explain_tax_band_valid():
    ledger_svc, tax_svc = _make_services_with_income()
    tools = make_tools(ledger_svc, tax_svc)
    explain = next(t for t in tools if t.name == "explain_tax_band")

    result = explain.invoke({"band_index": 0, "year": "2025/26"})
    assert "rate" in result
    assert "rate_pct" in result
    assert result["band_index"] == 0


def test_explain_tax_band_out_of_range():
    ledger_svc, tax_svc = _make_services_with_income()
    tools = make_tools(ledger_svc, tax_svc)
    explain = next(t for t in tools if t.name == "explain_tax_band")

    result = explain.invoke({"band_index": 99, "year": "2025/26"})
    assert "error" in result


@pytest.mark.asyncio
async def test_get_tax_computation_unknown_year():
    ledger_svc, tax_svc = _make_services_with_income()
    tools = make_tools(ledger_svc, tax_svc)
    get_tax = next(t for t in tools if t.name == "get_tax_computation")

    with pytest.raises(KeyError):
        await get_tax.ainvoke({"year": "1999/00", "user_id": "u1"})
