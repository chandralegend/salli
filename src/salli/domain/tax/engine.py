"""
Deterministic tax computation engine.

Pure function: compute(ledger_view, pack) -> TaxComputation.
No I/O, no LLM calls, no side effects.
"""
from __future__ import annotations

from decimal import ROUND_DOWN, ROUND_HALF_UP, Decimal

from salli.domain.tax.models import BandWorkings, LedgerView, TaxComputation, TaxPack


def _round(amount: Decimal, rounding: str) -> Decimal:
    if rounding == "nearest_rupee":
        return amount.to_integral_value(ROUND_HALF_UP)
    if rounding == "truncate_rupee":
        return amount.to_integral_value(ROUND_DOWN)
    raise ValueError(f"Unknown rounding mode: {rounding!r}")


def compute(ledger: LedgerView, pack: TaxPack) -> TaxComputation:
    """
    Compute personal income tax for a single year of assessment.

    Bands apply to taxable income AFTER deducting personal relief.
    Credits reduce tax_before_credits; tax_payable cannot go below zero.
    """
    gross = ledger.total_income

    # Personal relief: capped at gross income so it never drives taxable negative.
    relief_applied = min(pack.personal_relief, gross)
    taxable = max(Decimal(0), gross - relief_applied)

    # Apply qualifying payments / donations (capped to lower of ⅓ taxable or LKR 75,000).
    # Future: expose as a separate deduction in the pack config.
    qp_cap = min(
        taxable / Decimal(3),
        Decimal("75000"),
    )
    qp_deduction = min(ledger.qualifying_payments, qp_cap)
    taxable = max(Decimal(0), taxable - qp_deduction)

    # Progressive band computation
    workings: list[BandWorkings] = []
    remaining = taxable
    prev_upto = Decimal(0)

    for band in pack.bands:
        if remaining <= Decimal(0):
            break

        band_size = (band.upto - prev_upto) if band.upto is not None else remaining
        in_band = min(remaining, band_size)
        band_tax = _round(in_band * band.rate, pack.rounding)

        workings.append(
            BandWorkings(
                from_amount=prev_upto,
                to_amount=band.upto,
                rate=band.rate,
                taxable_in_band=in_band,
                tax=band_tax,
            )
        )

        remaining -= in_band
        if band.upto is not None:
            prev_upto = band.upto

    tax_before_credits = sum((w.tax for w in workings), Decimal(0))

    # Credits
    apit = ledger.apit_withheld
    ait = ledger.ait_withheld
    ftc = ledger.foreign_tax_paid
    total_credits = apit + ait + ftc

    tax_payable = max(
        Decimal(0),
        _round(tax_before_credits - total_credits, pack.rounding),
    )

    return TaxComputation(
        pack_country=pack.country,
        pack_year=pack.year,
        pack_version=pack.version,
        gross_income=gross,
        personal_relief_applied=relief_applied,
        taxable_income=taxable,
        band_workings=workings,
        tax_before_credits=tax_before_credits,
        apit_credit=apit,
        ait_credit=ait,
        foreign_tax_credit=ftc,
        total_credits=total_credits,
        tax_payable=tax_payable,
        rounding=pack.rounding,
    )
