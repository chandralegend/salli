"""
Composition root — the single place adapters are bound to ports.
Both the CLI (Phase 1) and FastAPI (Phase 2) wire up services here.
"""
from __future__ import annotations

from salli.config import Settings


def build_services(settings: Settings):  # type: ignore[return]
    """
    Construct and return all application services with real adapters injected.
    Placeholder until adapters are implemented in Phase 1.
    """
    raise NotImplementedError("Composition root not yet wired — implement adapters first")
