"""
LangGraph tool definitions for the Tax Agent.

ALL tools are read-only — they call application services (ledger, tax) and
return structured data the model can narrate. No tool writes to the ledger or
submits anything externally. The model MUST NOT emit a tax number unless it came
from a tool call.
"""
from __future__ import annotations

from decimal import Decimal
from typing import Annotated, Any

from langchain_core.tools import tool


# ── Tool factory (bound to real services at runtime) ───────────────────────────


def make_tools(ledger_svc, tax_svc):
    """
    Return LangChain tool callables bound to live application services.
    Called at agent construction time; the agent is created fresh per session
    or shared across sessions with a checkpointer.
    """

    @tool
    async def get_trial_balance(
        from_date: Annotated[str | None, "Start date YYYY-MM-DD"] = None,
        to_date: Annotated[str | None, "End date YYYY-MM-DD"] = None,
        user_id: Annotated[str, "User ID"] = "dev-user",
    ) -> dict[str, Any]:
        """Return the trial balance (account balances) for the user's ledger."""
        balances = await ledger_svc.get_trial_balance(user_id, from_date, to_date)
        return {
            "trial_balance": {k: str(v) for k, v in balances.items()},
            "net": str(sum(balances.values(), Decimal(0))),
        }

    @tool
    async def get_accounts(
        user_id: Annotated[str, "User ID"] = "dev-user",
    ) -> dict[str, Any]:
        """List all accounts in the user's chart of accounts."""
        accounts = await ledger_svc.list_accounts(user_id)
        return {
            "accounts": [
                {"id": a.id, "code": a.code, "name": a.name, "type": a.type, "currency": a.currency}
                for a in accounts
            ]
        }

    @tool
    async def get_tax_computation(
        year: Annotated[str, "Year of assessment, e.g. 2025/26"] = "2025/26",
        user_id: Annotated[str, "User ID"] = "dev-user",
    ) -> dict[str, Any]:
        """
        Return the latest stored tax computation for the given year.
        If none exists, compute it now. Numbers here are authoritative;
        narrate them — do NOT recompute or adjust them.
        """
        result = await tax_svc.get_latest_computation(user_id, year)
        if result is None:
            result = await tax_svc.compute_tax(user_id, year)
        return {
            "year": result.pack_year,
            "pack_version": result.pack_version,
            "gross_income": str(result.gross_income),
            "personal_relief": str(result.personal_relief_applied),
            "taxable_income": str(result.taxable_income),
            "tax_before_credits": str(result.tax_before_credits),
            "apit_credit": str(result.apit_credit),
            "ait_credit": str(result.ait_credit),
            "foreign_tax_credit": str(result.foreign_tax_credit),
            "tax_payable": str(result.tax_payable),
            "band_workings": [
                {
                    "from": str(bw.from_amount),
                    "to": str(bw.to_amount) if bw.to_amount else "∞",
                    "rate": str(bw.rate),
                    "taxable_in_band": str(bw.taxable_in_band),
                    "tax": str(bw.tax),
                }
                for bw in result.band_workings
            ],
        }

    @tool
    def list_tax_packs() -> dict[str, Any]:
        """List available tax packs (country, year, version)."""
        packs = tax_svc.list_packs()
        return {
            "packs": [
                {"country": p.country, "year": p.year, "version": p.version,
                 "period_start": p.period_start, "period_end": p.period_end}
                for p in packs
            ]
        }

    @tool
    def explain_tax_band(
        band_index: Annotated[int, "0-indexed band number"],
        year: Annotated[str, "Year of assessment"] = "2025/26",
    ) -> dict[str, Any]:
        """
        Explain a specific tax band (rate, threshold, how much tax it generates).
        Returns the band definition from the tax pack — do NOT invent numbers.
        """
        from salli.domain.tax.packs.registry import get_pack

        pack = get_pack("LK", year)
        if band_index < 0 or band_index >= len(pack.bands):
            return {"error": f"Band index {band_index} out of range (0–{len(pack.bands)-1})"}
        band = pack.bands[band_index]
        return {
            "band_index": band_index,
            "upto": str(band.upto) if band.upto else "unbounded",
            "rate": str(band.rate),
            "rate_pct": f"{float(band.rate) * 100:.0f}%",
            "personal_relief": str(pack.personal_relief),
        }

    return [get_trial_balance, get_accounts, get_tax_computation, list_tax_packs, explain_tax_band]
