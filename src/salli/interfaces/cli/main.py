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
reminders_app = typer.Typer(help="Filing and task reminders")
fi_app = typer.Typer(help="Financial independence score, goals, and strategy")
fi_goals_app = typer.Typer(help="FI goals")
fi_strategy_app = typer.Typer(help="FIRE strategy")
advisor_app = typer.Typer(help="Wealth Advisor")
advisor_reports_app = typer.Typer(help="Advisor reports")
documents_app = typer.Typer(help="Uploaded documents and memories")
billing_app = typer.Typer(help="Plans and subscription")
profile_app = typer.Typer(help="Fact-find profile: identity, risk, opening balances, income")

app.add_typer(accounts_app, name="accounts")
app.add_typer(entry_app, name="entry")
app.add_typer(ledger_app, name="ledger")
app.add_typer(tax_app, name="tax")
app.add_typer(agent_app, name="agent")
app.add_typer(parse_app, name="parse")
app.add_typer(reminders_app, name="reminders")
app.add_typer(fi_app, name="fi")
fi_app.add_typer(fi_goals_app, name="goals")
fi_app.add_typer(fi_strategy_app, name="strategy")
app.add_typer(advisor_app, name="advisor")
advisor_app.add_typer(advisor_reports_app, name="reports")
app.add_typer(documents_app, name="documents")
app.add_typer(billing_app, name="billing")
app.add_typer(profile_app, name="profile")


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


@entry_app.command("reverse")
def entry_reverse(
    entry_id: str = typer.Argument(..., help="ID of the journal entry to reverse"),
):
    """Post a reversing entry for a previously posted journal entry."""
    user_id = _require_user()
    try:
        reversing_id = asyncio.run(_services().ledger.reverse_entry(user_id, entry_id))
        console.print(f"[green]Reversing entry posted:[/green] {reversing_id}")
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
    """Print net income (income − expenses) for a date range."""
    from decimal import Decimal

    user_id = _require_user()
    svc = _services()

    async def _run() -> Decimal | None:
        accounts = await svc.ledger.list_accounts(user_id)
        income_ids = {a.id for a in accounts if a.type == "income"}
        expense_ids = {a.id for a in accounts if a.type == "expense"}
        if not income_ids and not expense_ids:
            return None
        return await svc.ledger.get_income_statement(
            user_id, from_date, to_date, income_ids, expense_ids
        )

    net_income = asyncio.run(_run())
    if net_income is None:
        console.print("[dim]No income/expense accounts found.[/dim]")
        return
    console.print(f"\n[bold]Income Statement[/bold]  {from_date} → {to_date}\n")
    console.print(f"  [bold]Net income:  LKR {net_income:>16,.2f}[/bold]\n")


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


# ── reminders ─────────────────────────────────────────────────────────────────


@reminders_app.command("list")
def reminders_list(
    status: str = typer.Option(None, "--status", help="Filter by status, e.g. 'pending'/'done'"),
):
    """List reminders."""
    user_id = _require_user()
    reminders = asyncio.run(_services().reminders.list_reminders(user_id, status))
    if not reminders:
        console.print("[dim]No reminders found.[/dim]")
        return
    table = Table(title="Reminders")
    table.add_column("ID", style="dim")
    table.add_column("Kind")
    table.add_column("Due Date")
    table.add_column("Status")
    for r in reminders:
        table.add_row(
            str(r.get("id", ""))[:8],
            r.get("kind", ""),
            str(r.get("due_date", "")),
            r.get("status", ""),
        )
    console.print(table)


@reminders_app.command("add")
def reminders_add(
    kind: str = typer.Argument(..., help="Reminder kind, e.g. 'quarterly_installment'"),
    due_date: str = typer.Option(..., "--due-date", help="YYYY-MM-DD"),
):
    """Create a reminder."""
    user_id = _require_user()
    reminder_id = asyncio.run(_services().reminders.create_reminder(user_id, kind, due_date))
    console.print(f"[green]Reminder created:[/green] {reminder_id}")


@reminders_app.command("done")
def reminders_done(
    reminder_id: str = typer.Argument(...),
):
    """Mark a reminder as done."""
    user_id = _require_user()
    asyncio.run(_services().reminders.mark_done(user_id, reminder_id))
    console.print(f"[green]Reminder marked done:[/green] {reminder_id}")


