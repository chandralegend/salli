"""
LangGraph tool definitions for the Salli agent system.

Tools are grouped:
  - READ tools: trial balance, accounts, tax computation, tax packs (no approval)
  - WEB tools: Tavily web search (no approval)
  - DOCUMENT tools: save/read/list/update/delete documents and named memories (no approval)
  - WRITE tools: create account, post entry, create reminder (interrupt → user approval)

The write tools use langgraph interrupt() to pause execution and ask the user to
approve or deny the action before it executes. The agent resumes via Command(resume=...).
"""

from __future__ import annotations

import contextvars
from decimal import Decimal
from typing import Annotated, Any

from langchain_core.tools import tool

# The authenticated user for the current agent run. Set per-request by AgentService
# before the graph executes, so tools always act on the signed-in user's data —
# the user_id is NEVER taken from the LLM (correctness + tenant isolation).
_current_user: contextvars.ContextVar[str] = contextvars.ContextVar(
    "salli_current_user", default="dev-user"
)


def set_current_user(user_id: str) -> None:
    _current_user.set(user_id)


# ── Read-only tools (re-exported for worker agents) ───────────────────────────


def make_read_tools(ledger_svc: Any, tax_svc: Any) -> list[Any]:
    """Return the 5 read-only tools for worker agents."""

    @tool
    async def get_trial_balance(
        from_date: Annotated[str | None, "Start date YYYY-MM-DD"] = None,
        to_date: Annotated[str | None, "End date YYYY-MM-DD"] = None,
    ) -> dict[str, Any]:
        """Return the trial balance (account balances) for the user's ledger."""
        user_id = _current_user.get()
        balances = await ledger_svc.get_trial_balance(user_id, from_date, to_date)
        return {
            "trial_balance": {k: str(v) for k, v in balances.items()},
            "net": str(sum(balances.values(), Decimal(0))),
        }

    @tool
    async def get_accounts(
    ) -> dict[str, Any]:
        """List all accounts in the user's chart of accounts."""
        user_id = _current_user.get()
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
    ) -> dict[str, Any]:
        """
        Return the latest stored tax computation for the given year.
        If none exists, compute it now. Numbers here are authoritative;
        narrate them — do NOT recompute or adjust them.
        """
        user_id = _current_user.get()
        result = await tax_svc.compute_tax(user_id, year)

        def _bw(bw: Any) -> dict[str, str]:
            if isinstance(bw, dict):
                return {
                    "from": str(bw.get("from_amount", "0")),
                    "to": str(bw["to_amount"]) if bw.get("to_amount") else "∞",
                    "rate": str(bw.get("rate", "")),
                    "taxable_in_band": str(bw.get("taxable_in_band", "0")),
                    "tax": str(bw.get("tax", "0")),
                }
            return {
                "from": str(bw.from_amount),
                "to": str(bw.to_amount) if bw.to_amount else "∞",
                "rate": str(bw.rate),
                "taxable_in_band": str(bw.taxable_in_band),
                "tax": str(bw.tax),
            }

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
            "band_workings": [_bw(bw) for bw in result.band_workings],
        }

    @tool
    def list_tax_packs() -> dict[str, Any]:
        """List available tax packs (country, year, version)."""
        packs = tax_svc.list_packs()
        return {
            "packs": [
                {
                    "country": p.country,
                    "year": p.year,
                    "version": p.version,
                    "period_start": p.period_start,
                    "period_end": p.period_end,
                }
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
            return {"error": f"Band index {band_index} out of range (0–{len(pack.bands) - 1})"}
        band = pack.bands[band_index]
        return {
            "band_index": band_index,
            "upto": str(band.upto) if band.upto else "unbounded",
            "rate": str(band.rate),
            "rate_pct": f"{float(band.rate) * 100:.0f}%",
            "personal_relief": str(pack.personal_relief),
        }

    return [get_trial_balance, get_accounts, get_tax_computation, list_tax_packs, explain_tax_band]


# ── Manager tools factory (web search + documents + write with approval) ───────


def make_manager_tools(doc_svc: Any, ledger_svc: Any, tax_svc: Any) -> list[Any]:
    """
    Return the manager-only tools:
      - web_search (Tavily)
      - save_document, read_document, update_document, list_documents, delete_document
      - save_memory, get_memory, list_memories
      - create_account, create_reminder, post_journal_entry (all need user approval)
    """

    # ── Web search ────────────────────────────────────────────────────────────
    try:
        from langchain_community.tools.tavily_search import TavilySearchResults

        web_search = TavilySearchResults(
            max_results=5,
            description=(
                "Search the internet for current Sri Lanka tax laws, IRD circulars, "
                "exchange rates, financial news, or any other real-time information. "
                "Always cite the source URL in your response."
            ),
        )
    except Exception:
        # Tavily not configured — provide a stub so the agent still loads
        @tool
        def web_search(query: Annotated[str, "Search query"]) -> str:
            """Search the internet. (Currently unavailable — TAVILY_API_KEY not set.)"""
            return "Web search unavailable: TAVILY_API_KEY is not configured."

    # ── Document tools ────────────────────────────────────────────────────────

    @tool
    async def save_document(
        title: Annotated[str, "Document title"],
        content: Annotated[str, "Document content (plain text or markdown)"],
        tags: Annotated[list[str], "Optional list of tags for categorisation"] = [],
        description: Annotated[str | None, "Short description of the document"] = None,
    ) -> dict[str, Any]:
        """
        Save a text document to the user's document store.
        Use this to record notes, summaries, extracted data, or any information
        the user might want to retrieve later. Documents persist across sessions.
        """
        user_id = _current_user.get()
        doc_id = await doc_svc.save_document(
            user_id,
            title=title,
            content=content,
            tags=tags,
            description=description,
            source="agent_created",
            namespace="documents",
        )
        return {"doc_id": doc_id, "title": title, "saved": True}

    @tool
    async def read_document(
        doc_id: Annotated[str, "Document ID returned by save_document or list_documents"],
    ) -> dict[str, Any]:
        """Retrieve a saved document by its ID."""
        user_id = _current_user.get()
        doc = await doc_svc.get_document(user_id, doc_id)
        if not doc:
            return {"error": f"Document {doc_id} not found"}
        return doc

    @tool
    async def update_document(
        doc_id: Annotated[str, "Document ID to update"],
        title: Annotated[str | None, "New title (leave None to keep current)"] = None,
        content: Annotated[str | None, "New content (leave None to keep current)"] = None,
    ) -> dict[str, Any]:
        """Update the title or content of an existing document."""
        updates: dict[str, Any] = {}
        if title is not None:
            updates["title"] = title
        if content is not None:
            updates["content"] = content
        if not updates:
            return {"error": "No updates provided"}
        user_id = _current_user.get()
        await doc_svc.update_document(user_id, doc_id, **updates)
        return {"doc_id": doc_id, "updated": True}

    @tool
    async def list_documents(
        namespace: Annotated[str | None, "Filter by namespace: 'documents' or 'memories'"] = None,
        tags: Annotated[list[str], "Filter by tags"] = [],
        search_query: Annotated[str | None, "Full-text search over title and content"] = None,
    ) -> dict[str, Any]:
        """List saved documents. Filter by namespace, tags, or a search query."""
        user_id = _current_user.get()
        docs = await doc_svc.list_documents(
            user_id,
            tags=tags or None,
            namespace=namespace,
            search=search_query,
        )
        return {
            "count": len(docs),
            "documents": [
                {
                    "id": d["id"],
                    "title": d["title"],
                    "namespace": d["namespace"],
                    "tags": d["tags"],
                    "source": d["source"],
                    "description": d.get("description"),
                    "updated_at": d.get("updated_at"),
                }
                for d in docs
            ],
        }

    @tool
    async def delete_document(
        doc_id: Annotated[str, "Document ID to delete"],
    ) -> dict[str, Any]:
        """Permanently delete a document from the user's document store."""
        user_id = _current_user.get()
        await doc_svc.delete_document(user_id, doc_id)
        return {"doc_id": doc_id, "deleted": True}

    # ── Memory tools ──────────────────────────────────────────────────────────

    @tool
    async def save_memory(
        slug: Annotated[str, "Unique memory key, e.g. 'accountant_name', 'tax_year_goal'"],
        value: Annotated[str, "Value to store (plain text)"],
    ) -> dict[str, Any]:
        """
        Save or update a named memory. Memories persist across all sessions.
        Use slugs like 'accountant_name', 'tax_notes_2025', 'employer_name'.
        Calling save_memory with the same slug overwrites the previous value.
        """
        user_id = _current_user.get()
        doc_id = await doc_svc.save_memory(user_id, slug=slug, value=value)
        return {"slug": slug, "saved": True, "doc_id": doc_id}

    @tool
    async def get_memory(
        slug: Annotated[str, "Memory key to retrieve"],
    ) -> dict[str, Any]:
        """Retrieve a named memory by its slug key."""
        user_id = _current_user.get()
        mem = await doc_svc.get_memory(user_id, slug=slug)
        if not mem:
            return {"slug": slug, "found": False}
        return {"slug": slug, "found": True, "value": mem.get("content"), "updated_at": mem.get("updated_at")}

    @tool
    async def list_memories(
    ) -> dict[str, Any]:
        """List all named memories stored for this user."""
        user_id = _current_user.get()
        mems = await doc_svc.list_memories(user_id)
        return {
            "count": len(mems),
            "memories": [{"slug": m.get("slug"), "value": m.get("content"), "updated_at": m.get("updated_at")} for m in mems],
        }

    # ── Write tools (require user approval via interrupt) ─────────────────────

    @tool
    async def create_account(
        code: Annotated[str, "Account code, e.g. '1010'"],
        name: Annotated[str, "Account name, e.g. 'Cash — BOC'"],
        account_type: Annotated[str, "One of: asset, liability, equity, income, expense"],
        currency: Annotated[str, "Currency code, e.g. 'LKR'"] = "LKR",
    ) -> str:
        """
        Create a new account in the chart of accounts.
        This action modifies the ledger and requires user approval before execution.
        """
        from langgraph.types import interrupt

        decision = interrupt(
            {
                "type": "action_approval",
                "action": "create_account",
                "description": f"Create account '{code} – {name}' (type: {account_type}, currency: {currency})",
                "params": {"code": code, "name": name, "type": account_type, "currency": currency},
            }
        )
        if decision == "approved":
            from salli.domain.accounting.models import Account

            account = Account(
                id="",
                code=code,
                name=name,
                type=account_type,  # type: ignore[arg-type]
                currency=currency,
            )
            user_id = _current_user.get()
            acct_id = await ledger_svc.add_account(user_id, account)
            return f"Account created: {name} ({code}), id={acct_id}"
        return "Action cancelled by user."

    @tool
    async def create_reminder(
        description: Annotated[str, "Reminder description / kind"],
        due_date: Annotated[str, "Due date as YYYY-MM-DD"],
    ) -> str:
        """
        Create a new reminder / deadline.
        This action modifies app data and requires user approval before execution.
        """
        from langgraph.types import interrupt

        decision = interrupt(
            {
                "type": "action_approval",
                "action": "create_reminder",
                "description": f"Create reminder: '{description}' due {due_date}",
                "params": {"description": description, "due_date": due_date},
            }
        )
        if decision == "approved":
            from salli.application.services.reminder_service import ReminderService

            user_id = _current_user.get()
            reminder_svc = ReminderService(ledger_svc._uow_factory)
            reminder_id = await reminder_svc.create_reminder(user_id, description, due_date)
            return f"Reminder created: '{description}' due {due_date}, id={reminder_id}"
        return "Action cancelled by user."

    @tool
    async def post_journal_entry(
        entry_date: Annotated[str, "Transaction date YYYY-MM-DD"],
        description: Annotated[str, "Human-readable description of the transaction"],
        debit_account_id: Annotated[str, "Account ID to debit"],
        credit_account_id: Annotated[str, "Account ID to credit"],
        amount: Annotated[str, "Amount as a decimal string, e.g. '10000.00'"],
        currency: Annotated[str, "Currency code"] = "LKR",
    ) -> str:
        """
        Post a double-entry journal entry to the ledger.
        This action modifies financial records and requires user approval before execution.
        """
        from langgraph.types import interrupt

        decision = interrupt(
            {
                "type": "action_approval",
                "action": "post_journal_entry",
                "description": (
                    f"Post {currency} {amount} — Dr {debit_account_id} / Cr {credit_account_id} "
                    f"on {entry_date}: {description}"
                ),
                "params": {
                    "entry_date": entry_date,
                    "description": description,
                    "debit_account_id": debit_account_id,
                    "credit_account_id": credit_account_id,
                    "amount": amount,
                    "currency": currency,
                },
            }
        )
        if decision == "approved":
            from decimal import Decimal as D

            from salli.domain.accounting.models import Direction

            user_id = _current_user.get()
            postings_data = [
                {
                    "account_id": debit_account_id,
                    "direction": Direction.DEBIT,
                    "amount": D(amount),
                    "currency": currency,
                },
                {
                    "account_id": credit_account_id,
                    "direction": Direction.CREDIT,
                    "amount": D(amount),
                    "currency": currency,
                },
            ]
            try:
                entry_id = await ledger_svc.add_entry(
                    user_id, entry_date, description, "manual", postings_data
                )
            except ValueError as exc:
                return f"Could not post entry: {exc}"
            return f"Journal entry posted: id={entry_id}"
        return "Action cancelled by user."

    return [
        web_search,
        save_document,
        read_document,
        update_document,
        list_documents,
        delete_document,
        save_memory,
        get_memory,
        list_memories,
        create_account,
        create_reminder,
        post_journal_entry,
    ]


# ── Backward-compat factory (original 5-tool signature) ───────────────────────


def make_tools(ledger_svc: Any, tax_svc: Any) -> list[Any]:
    """Legacy factory — returns read-only tools. Used by tax_agent.py."""
    return make_read_tools(ledger_svc, tax_svc)
