"""
Parse a free-text / dictated sentence into a DRAFT double-entry journal entry.

The LLM only *extracts* the amount the user stated and *maps* the description to
existing account IDs from the user's chart — it never computes money and never
posts. The draft pre-fills the New Entry form; the user reviews and posts it
through the deterministic, balance-checked `POST /entries/` path. This mirrors
the posture of adapters/parsing/llm_classifier.py.
"""

from __future__ import annotations

import json
from typing import Any

from salli.application.ports import LLMPort
from salli.application.services.ledger_service import LedgerService

_DRAFT_SCHEMA: dict[str, Any] = {
    "title": "JournalEntryDraft",
    "description": "A draft double-entry journal entry parsed from the user's own words.",
    "type": "object",
    "properties": {
        "entry_type": {
            "type": "string",
            "enum": ["income", "expense", "transfer"],
            "description": "expense = money paid out; income = money received; transfer = moved between own accounts.",
        },
        "amount": {
            "type": "string",
            "description": "The amount exactly as stated by the user, as a plain number string (no currency symbol, no commas). Never invent or compute an amount; if none is stated, use an empty string.",
        },
        "description": {
            "type": "string",
            "description": "A short human description of the transaction (e.g. 'Groceries — Keells').",
        },
        "debit_account_id": {
            "type": ["string", "null"],
            "description": "Id of the account to DEBIT, ONLY from the provided chart. null if the user did not clearly indicate one — do not guess a default.",
        },
        "credit_account_id": {
            "type": ["string", "null"],
            "description": "Id of the account to CREDIT, ONLY from the provided chart. null if the user did not clearly indicate one — do not guess a default.",
        },
        "currency": {"type": "string", "description": "ISO code; default LKR."},
        "confidence": {
            "type": "number",
            "description": "0.0–1.0 confidence that the account mapping is correct.",
        },
    },
    "required": [
        "entry_type",
        "amount",
        "description",
        "debit_account_id",
        "credit_account_id",
        "currency",
        "confidence",
    ],
}

_PROMPT = """You convert a person's plain-language note about a single transaction into a DRAFT \
double-entry journal entry. You do NOT post anything; the user reviews your draft first.

The user's chart of accounts (choose account ids ONLY from this list — never invent an id):
{accounts}

Double-entry rules:
- expense (money paid out): DEBIT the matching expense account, CREDIT the asset/bank/cash account paid from.
- income (money received): DEBIT the asset/bank/cash account received into, CREDIT the matching income account.
- transfer (between the user's own accounts): DEBIT the destination asset account, CREDIT the source asset account.

Rules:
- Extract the amount EXACTLY as the user stated it. Never compute, sum, or invent an amount. If no amount is stated, return an empty string.
- Choose accounts ONLY from the chart above, and ONLY when the user's note clearly points to one. Match on the account's name/purpose (e.g. "groceries" → the groceries expense account; "commercial bank" → that bank asset account).
- If the user did NOT indicate an account for a side — no bank/cash source named, or the category is unclear/ambiguous — return null for that side and lower the confidence. A null account is the correct, expected answer when the user omitted that detail. NEVER guess, and NEVER fall back to a "default" or "main" account. The user will pick it in the form.
- currency defaults to LKR unless the user clearly says otherwise.
- Keep the description short and human.

User's note:
\"\"\"{text}\"\"\"
"""


class EntryParseService:
    def __init__(self, ledger: LedgerService, llm: LLMPort) -> None:
        self._ledger = ledger
        self._llm = llm

    async def parse_draft(self, user_id: str, text: str) -> dict[str, Any]:
        accounts = [a for a in await self._ledger.list_accounts(user_id) if a.is_active]
        chart = [{"id": a.id, "code": a.code, "name": a.name, "type": a.type} for a in accounts]
        prompt = _PROMPT.format(accounts=json.dumps(chart, ensure_ascii=False), text=text.strip())

        draft = await self._llm.extract_structured(prompt, _DRAFT_SCHEMA, model_tier="fast")

        # Guard: never let a hallucinated account id through — only ids from the chart.
        valid_ids = {a.id for a in accounts}
        for side in ("debit_account_id", "credit_account_id"):
            if draft.get(side) not in valid_ids:
                draft[side] = None

        # Normalise the amount to a plain number string (strip commas / currency noise).
        amount = str(draft.get("amount") or "").replace(",", "").strip()
        draft["amount"] = amount
        draft["currency"] = (draft.get("currency") or "LKR").upper()
        if draft.get("entry_type") not in ("income", "expense", "transfer"):
            draft["entry_type"] = "expense"
        return draft