@reminders_app.command("delete")
def reminders_delete(
    reminder_id: str = typer.Argument(...),
):
    """Delete a reminder."""
    user_id = _require_user()
    asyncio.run(_services().reminders.delete_reminder(user_id, reminder_id))
    console.print(f"[green]Reminder deleted:[/green] {reminder_id}")


@reminders_app.command("seed")
def reminders_seed(
    year: str = typer.Option("2025/26", "--year", help="Year of assessment"),
):
    """Seed the standard filing calendar for a year of assessment."""
    user_id = _require_user()
    ids = asyncio.run(_services().reminders.seed_filing_calendar(user_id, year))
    console.print(f"[green]Seeded {len(ids)} reminder(s) for {year}.[/green]")


# ── fi ─────────────────────────────────────────────────────────────────────────


@fi_app.command("score")
def fi_score(
    recompute: bool = typer.Option(False, "--recompute", help="Force a fresh computation"),
):
    """Show the latest FI score, or recompute it."""
    user_id = _require_user()
    svc = _services()
    if recompute:
        score = asyncio.run(svc.fi.compute_score(user_id))
    else:
        score = asyncio.run(svc.fi.get_or_compute_score(user_id))

    console.print(f"\n[bold]FI Score[/bold]  (pack v{score.get('pack_version')})\n")
    console.print(
        f"  Overall score:        {score.get('overall_score')}  (grade {score.get('grade')})"
    )
    console.print(f"  Monthly income:       LKR {score.get('monthly_income')}")
    console.print(f"  Monthly expenses:     LKR {score.get('monthly_expenses')}")
    console.print(f"  Monthly surplus:      LKR {score.get('monthly_surplus')}")
    console.print(f"  Savings rate:         {score.get('savings_rate')}")
    console.print(f"  FI number:            LKR {score.get('fi_number')}")
    console.print(f"  Net worth:            LKR {score.get('net_worth')}")
    console.print(f"  Progress to FI:       {score.get('progress_to_fi')}")
    console.print(f"  Emergency fund:       {score.get('emergency_fund_months')} months")
    console.print(f"  Projected FI date:    {score.get('projected_fi_date')}\n")

    components = score.get("components") or []
    if components:
        table = Table(title="Score Components")
        table.add_column("Component")
        table.add_column("Score", justify="right")
        table.add_column("Weight", justify="right")
        table.add_column("Detail")
        for c in components:
            table.add_row(
                c.get("label", ""),
                str(c.get("score", "")),
                str(c.get("weight", "")),
                c.get("detail", ""),
            )
        console.print(table)


@fi_app.command("history")
def fi_history():
    """Show FI score history."""
    user_id = _require_user()
    history = asyncio.run(_services().fi.get_score_history(user_id))
    if not history:
        console.print("[dim]No score history found.[/dim]")
        return
    table = Table(title="FI Score History")
    table.add_column("Computed At")
    table.add_column("Score", justify="right")
    for s in history:
        table.add_row(str(s.get("created_at", "")), str(s.get("score", "")))
    console.print(table)


@fi_app.command("projections")
def fi_projections():
    """Show FI projection scenarios (conservative/base/growth)."""
    user_id = _require_user()
    proj = asyncio.run(_services().fi.get_projections(user_id))

    console.print(f"\n[bold]FI Projections[/bold]  (FI number: LKR {proj.get('fi_number')})\n")
    console.print(f"  FIRE year (conservative): {proj.get('fire_year_conservative')}")
    console.print(f"  FIRE year (base):         {proj.get('fire_year_base')}")
    console.print(f"  FIRE year (growth):       {proj.get('fire_year_growth')}")
    console.print(f"  Current portfolio:        LKR {proj.get('current_portfolio')}\n")

    points = proj.get("points") or []
    if points:
        table = Table(title="Projection by Year")
        table.add_column("Year", justify="right")
        table.add_column("Conservative", justify="right")
        table.add_column("Base", justify="right")
        table.add_column("Growth", justify="right")
        for p in points:
            table.add_row(
                str(p.get("year")),
                p.get("conservative", ""),
                p.get("base", ""),
                p.get("growth", ""),
            )
        console.print(table)


