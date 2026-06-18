"""
Salli CLI — Phase 1 control surface (Typer + Rich).

All commands are thin wrappers over application services.
The CLI and the FastAPI layer share the same services via composition.py.
"""
from __future__ import annotations

import typer
from rich.console import Console
from rich.table import Table

app = typer.Typer(
    name="salli",
    help="Salli — personal finance & tax preparation for Sri Lanka",
    no_args_is_help=True,
)
console = Console()

accounts_app = typer.Typer(help="Manage the chart of accounts")
entry_app = typer.Typer(help="Journal entry commands")
ledger_app = typer.Typer(help="Ledger reports")
tax_app = typer.Typer(help="Tax computation and return preparation")

app.add_typer(accounts_app, name="accounts")
app.add_typer(entry_app, name="entry")
app.add_typer(ledger_app, name="ledger")
app.add_typer(tax_app, name="tax")


# ── accounts ──────────────────────────────────────────────────────────────────


@accounts_app.command("list")
def accounts_list():
    """List all accounts in the chart of accounts."""
    console.print("[yellow]Not yet implemented — awaiting ledger service wiring.[/yellow]")


@accounts_app.command("add")
def accounts_add(
    code: str = typer.Argument(..., help="Account code, e.g. 1001"),
    name: str = typer.Argument(..., help="Account name"),
    type: str = typer.Argument(..., help="asset|liability|equity|income|expense"),
    currency: str = typer.Option("LKR", help="ISO currency code"),
):
    """Add an account to the chart of accounts."""
    console.print("[yellow]Not yet implemented — awaiting ledger service wiring.[/yellow]")


# ── entry ─────────────────────────────────────────────────────────────────────


@entry_app.command("add")
def entry_add(
    date: str = typer.Option(..., "--date", help="YYYY-MM-DD"),
    desc: str = typer.Option(..., "--desc", help="Description"),
    debit: list[str] = typer.Option(..., "--debit", help="ACCOUNT:AMOUNT (repeat for splits)"),
    credit: list[str] = typer.Option(..., "--credit", help="ACCOUNT:AMOUNT (repeat for splits)"),
):
    """Add a balanced journal entry."""
    console.print("[yellow]Not yet implemented — awaiting ledger service wiring.[/yellow]")


# ── ledger ────────────────────────────────────────────────────────────────────


@ledger_app.command("trial-balance")
def trial_balance():
    """Print the trial balance (must net to zero)."""
    console.print("[yellow]Not yet implemented — awaiting ledger service wiring.[/yellow]")


@ledger_app.command("income-statement")
def income_statement(
    from_date: str = typer.Option(..., "--from"),
    to_date: str = typer.Option(..., "--to"),
):
    """Print income statement for a date range."""
    console.print("[yellow]Not yet implemented — awaiting ledger service wiring.[/yellow]")


# ── tax ───────────────────────────────────────────────────────────────────────


@tax_app.command("compute")
def tax_compute(
    year: str = typer.Option("2025/26", "--year", help="Year of assessment"),
):
    """Compute income tax using the versioned rules engine."""
    console.print("[yellow]Not yet implemented — awaiting tax service wiring.[/yellow]")


@tax_app.command("explain")
def tax_explain(
    year: str = typer.Option("2025/26", "--year"),
):
    """Launch the Tax Agent REPL to explain your tax situation."""
    console.print("[yellow]Not yet implemented — awaiting agent service wiring.[/yellow]")


@tax_app.command("packs")
def tax_packs():
    """List available tax packs."""
    from salli.domain.tax.packs.registry import list_packs

    table = Table(title="Available Tax Packs", show_header=True)
    table.add_column("Country")
    table.add_column("Year")
    table.add_column("Version")
    table.add_column("Period")

    for pack in list_packs():
        table.add_row(
            pack.country,
            pack.year,
            pack.version,
            f"{pack.period_start} → {pack.period_end}",
        )

    console.print(table)


# ── entrypoint ────────────────────────────────────────────────────────────────


def main():
    app()


if __name__ == "__main__":
    main()
