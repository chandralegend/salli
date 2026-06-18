"""Pack registry — maps (country, year) to the canonical TaxPack instance."""
from __future__ import annotations

from salli.domain.tax.models import TaxPack
from salli.domain.tax.packs.lk_2025_26 import LK_2025_26

_REGISTRY: dict[tuple[str, str], TaxPack] = {
    ("LK", "2025/26"): LK_2025_26,
}


def get_pack(country: str, year: str) -> TaxPack:
    key = (country.upper(), year)
    pack = _REGISTRY.get(key)
    if pack is None:
        available = ", ".join(f"{c}/{y}" for c, y in _REGISTRY)
        raise KeyError(f"No tax pack for {country}/{year}. Available: {available}")
    return pack


def list_packs() -> list[TaxPack]:
    return list(_REGISTRY.values())