@fi_app.command("surplus")
def fi_surplus():
    """Show the monthly income/expense surplus breakdown."""
    user_id = _require_user()
    breakdown = asyncio.run(_services().fi.get_surplus_breakdown(user_id))

    console.print("\n[bold]Surplus Breakdown[/bold]\n")
    console.print(f"  Gross monthly income:    LKR {breakdown.get('gross_monthly_income')}")
    console.print(f"  Gross monthly expenses:  LKR {breakdown.get('gross_monthly_expenses')}")
    console.print(f"  Monthly surplus:         LKR {breakdown.get('monthly_surplus')}")
    console.print(f"  Savings rate:            {breakdown.get('savings_rate')}\n")

    income_by_source = breakdown.get("income_by_source") or {}
    if income_by_source:
        table = Table(title="Income by Source")
        table.add_column("Source")
        table.add_column("Amount", justify="right")
        for source, amount in income_by_source.items():
            table.add_row(source, amount)
        console.print(table)

    expense_by_category = breakdown.get("expense_by_category") or {}
    if expense_by_category:
        table = Table(title="Expenses by Category")
        table.add_column("Category")
        table.add_column("Amount", justify="right")
        for category, amount in expense_by_category.items():
            table.add_row(category, amount)
        console.print(table)


@fi_goals_app.command("list")
def fi_goals_list():
    """List financial goals."""
    user_id = _require_user()
    goals = asyncio.run(_services().fi.list_goals(user_id))
    if not goals:
        console.print("[dim]No goals found. Use 'salli fi goals add' to create one.[/dim]")
        return
    table = Table(title="Financial Goals")
    table.add_column("ID", style="dim")
    table.add_column("Name")
    table.add_column("Kind")
    table.add_column("Target", justify="right")
    table.add_column("Current", justify="right")
    table.add_column("Progress", justify="right")
    table.add_column("Target Date")
    for g in goals:
        table.add_row(
            str(g.get("id", ""))[:8],
            g.get("name", ""),
            g.get("kind", ""),
            g.get("target_amount", ""),
            g.get("current_amount", ""),
            f"{g.get('progress', 0) * 100:.0f}%",
            str(g.get("target_date", "")),
        )
    console.print(table)


@fi_goals_app.command("add")
def fi_goals_add(
    name: str = typer.Argument(..., help="Goal name"),
    kind: str = typer.Option("custom", "--kind"),
    target_amount: str = typer.Option(None, "--target-amount"),
    current_amount: str = typer.Option(None, "--current-amount"),
    target_date: str = typer.Option(None, "--target-date", help="YYYY-MM-DD"),
    priority: int = typer.Option(2, "--priority"),
):
    """Create a financial goal."""
    user_id = _require_user()
    data = {"name": name, "kind": kind, "priority": priority}
    if target_amount is not None:
        data["target_amount"] = target_amount
    if current_amount is not None:
        data["current_amount"] = current_amount
    if target_date is not None:
        data["target_date"] = target_date
    goal_id = asyncio.run(_services().fi.create_goal(user_id, data))
    console.print(f"[green]Goal created:[/green] {name} ({goal_id})")


@fi_goals_app.command("update")
def fi_goals_update(
    goal_id: str = typer.Argument(...),
    name: str = typer.Option(None, "--name"),
    target_amount: str = typer.Option(None, "--target-amount"),
    current_amount: str = typer.Option(None, "--current-amount"),
    target_date: str = typer.Option(None, "--target-date"),
    priority: int = typer.Option(None, "--priority"),
    is_active: bool = typer.Option(None, "--is-active/--is-inactive"),
):
    """Update fields on an existing goal."""
    user_id = _require_user()
    data = {}
    if name is not None:
        data["name"] = name
    if target_amount is not None:
        data["target_amount"] = target_amount
    if current_amount is not None:
        data["current_amount"] = current_amount
    if target_date is not None:
        data["target_date"] = target_date
    if priority is not None:
        data["priority"] = priority
    if is_active is not None:
        data["is_active"] = is_active
    if not data:
        console.print("[yellow]Nothing to update.[/yellow]")
        raise typer.Exit(1)
    asyncio.run(_services().fi.update_goal(user_id, goal_id, data))
    console.print(f"[green]Goal updated:[/green] {goal_id}")


