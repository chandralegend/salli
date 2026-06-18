"""Unit tests for TaxService using in-memory fakes."""

from __future__ import annotations

import uuid
from contextlib import asynccontextmanager
from decimal import Decimal

import pytest

from salli.application.services.tax_service import TaxService, _build_ledger_view
from salli.domain.accounting.models import Account, Direction, Posting, StoredJournalEntry
from salli.domain.tax.models import TaxComputation

# ── In-memory fakes ────────────────────────────────────────────────────────────


class FakeLedgerRepo:
    def __init__(self, entries=None, accounts=None):
        self._entries: list[StoredJournalEntry] = entries or []
        self._accounts: list[Account] = accounts or []

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
        self._store: dict[tuple, TaxComputation] = {}

    async def save(self, user_id: str, computation: TaxComputation) -> str:
        self._store[(user_id, computation.pack_year)] = computation
        return str(uuid.uuid4())

    async def get_latest(self, user_id: str, year: str) -> TaxComputation | None:
        return self._store.get((user_id, year))


class FakeUoW:
    def __init__(self, ledger_repo, tax_repo):
        self.ledger = ledger_repo
        self.tax_computations = tax_repo

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_):
        pass


def _make_entry(user_id: str, date: str, postings: list[Posting]) -> StoredJournalEntry:
    return StoredJournalEntry(
        id=str(uuid.uuid4()),
        user_id=user_id,
        entry_date=date,
        description="test",
        source="manual",
        postings=postings,
    )


def _make_account(user_id: str, code: str, name: str, acc_type: str) -> Account:
    return Account(
        id=str(uuid.uuid4()),
        user_id=user_id,
        code=code,
        name=name,
        type=acc_type,
    )


# ── _build_ledger_view tests ───────────────────────────────────────────────────


def test_build_ledger_view_income_credit():
    salary_acc = _make_account("u1", "4001", "Employment Income", "income")
    posting = Posting(
        account_id=salary_acc.id,
        direction=Direction.CREDIT,
        amount=Decimal("3_000_000"),
        currency="LKR",
    )
    entry = _make_entry(
        "u1",
        "2025-04-01",
        [
            Posting(
                account_id="asset",
                direction=Direction.DEBIT,
                amount=Decimal("3_000_000"),
                currency="LKR",
            ),
            posting,
        ],
    )
    view = _build_ledger_view([entry], [salary_acc])
    assert view.total_income == Decimal("3_000_000")
    assert view.foreign_service_income == Decimal(0)


def test_build_ledger_view_foreign_service_income():
    fsi_acc = _make_account("u1", "FSI001", "Foreign Service Income", "income")
    entry = _make_entry(
        "u1",
        "2025-04-01",
        [
            Posting(
                account_id="asset",
                direction=Direction.DEBIT,
                amount=Decimal("500_000"),
                currency="LKR",
            ),
            Posting(
                account_id=fsi_acc.id,
                direction=Direction.CREDIT,
                amount=Decimal("500_000"),
                currency="LKR",
            ),
        ],
    )
    view = _build_ledger_view([entry], [fsi_acc])
    assert view.total_income == Decimal("500_000")
    assert view.foreign_service_income == Decimal("500_000")


def test_build_ledger_view_apit_credit():
    apit_acc = _make_account("u1", "2100", "APIT Payable", "liability")
    # DR APIT Payable = employer has remitted this amount to IRD on our behalf.
    # The offsetting CR is to bank/income (unknown to view → skipped by _build_ledger_view).
    entry = _make_entry(
        "u1",
        "2025-04-01",
        [
            Posting(
                account_id=apit_acc.id,
                direction=Direction.DEBIT,
                amount=Decimal("50_000"),
                currency="LKR",
            ),
            Posting(
                account_id="income-clearing",
                direction=Direction.CREDIT,
                amount=Decimal("50_000"),
                currency="LKR",
            ),
        ],
    )
    view = _build_ledger_view([entry], [apit_acc])
    assert view.apit_withheld == Decimal("50_000")


def test_build_ledger_view_empty():
    view = _build_ledger_view([], [])
    assert view.total_income == Decimal(0)
    assert view.apit_withheld == Decimal(0)
    assert view.foreign_service_income == Decimal(0)


# ── TaxService tests ───────────────────────────────────────────────────────────


