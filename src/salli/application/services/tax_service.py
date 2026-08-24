from __future__ import annotations

from collections.abc import Callable
from decimal import Decimal
from typing import Any

from salli.domain.accounting.models import Account, StoredJournalEntry
from salli.domain.tax import engine
from salli.domain.tax.models import LedgerView, TaxComputation, TaxPack
from salli.domain.tax.packs import registry


def _build_ledger_view(
    entries: list[StoredJournalEntry],
    accounts: list[Account],
) -> LedgerView:
    """
    Aggregate posting data into the LedgerView the tax engine expects.

    Two things here are load-bearing.

    **Classification is by `Account.tax_role`, never by name.** The previous
    version matched substrings against `Account.name` and required the credit
    accounts to be typed `liability`, but onboarding seeds them as assets
    ("4110 APIT Receivable", `asset`) — which is the correct accounting for tax
    you may reclaim. The two disagreed, so `apit_withheld` was zero for every
    user who onboarded through the product and their tax payable was overstated
    by the whole amount already withheld from their salary.

    **Amounts are accumulated signed, not by direction.** Each bucket adds
    `base_signed` in its own natural direction, so a reversing entry cancels the
    original arithmetically. Filtering on `Direction` instead — the old
    behaviour — put the reversal on the ignored side while the original still
    counted, so reversed income stayed taxable forever and reversed donations
    stayed deducted. `reverse_entry` is the only sanctioned way to correct a
    posted entry (entries are immutable), so tax has to honour it.

    Buckets are clamped at zero: a net-negative income or credit total means the
    ledger is mid-correction or malformed, and a negative figure would silently
    *increase* someone's refund rather than fail visibly.
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

            # Income and the credits/deductions accrue in opposite directions,
            # so each is normalised to "positive means more of this bucket".
            credit_positive = -posting.base_signed  # CR increases income
            debit_positive = posting.base_signed  # DR increases a credit/deduction

            if acc.type == "income":
                total_income += credit_positive
                if acc.tax_role == "fsi_income":
                    foreign_service_income += credit_positive

            if acc.tax_role == "apit_credit":
                apit_withheld += debit_positive
            elif acc.tax_role == "ait_credit":
                ait_withheld += debit_positive
            elif acc.tax_role == "foreign_tax_credit":
                foreign_tax_paid += debit_positive
            elif acc.tax_role == "qualifying_payment":
                qualifying_payments += debit_positive

    zero = Decimal(0)
    return LedgerView(
        total_income=max(zero, total_income),
        foreign_service_income=max(zero, foreign_service_income),
        apit_withheld=max(zero, apit_withheld),
        ait_withheld=max(zero, ait_withheld),
        foreign_tax_paid=max(zero, foreign_tax_paid),
        qualifying_payments=max(zero, qualifying_payments),
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
