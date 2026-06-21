"""
Wealth Advisor LLM — turns DETERMINISTIC financial figures into prioritised,
actionable recommendations. The model never computes money; it is handed the FI
score, balances, and current rates and only narrates/prioritises.
"""

from __future__ import annotations

import json
from typing import Any, Literal

from pydantic import BaseModel, Field

ADVISOR_PROMPT = """You are Salli's Wealth Advisor — a sharp, proven money coach for Sri Lanka.

Apply time-tested wealth principles, in priority order:
1. Hold a 3–6 month emergency fund in liquid savings before investing aggressively.
2. Eliminate high-interest debt fast.
3. Pay yourself first — automate saving, target a 20%+ savings rate and raise it over time.
4. Don't let idle cash rot — move surplus into fixed deposits / T-bills for safe yield.
5. Invest the rest for long-term growth, diversified to the person's risk appetite.
6. Avoid lifestyle inflation; channel raises into investments.
7. Use tax-efficient choices where they exist.

You are given DETERMINISTIC figures (FI score, savings rate, net worth, balances, current
rates). NEVER recompute or invent numbers — reference the ones provided. Tailor advice to THIS
person's goals, motivation, and risk appetite. Be specific and concrete (name amounts/instruments
from the data, e.g. "move the LKR X idle in savings into a 1-year FD at ~Y%"). Keep each rationale
to 1–2 sentences. Do NOT use emojis."""


class SuggestedAction(BaseModel):
    type: Literal["none", "reminder"] = "none"
    label: str = Field(default="", description="Human label, e.g. 'Open a 1-year fixed deposit'")
    due_in_days: int | None = Field(default=None, description="If a reminder, days from today")


class Recommendation(BaseModel):
    title: str = Field(description="Short imperative recommendation")
    rationale: str = Field(description="1–2 sentences grounded in the figures")
    category: str = Field(description="emergency_fund|debt|savings|investing|spending|tax|goal")
    priority: int = Field(default=2, description="1 high, 2 medium, 3 low")
    action: SuggestedAction = SuggestedAction()


class Advice(BaseModel):
    summary: str = Field(description="2–3 sentence headline of where they stand and the #1 move")
    recommendations: list[Recommendation] = Field(default_factory=list)


async def generate_advice(context: dict[str, Any]) -> Advice:
    from langchain_anthropic import ChatAnthropic
    from langchain_core.messages import HumanMessage, SystemMessage

    model = ChatAnthropic(model="claude-sonnet-4-6", temperature=0.3, max_tokens=2000)
    structured = model.with_structured_output(Advice)
    payload = json.dumps(context, indent=2, default=str)
    result = await structured.ainvoke([
        SystemMessage(content=ADVISOR_PROMPT),
        HumanMessage(content=f"Here is the person's current financial picture:\n\n{payload}\n\n"
                             f"Produce 3–6 prioritised recommendations."),
    ])
    return result  # type: ignore[return-value]
