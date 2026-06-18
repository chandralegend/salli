from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal
from typing import Self


class Money:
    """
    Immutable value object: integer minor units + ISO-4217 currency code.
    Minor units are always integers — passing a float raises TypeError.
    """

    __slots__ = ("_minor", "_currency")

    def __init__(self, minor_units: int, currency: str) -> None:
        if not isinstance(minor_units, int):
            raise TypeError(f"minor_units must be int, got {type(minor_units).__name__}")
        self._minor = minor_units
        self._currency = currency.upper()

    # ── constructors ──────────────────────────────────────────────────────────

    @classmethod
    def of(cls, amount: Decimal, currency: str, minor_factor: int = 100) -> Self:
        """Convert a Decimal amount to minor units using pack-defined rounding."""
        minor = int((amount * Decimal(minor_factor)).to_integral_value(ROUND_HALF_UP))
        return cls(minor, currency)

    @classmethod
    def zero(cls, currency: str) -> Self:
        return cls(0, currency)

    # ── properties ────────────────────────────────────────────────────────────

    @property
    def minor_units(self) -> int:
        return self._minor

    @property
    def currency(self) -> str:
        return self._currency

    def to_decimal(self, minor_factor: int = 100) -> Decimal:
        return Decimal(self._minor) / Decimal(minor_factor)

    # ── arithmetic ────────────────────────────────────────────────────────────

    def __add__(self, other: Self) -> Self:
        self._assert_same_currency(other)
        return Money(self._minor + other._minor, self._currency)

    def __sub__(self, other: Self) -> Self:
        self._assert_same_currency(other)
        return Money(self._minor - other._minor, self._currency)

    def __neg__(self) -> Self:
        return Money(-self._minor, self._currency)

    def __abs__(self) -> Self:
        return Money(abs(self._minor), self._currency)

    # ── comparison ────────────────────────────────────────────────────────────

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Money):
            return NotImplemented
        return self._minor == other._minor and self._currency == other._currency

    def __lt__(self, other: Self) -> bool:
        self._assert_same_currency(other)
        return self._minor < other._minor

    def __le__(self, other: Self) -> bool:
        return self == other or self < other

    def __gt__(self, other: Self) -> bool:
        return not self <= other

    def __ge__(self, other: Self) -> bool:
        return not self < other

    def __hash__(self) -> int:
        return hash((self._minor, self._currency))

    # ── display ───────────────────────────────────────────────────────────────

    def __repr__(self) -> str:
        return f"Money({self._minor}, {self._currency!r})"

    def __str__(self) -> str:
        return f"{self.to_decimal():,.2f} {self._currency}"

    # ── helpers ───────────────────────────────────────────────────────────────

    def _assert_same_currency(self, other: Self) -> None:
        if self._currency != other._currency:
            raise ValueError(
                f"Currency mismatch: {self._currency} vs {other._currency}"
            )
