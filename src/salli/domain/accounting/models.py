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


class Account(BaseModel):
    id: str
    user_id: str
    code: str
    name: str
    type: AccountType
    currency: str = "LKR"
    parent_id: str | None = None
    is_active: bool = True


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
