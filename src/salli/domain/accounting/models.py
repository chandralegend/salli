from __future__ import annotations

from decimal import Decimal
from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class Direction(int, Enum):
    DEBIT = 1
    CREDIT = -1


AccountType = Literal["asset", "liability", "equity", "income", "expense"]

Source = Literal["manual", "statement", "sms", "system"]

# What an account means to the tax engine, declared explicitly rather than
# guessed from its name.
#
# This replaces substring matching on `Account.name` ("apit" in name.lower(),
# "qualifying" or "donation", code.startswith("FSI")), which was wrong in two
# directions at once: it silently missed the accounts onboarding actually seeds
# — "APIT Receivable" is an *asset*, while the old mapping only inspected
# liabilities, so every onboarded user's withheld tax was ignored and their tax
# payable overstated by that amount — and it could fire on unrelated accounts
# that merely contained the letters (a liability named "Waiting Clearing"
# counted as AIT withheld).
#
# `AccountType` stays the accounting classification; `TaxRole` is the tax
# treatment. They answer different questions and an account needs both.
TaxRole = Literal[
    "apit_credit",
    "ait_credit",
    "foreign_tax_credit",
    "qualifying_payment",
    "fsi_income",
]


class Account(BaseModel):
    id: str
    user_id: str
    code: str
    name: str
    type: AccountType
    currency: str = "LKR"
    parent_id: str | None = None
    is_active: bool = True
    tax_role: TaxRole | None = None


class Posting(BaseModel):
    account_id: str
    direction: Direction
    amount: Decimal = Field(gt=Decimal(0))
    currency: str
    fx_rate: Decimal = Decimal(1)
    fx_rate_source: str | None = None

    @field_validator("amount", mode="before")
    @classmethod
    def no_float(cls, v: object) -> object:
        if isinstance(v, float):
            raise ValueError("Use Decimal, never float for monetary amounts")
        return v

    @property
    def base_signed(self) -> Decimal:
        """Signed LKR equivalent — positive for debit, negative for credit."""
        return Decimal(self.direction.value) * (self.amount * self.fx_rate)


class JournalEntry(BaseModel):
    entry_date: str
    description: str
    source: Source
    external_ref: str | None = None
    postings: list[Posting] = Field(min_length=2)

    @model_validator(mode="after")
    def must_balance(self) -> JournalEntry:
        total = sum((p.base_signed for p in self.postings), Decimal(0))
        if total != Decimal(0):
            raise ValueError(
                f"Journal entry is unbalanced: net base amount = {total} (must be exactly zero)"
            )
        return self


class StoredJournalEntry(JournalEntry):
    """A JournalEntry that has been persisted and given an ID."""

    id: str
    user_id: str
    reversed_by: str | None = None