@fi_goals_app.command("delete")
def fi_goals_delete(
    goal_id: str = typer.Argument(...),
):
    """Delete a goal."""
    user_id = _require_user()
    asyncio.run(_services().fi.delete_goal(user_id, goal_id))
    console.print(f"[green]Goal deleted:[/green] {goal_id}")


@fi_strategy_app.command("show")
def fi_strategy_show():
    """Show the current FIRE strategy."""
    user_id = _require_user()
    strategy = asyncio.run(_services().fi.get_strategy(user_id))
    if not strategy:
        console.print(
            "[dim]No strategy found. Use 'salli fi strategy generate' to create one.[/dim]"
        )
        return
    _print_strategy(strategy)


@fi_strategy_app.command("history")
def fi_strategy_history():
    """Show past FIRE strategy versions."""
    user_id = _require_user()
    history = asyncio.run(_services().fi.get_strategy_history(user_id))
    if not history:
        console.print("[dim]No strategy history found.[/dim]")
        return
    table = Table(title="Strategy History")
    table.add_column("Version", justify="right")
    table.add_column("Style")
    table.add_column("Created At")
    for s in history:
        table.add_row(
            str(s.get("version", "")), s.get("fire_style", ""), str(s.get("created_at", ""))
        )
    console.print(table)


@fi_strategy_app.command("generate")
def fi_strategy_generate():
    """Generate a new AI-assisted FIRE strategy (streams progress)."""
    user_id = _require_user()
    svc = _services()

    async def _run():
        strategy = None
        async for chunk in svc.fi.generate_strategy(user_id):
            if not chunk.startswith("data: "):
                continue
            import json

            payload = json.loads(chunk[len("data: ") :].strip())
            if payload.get("type") == "status":
                console.print(f"[dim]  ▸ {payload.get('message', '')}[/dim]")
            elif payload.get("type") == "done":
                strategy = payload.get("strategy")
        return strategy

    strategy = asyncio.run(_run())
    if strategy:
        console.print()
        _print_strategy(strategy)
    else:
        console.print("[yellow]No strategy generated.[/yellow]")


def _print_strategy(strategy: dict) -> None:
    console.print(
        f"\n[bold]FIRE Strategy[/bold]  (v{strategy.get('version')}, {strategy.get('fire_style')})\n"
    )
    console.print(f"  SWR:                      {strategy.get('swr')}")
    console.print(f"  Return (conservative):    {strategy.get('return_conservative')}")
    console.print(f"  Return (base):            {strategy.get('return_base')}")
    console.print(f"  Return (growth):          {strategy.get('return_growth')}")
    console.print(f"  Target monthly expenses:  {strategy.get('target_monthly_expenses')}")
    console.print(f"  Target age:               {strategy.get('target_age')}\n")

    buckets = strategy.get("buckets") or []
    if buckets:
        table = Table(title="Allocation Buckets")
        table.add_column("Bucket")
        table.add_column("Target %", justify="right")
        table.add_column("Description")
        for b in buckets:
            table.add_row(b.get("name", ""), f"{b.get('target_pct', '')}", b.get("description", ""))
        console.print(table)

    if strategy.get("ai_rationale"):
        console.print(f"\n[dim]{strategy['ai_rationale']}[/dim]")


# ── advisor ────────────────────────────────────────────────────────────────────


@advisor_app.command("run")
def advisor_run(
    trigger: str = typer.Option("manual", "--trigger"),
):
    """Run the Wealth Advisor and generate a fresh report."""
    user_id = _require_user()
    try:
        report = asyncio.run(_services().advisor.run_advisor(user_id, trigger=trigger))
    except Exception as e:  # QuotaExceeded or other billing gate
        console.print(f"[red]Error:[/red] {e}")
        raise typer.Exit(1)
    _print_advisor_report(report)


@advisor_reports_app.command("list")
def advisor_reports_list():
    """List past advisor reports."""
    user_id = _require_user()
    reports = asyncio.run(_services().advisor.list_reports(user_id))
    if not reports:
        console.print("[dim]No advisor reports found.[/dim]")
        return
    table = Table(title="Advisor Reports")
    table.add_column("ID", style="dim")
    table.add_column("Trigger")
    table.add_column("Created At")
    for r in reports:
        table.add_row(str(r.get("id", ""))[:8], r.get("trigger", ""), str(r.get("created_at", "")))
    console.print(table)


