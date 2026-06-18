"""
Salli CLI — Phase 1 control surface (Typer + Rich).

All commands are thin wrappers over application services.
The CLI and the FastAPI layer share the same services via composition.py.
"""

from __future__ import annotations

import asyncio

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
agent_app = typer.Typer(help="Tax Agent and return preparation")
parse_app = typer.Typer(help="Bank statement parsing and import")

app.add_typer(accounts_app, name="accounts")
app.add_typer(entry_app, name="entry")
app.add_typer(ledger_app, name="ledger")
app.add_typer(tax_app, name="tax")
app.add_typer(agent_app, name="agent")
app.add_typer(parse_app, name="parse")


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
        console.print(
            f"[red]Invalid type '{type}'. Must be one of: {', '.join(sorted(valid_types))}[/red]"
        )
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
                postings.append(
                    {
                        "account_id": account_id.strip(),
                        "direction": direction,
                        "amount": Decimal(amount_str.strip()),
                        "currency": "LKR",
                    }
                )
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
    balances = asyncio.run(_services().ledger.get_trial_balance(user_id, from_date, to_date))
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
    # Delegate to agent chat with a priming message
    _run_agent_chat(f"Please explain my tax situation for the {year} year of assessment.")


@tax_app.command("prepare-return")
def tax_prepare_return(
    year: str = typer.Option("2025/26", "--year"),
    thread_id: str = typer.Option(None, "--thread-id", help="Resume an existing return thread"),
):
    """Run the return preparation workflow (pauses for review before finalizing)."""

    user_id = _require_user()
    svc = _services()

    async def _run():
        result = await svc.agent.prepare_return(user_id, year=year, thread_id=thread_id)
        return result

    result = asyncio.run(_run())
    draft = result.get("draft_return", {})
    tid = result.get("thread_id", "")

    console.print(f"\n[bold]Draft Return — {year}[/bold]  (thread: {tid})\n")
    for cage, value in draft.items():
        if cage == "note":
            continue
        console.print(f"  {cage:<40} {value}")
    if draft.get("note"):
        console.print(f"\n[dim]{draft['note']}[/dim]")

    console.print(
        "\nApprove this draft? [[green]approve[/green]/[yellow]edit[/yellow]/[red]reject[/red]]"
    )
    decision = input("> ").strip().lower()
    if decision not in ("approve", "edit", "reject"):
        decision = "reject"

    async def _resume():
        return await svc.agent.resume_return(tid, decision)

    final = asyncio.run(_resume())
    if final.get("error"):
        console.print(f"[yellow]{final['error']}[/yellow]")
    else:
        ws = final.get("worksheet", {})
        console.print("\n[bold green]Return worksheet ready.[/bold green]")
        console.print(f"  Status: {ws.get('status')}")
        if ws.get("instructions"):
            console.print(f"\n{ws['instructions']}")


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


# ── parse ─────────────────────────────────────────────────────────────────────


@parse_app.command("upload")
def parse_upload(
    file: str = typer.Argument(..., help="Path to bank statement (PDF, XLSX, or CSV)"),
    bank: str = typer.Option("unknown", "--bank", help="Bank name hint (e.g. 'ComBank', 'HNB')"),
):
    """
    Parse a bank statement and queue transactions for review.

    Runs PDF/XLSX/CSV extraction, deduplication, and LLM classification.
    Prints a summary and prompts for immediate inline review.
    """
    import pathlib

    user_id = _require_user()
    path = pathlib.Path(file)
    if not path.exists():
        console.print(f"[red]File not found:[/red] {file}")
        raise typer.Exit(1)

    data = path.read_bytes()
    filename = path.name
    svc = _services()

    console.print(f"[dim]Parsing {filename} …[/dim]")
    result = asyncio.run(svc.parsing.parse_statement(user_id, filename, data, bank))

    console.print(
        f"\n[bold]Parsed:[/bold] {len(result.transactions)} transactions "
        f"({result.period_start} → {result.period_end}), "
        f"{len(result.errors)} error(s)\n"
    )

    if not result.transactions:
        console.print("[dim]No transactions found.[/dim]")
        return

    _interactive_review(user_id, svc, result)


