from __future__ import annotations

from collections.abc import Callable
from decimal import Decimal
from typing import Any

from salli.domain.accounting.models import Account, Direction, StoredJournalEntry
from salli.domain.tax import engine
from salli.domain.tax.models import LedgerView, TaxComputation, TaxPack
from salli.domain.tax.packs import registry


def _build_ledger_view(
    entries: list[StoredJournalEntry],
    accounts: list[Account],
) -> LedgerView:
    """
    Aggregate posting data into the LedgerView the tax engine expects.
    Account classification is based on account type and name/code conventions.
    """
    acc_map = {a.id: a for a in accounts}

    total_income = Decimal(0)
    foreign_service_income = Decimal(0)
    apit_withheld = Decimal(0)
    ait_withheld = Decimal(0)
    foreign_tax_paid = Decimal(0)
    qualifying_payments = Decimal(0)

    for entry in entries:
        for posting in entry.postings:
            acc = acc_map.get(posting.account_id)
            if acc is None:
                continue

            name_lower = acc.name.lower()
            code_upper = acc.code.upper()
            base = abs(posting.base_signed)

            if acc.type == "income":
                if posting.direction == Direction.CREDIT:
                    total_income += base
                    if "foreign service" in name_lower or code_upper.startswith("FSI"):
                        foreign_service_income += base

            elif acc.type == "liability":
                if "apit" in name_lower:
                    if posting.direction == Direction.CREDIT:
                        apit_withheld += base
                elif "ait" in name_lower:
                    if posting.direction == Direction.CREDIT:
                        ait_withheld += base
                elif "foreign tax" in name_lower:
                    if posting.direction == Direction.CREDIT:
                        foreign_tax_paid += base

            elif acc.type == "expense":
                if "qualifying" in name_lower or "donation" in name_lower:
                    if posting.direction == Direction.DEBIT:
                        qualifying_payments += base

    return LedgerView(
        total_income=total_income,
        foreign_service_income=foreign_service_income,
        apit_withheld=apit_withheld,
        ait_withheld=ait_withheld,
        foreign_tax_paid=foreign_tax_paid,
        qualifying_payments=qualifying_payments,
    )


class TaxService:
    def __init__(self, uow_factory: Callable[[], Any]) -> None:
        self._uow_factory = uow_factory

    async def compute_tax(self, user_id: str, year: str) -> TaxComputation:
        pack = registry.get_pack("LK", year)
        async with self._uow_factory() as uow:
            entries = await uow.ledger.get_entries(
                user_id,
                from_date=pack.period_start,
                to_date=pack.period_end,
            )
            accounts = await uow.ledger.get_accounts(user_id)
            ledger_view = _build_ledger_view(entries, accounts)
            computation = engine.compute(ledger_view, pack)
            await uow.tax_computations.save(user_id, computation)
        return computation

    async def get_latest_computation(self, user_id: str, year: str) -> TaxComputation | None:
        async with self._uow_factory() as uow:
            return await uow.tax_computations.get_latest(user_id, year)

    def list_packs(self) -> list[TaxPack]:
        return registry.list_packs()