@advisor_reports_app.command("latest")
def advisor_reports_latest():
    """Show the most recent advisor report."""
    user_id = _require_user()
    report = asyncio.run(_services().advisor.get_latest_report(user_id))
    if not report:
        console.print(
            "[dim]No advisor report found. Use 'salli advisor run' to generate one.[/dim]"
        )
        return
    _print_advisor_report(report)


def _print_advisor_report(report: dict) -> None:
    console.print(f"\n[bold]Advisor Report[/bold]  ({report.get('id')})\n")
    console.print(f"  {report.get('summary', '')}\n")
    if report.get("fire_tier_assessment"):
        console.print(f"  [dim]{report['fire_tier_assessment']}[/dim]\n")

    recs = report.get("recommendations") or []
    if recs:
        table = Table(title="Recommendations")
        table.add_column("ID", style="dim")
        table.add_column("Title")
        table.add_column("Category")
        table.add_column("Status")
        for rec in recs:
            table.add_row(
                str(rec.get("id", ""))[:8],
                rec.get("title", ""),
                rec.get("category", ""),
                rec.get("status", ""),
            )
        console.print(table)


@advisor_app.command("apply")
def advisor_apply(
    report_id: str = typer.Argument(...),
    rec_id: str = typer.Argument(...),
):
    """Apply a recommendation from an advisor report."""
    user_id = _require_user()
    try:
        result = asyncio.run(_services().advisor.apply_recommendation(user_id, report_id, rec_id))
        console.print(f"[green]Recommendation applied:[/green] {result.get('id')}")
    except ValueError as e:
        console.print(f"[red]Error:[/red] {e}")
        raise typer.Exit(1)


@advisor_app.command("dismiss")
def advisor_dismiss(
    report_id: str = typer.Argument(...),
    rec_id: str = typer.Argument(...),
):
    """Dismiss a recommendation from an advisor report."""
    user_id = _require_user()
    try:
        result = asyncio.run(_services().advisor.dismiss_recommendation(user_id, report_id, rec_id))
        console.print(f"[green]Recommendation dismissed:[/green] {result.get('id')}")
    except ValueError as e:
        console.print(f"[red]Error:[/red] {e}")
        raise typer.Exit(1)


# ── documents ──────────────────────────────────────────────────────────────────


@documents_app.command("list")
def documents_list(
    namespace: str = typer.Option(None, "--namespace"),
    search: str = typer.Option(None, "--search"),
):
    """List uploaded documents."""
    user_id = _require_user()
    docs = asyncio.run(
        _services().documents.list_documents(user_id, namespace=namespace, search=search)
    )
    if not docs:
        console.print("[dim]No documents found.[/dim]")
        return
    table = Table(title="Documents")
    table.add_column("ID", style="dim")
    table.add_column("Title")
    table.add_column("Namespace")
    table.add_column("MIME Type")
    table.add_column("Created At")
    for d in docs:
        table.add_row(
            str(d.get("id", ""))[:8],
            d.get("title", ""),
            d.get("namespace", ""),
            d.get("mime_type", ""),
            str(d.get("created_at", "")),
        )
    console.print(table)


@documents_app.command("show")
def documents_show(
    doc_id: str = typer.Argument(...),
):
    """Show a document's details."""
    user_id = _require_user()
    doc = asyncio.run(_services().documents.get_document(user_id, doc_id))
    if not doc:
        console.print(f"[red]Document not found:[/red] {doc_id}")
        raise typer.Exit(1)
    for key, value in doc.items():
        console.print(f"  {key:<16} {value}")


@documents_app.command("delete")
def documents_delete(
    doc_id: str = typer.Argument(...),
):
    """Delete a document."""
    user_id = _require_user()
    asyncio.run(_services().documents.delete_document(user_id, doc_id))
    console.print(f"[green]Document deleted:[/green] {doc_id}")


# ── billing ────────────────────────────────────────────────────────────────────


