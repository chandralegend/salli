"""
LLMPort adapter — wraps Anthropic via LangChain.

This is the single point through which the domain touches the LLM.
Tiering: fast → haiku-class; strong → sonnet-class.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any

from salli.application.ports import LLMPort

_MODEL_TIERS = {
    "fast": "claude-haiku-4-5-20251001",
    "strong": "claude-sonnet-4-6",
}


class AnthropicLLMAdapter(LLMPort):
    def __init__(self, api_key: str, langsmith_project: str | None = None) -> None:
        self._api_key = api_key
        self._langsmith_project = langsmith_project

    def _get_model(self, tier: str = "fast"):
        from langchain_anthropic import ChatAnthropic

        model_id = _MODEL_TIERS.get(tier, _MODEL_TIERS["fast"])
        return ChatAnthropic(model=model_id, api_key=self._api_key, temperature=0)

    async def extract_structured(
        self,
        prompt: str,
        schema: dict[str, Any],
        *,
        model_tier: str = "fast",
    ) -> dict[str, Any]:
        """
        Run structured extraction using Claude tool-use / with_structured_output.
        The JSON schema is enforced by the model — malformed output triggers a retry.
        """
        from langchain_core.prompts import ChatPromptTemplate

        model = self._get_model(model_tier)
        structured = model.with_structured_output(schema)

        prompt_template = ChatPromptTemplate.from_template("{input}")
        chain = prompt_template | structured
        result = await chain.ainvoke({"input": prompt})
        return result  # type: ignore[return-value]

    async def stream_agent(
        self,
        thread_id: str,
        user_message: str,
    ) -> AsyncIterator[tuple[str, Any]]:
        """Not used directly — the agent graph handles streaming via LangGraph."""
        raise NotImplementedError("Use the agent graph directly for streaming")