def _interactive_review(user_id, svc, result) -> None:
    """Walk the user through each pending transaction, then post approved ones."""
    from rich.panel import Panel

    approved_ids: list[str] = []
    skipped = 0

    for i, txn in enumerate(result.transactions, 1):
        raw = txn.raw
        header = f"[{i}/{len(result.transactions)}] {raw.date}  {raw.description[:50]}"
        amount_str = f"{'CR' if raw.credit_flag else 'DR'} {raw.currency} {raw.amount:,.2f}"
        dedup = "[yellow]DUPLICATE — skipping[/yellow]" if txn.dedup_status == "duplicate" else ""

        console.print(
            Panel(
                f"{amount_str}\n"
                f"  DR: {txn.debit_account_id or '[dim]—[/dim]'}\n"
                f"  CR: {txn.credit_account_id or '[dim]—[/dim]'}\n"
                f"  Confidence: {txn.confidence:.0%}  {dedup}",
                title=header,
                border_style="cyan",
            )
        )

        if txn.dedup_status == "duplicate":
            skipped += 1
            continue

        try:
            choice = input("  [a]pprove / [s]kip / [q]uit  > ").strip().lower()
        except (EOFError, KeyboardInterrupt):
            console.print("\n[dim]Aborted.[/dim]")
            break

        if choice in ("q", "quit"):
            console.print("[dim]Stopped early.[/dim]")
            break
        if choice in ("a", "approve", ""):
            if txn.id:
                approved_ids.append(txn.id)
        else:
            skipped += 1

    if approved_ids:
        console.print(f"\n[dim]Posting {len(approved_ids)} approved transaction(s)…[/dim]")
        asyncio.run(svc.parsing.post_approved(user_id, approved_ids))
        console.print(f"[green]Posted {len(approved_ids)} entries.[/green]")
    else:
        console.print("[dim]Nothing posted.[/dim]")

    if skipped:
        console.print(f"[dim]{skipped} transaction(s) skipped/duplicated.[/dim]")


@parse_app.command("pending")
def parse_pending():
    """List transactions parsed but not yet posted."""
    user_id = _require_user()
    svc = _services()
    pending = asyncio.run(svc.parsing.get_pending(user_id))

    if not pending:
        console.print("[dim]No pending transactions.[/dim]")
        return

    table = Table(title=f"Pending Transactions ({len(pending)})")
    table.add_column("ID", style="dim")
    table.add_column("Date")
    table.add_column("Description")
    table.add_column("Amount", justify="right")
    table.add_column("DR account")
    table.add_column("CR account")

    for txn in pending:
        raw = txn.raw
        table.add_row(
            str(txn.id or "")[:8],
            raw.date,
            raw.description[:40],
            f"{'CR' if raw.credit_flag else 'DR'} {raw.currency} {raw.amount:,.2f}",
            txn.debit_account_id or "—",
            txn.credit_account_id or "—",
        )

    console.print(table)


@parse_app.command("post")
def parse_post(
    ids: list[str] = typer.Argument(..., help="Transaction IDs to post (space-separated)"),
):
    """Post specific approved transactions to the ledger."""
    user_id = _require_user()
    asyncio.run(_services().parsing.post_approved(user_id, ids))
    console.print(f"[green]Posted {len(ids)} transaction(s).[/green]")


# ── agent ─────────────────────────────────────────────────────────────────────


@agent_app.command("chat")
def agent_chat(
    thread_id: str = typer.Option(None, "--thread-id", help="Continue a prior conversation"),
):
    """
    Start an interactive Tax Agent REPL (streamed responses).
    Type 'quit' or press Ctrl-C to exit.
    """
    _run_agent_chat(None, thread_id=thread_id)


def _run_agent_chat(priming_message: str | None, thread_id: str | None = None):
    import uuid

    user_id = _require_user()
    svc = _services()

    if thread_id is None:
        thread_id = str(uuid.uuid4())

    console.print(
        f"\n[bold cyan]Salli Tax Agent[/bold cyan]  (thread: {thread_id})\n"
        "[dim]Type your question. 'quit' to exit.[/dim]\n"
    )

    async def _stream_one(msg: str) -> None:
        console.print("[bold green]Salli:[/bold green] ", end="")
        async for event_type, payload in svc.agent.stream_chat(user_id, msg, thread_id=thread_id):
            if event_type == "token":
                console.print(payload, end="")
            elif event_type == "tool_call":
                console.print(f"\n[dim]  ▸ {payload.get('name')}…[/dim]", end="")
            elif event_type == "interrupt":
                console.print(f"\n[yellow]  ⏸ Review required: {payload}[/yellow]")
            elif event_type in ("done", "error"):
                break
        console.print()

    if priming_message:
        asyncio.run(_stream_one(priming_message))

    while True:
        try:
            user_input = input("\nYou: ").strip()
        except (EOFError, KeyboardInterrupt):
            console.print("\n[dim]Goodbye.[/dim]")
            break
        if user_input.lower() in ("quit", "exit", "q"):
            console.print("[dim]Goodbye.[/dim]")
            break
        if not user_input:
            continue
        asyncio.run(_stream_one(user_input))


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
