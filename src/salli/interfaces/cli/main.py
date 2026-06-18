"""
Salli CLI — Phase 1 control surface (Typer + Rich).

All commands are thin wrappers over application services.
The CLI and the FastAPI layer share the same services via composition.py.
"""
from __future__ import annotations

import asyncio
import sys

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


def _services():
    from salli.composition import build_services
    from salli.config import get_settings

    return build_services(get_settings())


# ── accounts ──────────────────────────────────────────────────────────────────


@accounts_app.command("list")
def accounts_list():
    """List all accounts in the chart of accounts."""
    user_id = _require_user()
    accounts = asyncio.run(_services().ledger.list_accounts(user_id))
    if not accounts:
        console.print("[dim]No accounts found. Use 'salli accounts add' to create one.[/dim]")
        return
    table = Table(title="Chart of Accounts")
    table.add_column("Code")
    table.add_column("Name")
    table.add_column("Type")
    table.add_column("Currency")
    for acc in accounts:
        table.add_row(acc.code, acc.name, acc.type, acc.currency)
    console.print(table)


@accounts_app.command("add")
def accounts_add(
    code: str = typer.Argument(..., help="Account code, e.g. 1001"),
    name: str = typer.Argument(..., help="Account name"),
    type: str = typer.Argument(..., help="asset|liability|equity|income|expense"),
    currency: str = typer.Option("LKR", help="ISO currency code"),
):
    """Add an account to the chart of accounts."""
    user_id = _require_user()
    valid_types = {"asset", "liability", "equity", "income", "expense"}
    if type not in valid_types:
        console.print(f"[red]Invalid type '{type}'. Must be one of: {', '.join(sorted(valid_types))}[/red]")
        raise typer.Exit(1)
    account_id = asyncio.run(
        _services().ledger.add_account(user_id, code, name, type, currency)  # type: ignore[arg-type]
    )
    console.print(f"[green]Account created:[/green] {code} — {name} ({account_id})")


# ── entry ─────────────────────────────────────────────────────────────────────


@entry_app.command("add")
def entry_add(
    date: str = typer.Option(..., "--date", help="YYYY-MM-DD"),
    desc: str = typer.Option(..., "--desc", help="Description"),
    debit: list[str] = typer.Option(..., "--debit", help="ACCOUNT_ID:AMOUNT (repeat for splits)"),
    credit: list[str] = typer.Option(..., "--credit", help="ACCOUNT_ID:AMOUNT (repeat for splits)"),
):
    """Add a balanced journal entry (ACCOUNT_ID:AMOUNT pairs)."""
    from decimal import Decimal

    from salli.domain.accounting.models import Direction

    user_id = _require_user()

    def parse_side(pairs: list[str], direction: Direction) -> list[dict]:
        postings = []
        for pair in pairs:
            try:
                account_id, amount_str = pair.rsplit(":", 1)
                postings.append({
                    "account_id": account_id.strip(),
                    "direction": direction,
                    "amount": Decimal(amount_str.strip()),
                    "currency": "LKR",
                })
            except ValueError:
                console.print(f"[red]Invalid format '{pair}'. Use ACCOUNT_ID:AMOUNT[/red]")
                raise typer.Exit(1)
        return postings

    postings_data = parse_side(debit, Direction.DEBIT) + parse_side(credit, Direction.CREDIT)

    try:
        entry_id = asyncio.run(
            _services().ledger.add_entry(user_id, date, desc, "manual", postings_data)
        )
        console.print(f"[green]Entry posted:[/green] {entry_id}")
    except ValueError as e:
        console.print(f"[red]Error:[/red] {e}")
        raise typer.Exit(1)


# ── ledger ────────────────────────────────────────────────────────────────────


@ledger_app.command("trial-balance")
def trial_balance_cmd(
    from_date: str = typer.Option(None, "--from", help="YYYY-MM-DD"),
    to_date: str = typer.Option(None, "--to", help="YYYY-MM-DD"),
):
    """Print the trial balance (must net to zero)."""
    user_id = _require_user()
    balances = asyncio.run(
        _services().ledger.get_trial_balance(user_id, from_date, to_date)
    )
    if not balances:
        console.print("[dim]No entries found.[/dim]")
        return

    from decimal import Decimal

    table = Table(title="Trial Balance")
    table.add_column("Account ID")
    table.add_column("Balance (LKR)", justify="right")
    total = Decimal(0)
    for acc_id, bal in sorted(balances.items()):
        table.add_row(acc_id, f"{bal:,.2f}")
        total += bal
    table.add_section()
    table.add_row("[bold]NET[/bold]", f"[bold]{total:,.2f}[/bold]")
    console.print(table)


@ledger_app.command("income-statement")
def income_statement(
    from_date: str = typer.Option(..., "--from"),
    to_date: str = typer.Option(..., "--to"),
):
    """Print income statement for a date range."""
    console.print("[yellow]Requires account classification — coming in next iteration.[/yellow]")


# ── tax ───────────────────────────────────────────────────────────────────────


@tax_app.command("compute")
def tax_compute(
    year: str = typer.Option("2025/26", "--year", help="Year of assessment"),
):
    """Compute income tax using the versioned rules engine."""
    user_id = _require_user()
    try:
        result = asyncio.run(_services().tax.compute_tax(user_id, year))
    except KeyError as e:
        console.print(f"[red]Unknown tax pack:[/red] {e}")
        raise typer.Exit(1)

    console.print(f"\n[bold]Tax Computation — {result.pack_year} (v{result.pack_version})[/bold]\n")

    table = Table(title="Band Workings")
    table.add_column("Band")
    table.add_column("Taxable in Band (LKR)", justify="right")
    table.add_column("Rate")
    table.add_column("Tax (LKR)", justify="right")
    for i, bw in enumerate(result.band_workings, 1):
        upto = f"{bw.to_amount:,.0f}" if bw.to_amount else "∞"
        table.add_row(
            f"{i} (up to {upto})",
            f"{bw.taxable_in_band:,.2f}",
            f"{bw.rate * 100:.0f}%",
            f"{bw.tax:,.2f}",
        )
    console.print(table)

    console.print(f"\n  Gross income:        LKR {result.gross_income:>16,.2f}")
    console.print(f"  Personal relief:     LKR {result.personal_relief_applied:>16,.2f}")
    console.print(f"  Taxable income:      LKR {result.taxable_income:>16,.2f}")
    console.print(f"  Tax before credits:  LKR {result.tax_before_credits:>16,.2f}")
    console.print(f"  APIT credit:         LKR {result.apit_credit:>16,.2f}")
    console.print(f"  AIT credit:          LKR {result.ait_credit:>16,.2f}")
    console.print(f"  Foreign tax credit:  LKR {result.foreign_tax_credit:>16,.2f}")
    console.print(f"\n[bold]  Tax payable:         LKR {result.tax_payable:>16,.2f}[/bold]\n")


@tax_app.command("explain")
def tax_explain(
    year: str = typer.Option("2025/26", "--year"),
):
    """Launch the Tax Agent REPL to explain your tax situation."""
    console.print("[yellow]Tax Agent coming in the agents phase.[/yellow]")


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


# ── helpers ───────────────────────────────────────────────────────────────────


def _require_user() -> str:
    """
    Return the current user_id.
    Phase 1: taken from SALLI_USER_ID env var (no auth yet).
    Phase 2: FastAPI will inject from verified JWT.
    """
    import os

    user_id = os.environ.get("SALLI_USER_ID", "dev-user")
    return user_id


# ── entrypoint ────────────────────────────────────────────────────────────────


def main():
    app()


if __name__ == "__main__":
    main()
