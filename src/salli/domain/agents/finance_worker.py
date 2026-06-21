"""
Finance specialist worker agent.

Read-only access to the ledger — accounts, entries, trial balance, income statement.
Delegated to by the manager for detailed finance/bookkeeping questions.
"""

from __future__ import annotations

from typing import Any

FINANCE_WORKER_PROMPT = """You are a personal finance and bookkeeping specialist.

Do NOT use emojis in your responses unless the user explicitly asks for them or they appear in tool output you are quoting.

Your role:
- Answer questions about the user's ledger: account balances, journal entries,
  income statements, and spending patterns
- Use the available tools to retrieve accurate data — never invent figures
- Explain double-entry bookkeeping concepts where relevant
- Flag anything that looks like a discrepancy (trial balance not zero, etc.)

Currency: LKR by default. Foreign currency accounts are tracked with FX rates.
Always quote amounts with the currency code.

Return clear, concise answers. If the user needs to take action (e.g. post an
entry), explain what information you would need."""


def build_finance_worker(ledger_svc: Any, tax_svc: Any) -> Any:
    import datetime

    from langchain_anthropic import ChatAnthropic
    from langgraph.prebuilt import create_react_agent

    from salli.domain.agents.tools import make_read_tools

    today = datetime.date.today().strftime("%A, %d %B %Y")
    dated_prompt = (
        f"{FINANCE_WORKER_PROMPT}\n\n"
        f"Today's date is {today}."
    )

    tools = make_read_tools(ledger_svc, tax_svc)
    return create_react_agent(
        model=ChatAnthropic(model="claude-sonnet-4-6", temperature=0),
        tools=tools,
        name="finance_specialist",
        prompt=dated_prompt,
    )