def _make_tax_service_with_income(income: Decimal, apit: Decimal = Decimal(0)):
    salary_acc = _make_account("u1", "4001", "Employment Income", "income")
    apit_acc = _make_account("u1", "2100", "APIT Payable", "liability")

    # Entry 1: salary received (bank unknown to view → skipped on DR side)
    salary_entry = _make_entry(
        "u1",
        "2025-04-01",
        [
            Posting(account_id="bank", direction=Direction.DEBIT, amount=income, currency="LKR"),
            Posting(
                account_id=salary_acc.id, direction=Direction.CREDIT, amount=income, currency="LKR"
            ),
        ],
    )
    entries = [salary_entry]

    # Entry 2: APIT withheld — DR APIT Payable (remitted to IRD), CR clearing
    if apit > 0:
        apit_entry = _make_entry(
            "u1",
            "2025-04-01",
            [
                Posting(
                    account_id=apit_acc.id, direction=Direction.DEBIT, amount=apit, currency="LKR"
                ),
                Posting(
                    account_id="clearing", direction=Direction.CREDIT, amount=apit, currency="LKR"
                ),
            ],
        )
        entries.append(apit_entry)

    accounts = [salary_acc, apit_acc]

    ledger_repo = FakeLedgerRepo(entries=entries, accounts=accounts)
    tax_repo = FakeTaxComputationRepo()

    @asynccontextmanager
    async def uow_factory():
        yield FakeUoW(ledger_repo, tax_repo)

    return TaxService(uow_factory), tax_repo


@pytest.mark.asyncio
async def test_compute_tax_below_relief():
    """Income below personal relief → zero tax."""
    svc, _ = _make_tax_service_with_income(Decimal("1_000_000"))
    result = await svc.compute_tax("u1", "2025/26")
    assert result.tax_payable == Decimal(0)
    assert result.taxable_income == Decimal(0)


@pytest.mark.asyncio
async def test_compute_tax_saves_computation():
    svc, tax_repo = _make_tax_service_with_income(Decimal("5_000_000"))
    await svc.compute_tax("u1", "2025/26")
    saved = await tax_repo.get_latest("u1", "2025/26")
    assert saved is not None
    assert saved.pack_country == "LK"


@pytest.mark.asyncio
async def test_compute_tax_pack_version_recorded():
    svc, _ = _make_tax_service_with_income(Decimal("3_000_000"))
    result = await svc.compute_tax("u1", "2025/26")
    assert result.pack_version == "1.0.0"
    assert result.pack_country == "LK"


@pytest.mark.asyncio
async def test_compute_tax_apit_reduces_payable():
    """APIT credit reduces the final tax payable."""
    svc_no_apit, _ = _make_tax_service_with_income(Decimal("4_000_000"))
    svc_with_apit, _ = _make_tax_service_with_income(Decimal("4_000_000"), apit=Decimal("100_000"))

    result_no_apit = await svc_no_apit.compute_tax("u1", "2025/26")
    result_with_apit = await svc_with_apit.compute_tax("u1", "2025/26")

    assert result_with_apit.tax_payable < result_no_apit.tax_payable
    assert result_with_apit.apit_credit == Decimal("100_000")


@pytest.mark.asyncio
async def test_compute_tax_unknown_year_raises():
    svc, _ = _make_tax_service_with_income(Decimal("3_000_000"))
    with pytest.raises(KeyError):
        await svc.compute_tax("u1", "1999/00")


@pytest.mark.asyncio
async def test_get_latest_computation_none_before_compute():
    svc, tax_repo = _make_tax_service_with_income(Decimal("3_000_000"))
    result = await svc.get_latest_computation("u1", "2025/26")
    assert result is None


@pytest.mark.asyncio
async def test_get_latest_computation_after_compute():
    svc, tax_repo = _make_tax_service_with_income(Decimal("3_000_000"))
    await svc.compute_tax("u1", "2025/26")
    saved = await tax_repo.get_latest("u1", "2025/26")
    assert saved is not None


def test_list_packs_includes_lk_2025_26():
    ledger_repo = FakeLedgerRepo()
    tax_repo = FakeTaxComputationRepo()

    @asynccontextmanager
    async def uow_factory():
        yield FakeUoW(ledger_repo, tax_repo)

    svc = TaxService(uow_factory)
    packs = svc.list_packs()
    keys = {(p.country, p.year) for p in packs}
    assert ("LK", "2025/26") in keys