@billing_app.command("plans")
def billing_plans():
    """List available billing plans."""
    plans = _services().billing.get_plans()
    table = Table(title="Plans")
    table.add_column("Key")
    table.add_column("Name")
    table.add_column("Price (USD/mo)", justify="right")
    table.add_column("Paid")
    for p in plans:
        table.add_row(
            p.get("key", ""),
            p.get("name", ""),
            str(p.get("monthly_price_usd", "")),
            "yes" if p.get("paid") else "no",
        )
    console.print(table)


@billing_app.command("subscription")
def billing_subscription():
    """Show current plan, status, and usage."""
    user_id = _require_user()
    entitlements = asyncio.run(_services().billing.get_entitlements(user_id))
    console.print("\n[bold]Subscription[/bold]\n")
    console.print(
        f"  Plan:                {entitlements.get('plan_name')} ({entitlements.get('plan')})"
    )
    console.print(f"  Status:              {entitlements.get('status')}")
    console.print(f"  Current period end:  {entitlements.get('current_period_end')}")
    console.print(f"  Cancel at period end: {entitlements.get('cancel_at_period_end')}\n")

    usage = entitlements.get("usage") or []
    if usage:
        table = Table(title="Usage")
        table.add_column("Metric")
        table.add_column("Used", justify="right")
        table.add_column("Limit", justify="right")
        table.add_column("Remaining", justify="right")
        table.add_column("Resets At")
        for u in usage:
            table.add_row(
                u.get("metric", ""),
                str(u.get("used", "")),
                str(u.get("limit", "")),
                str(u.get("remaining", "")),
                str(u.get("resets_at", "")),
            )
        console.print(table)


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


@agent_app.command("sessions")
def agent_sessions(
    limit: int = typer.Option(50, "--limit"),
):
    """List past chat sessions."""
    user_id = _require_user()
    sessions = asyncio.run(_services().agent.list_sessions(user_id, limit))
    if not sessions:
        console.print("[dim]No chat sessions found.[/dim]")
        return
    table = Table(title="Chat Sessions")
    table.add_column("Thread ID", style="dim")
    table.add_column("Title")
    table.add_column("Last Active")
    for s in sessions:
        table.add_row(
            str(s.get("thread_id", ""))[:8],
            s.get("title", ""),
            str(s.get("last_active_at", "")),
        )
    console.print(table)


@agent_app.command("history")
def agent_history(
    thread_id: str = typer.Argument(..., help="Thread ID to show the conversation for"),
):
    """Print the full message history for a chat thread."""
    user_id = _require_user()
    history = asyncio.run(_services().agent.get_history(user_id, thread_id))
    if not history:
        console.print("[dim]No history found for that thread.[/dim]")
        return
    for msg in history:
        role = msg.get("role", "")
        if role == "user":
            console.print(f"\n[bold cyan]You:[/bold cyan] {msg.get('content', '')}")
        else:
            console.print("\n[bold green]Salli:[/bold green]")
            for part in msg.get("parts", []):
                if part.get("type") == "text":
                    console.print(f"  {part.get('text', '')}")
                elif part.get("type") == "tool_call":
                    console.print(f"  [dim]▸ {part.get('name', '')}[/dim]")
                elif part.get("type") == "subagent_section":
                    console.print(f"  [dim]▸ subagent: {part.get('name', '')}[/dim]")


@agent_app.command("resume")
def agent_resume(
    thread_id: str = typer.Argument(..., help="Thread ID to continue chatting in"),
):
    """Resume an interactive chat REPL in an existing thread."""
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


# ── profile ───────────────────────────────────────────────────────────────────


@profile_app.command("show")
def profile_show():
    """Show the fact-find profile: identity, risk profile, life stage."""
    user_id = _require_user()
    profile = asyncio.run(_services().profile.get_profile(user_id))
    for key, value in profile.items():
        console.print(f"  {key:<20} {value}")


@profile_app.command("update")
def profile_update(
    display_name: str = typer.Option(None, "--display-name"),
    date_of_birth: str = typer.Option(None, "--date-of-birth", help="YYYY-MM-DD"),
    dependents_count: int = typer.Option(None, "--dependents-count"),
    employment_status: str = typer.Option(
        None, "--employment-status", help="employed|self_employed|unemployed|student|retired"
    ),
    employment_type: str = typer.Option(
        None, "--employment-type", help="permanent|contract|self_employed|other"
    ),
    residency_status: str = typer.Option(None, "--residency-status", help="resident|non_resident"),
    employer: str = typer.Option(None, "--employer"),
    ird_number: str = typer.Option(None, "--ird-number"),
):
    """Update identity fields on the fact-find profile."""
    user_id = _require_user()
    data: dict[str, object] = {}
    if display_name is not None:
        data["display_name"] = display_name
    if date_of_birth is not None:
        data["date_of_birth"] = date_of_birth
    if dependents_count is not None:
        data["dependents_count"] = dependents_count
    if employment_status is not None:
        data["employment_status"] = employment_status
    if employment_type is not None:
        data["employment_type"] = employment_type
    if residency_status is not None:
        data["residency_status"] = residency_status
    if employer is not None:
        data["employer"] = employer
    if ird_number is not None:
        data["ird_number"] = ird_number
    if not data:
        console.print("[yellow]Nothing to update.[/yellow]")
        raise typer.Exit(1)
    asyncio.run(_services().profile.update_identity(user_id, data))
    console.print("[green]Profile updated.[/green]")


@profile_app.command("risk-questionnaire")
def profile_risk_questionnaire(
    time_horizon_years: int = typer.Option(..., "--time-horizon-years"),
    drawdown_reaction: str = typer.Option(
        ..., "--drawdown-reaction", help="sell_all|sell_some|hold|buy_more"
    ),
    income_stability: str = typer.Option(
        ..., "--income-stability", help="unstable|moderate|stable"
    ),
    investment_experience: str = typer.Option(
        ..., "--investment-experience", help="none|some|experienced"
    ),
    dependents_count: int = typer.Option(0, "--dependents-count"),
):
    """Submit the risk-tolerance questionnaire and persist the scored result."""
    user_id = _require_user()
    result = asyncio.run(
        _services().profile.submit_risk_questionnaire(
            user_id,
            {
                "time_horizon_years": time_horizon_years,
                "drawdown_reaction": drawdown_reaction,
                "income_stability": income_stability,
                "investment_experience": investment_experience,
                "dependents_count": dependents_count,
            },
        )
    )
    console.print(f"\n[bold]Risk score:[/bold] {result['score']} ({result['category']})\n")
    for key, points in result["breakdown"].items():
        console.print(f"  {key:<24} {points}")


@profile_app.command("balance-sheet")
def profile_balance_sheet(
    balance: list[str] = typer.Option(..., "--balance", help="CODE:NAME:TYPE:AMOUNT (repeat)"),
):
    """Declare opening balances — posts real journal entries (asset|liability)."""
    user_id = _require_user()
    items = []
    for raw in balance:
        try:
            code, name, type_, amount = raw.split(":", 3)
        except ValueError:
            console.print(f"[red]Invalid format '{raw}'. Use CODE:NAME:TYPE:AMOUNT[/red]")
            raise typer.Exit(1)
        items.append({"code": code, "name": name, "type": type_, "amount": amount})
    entry_ids = asyncio.run(_services().profile.declare_opening_balances(user_id, items))
    console.print(f"[green]Posted {len(entry_ids)} opening-balance entry(ies).[/green]")


@profile_app.command("income")
def profile_income(
    income: list[str] = typer.Option(..., "--income", help="CODE:NAME:AMOUNT (repeat)"),
    deposit_account_code: str = typer.Option("1200", "--deposit-account-code"),
    deposit_account_name: str = typer.Option("Bank Account", "--deposit-account-name"),
):
    """Declare income sources — posts one representative monthly entry each."""
    user_id = _require_user()
    items = []
    for raw in income:
        try:
            code, name, amount = raw.split(":", 2)
        except ValueError:
            console.print(f"[red]Invalid format '{raw}'. Use CODE:NAME:AMOUNT[/red]")
            raise typer.Exit(1)
        items.append(
            {
                "code": code,
                "name": name,
                "amount": amount,
                "deposit_account_code": deposit_account_code,
                "deposit_account_name": deposit_account_name,
            }
        )
    entry_ids = asyncio.run(_services().profile.declare_income(user_id, items))
    console.print(f"[green]Posted {len(entry_ids)} income entry(ies).[/green]")


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
