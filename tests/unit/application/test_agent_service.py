"""Unit tests for AgentService's message-construction helpers (no LLM calls)."""

from __future__ import annotations

import pytest
from langchain_core.messages import HumanMessage, SystemMessage

from salli.application.services.agent_service import AgentService


def _service() -> AgentService:
    # ledger_svc/tax_svc are unused by _build_input_messages — pass placeholders.
    return AgentService(ledger_svc=None, tax_svc=None)


@pytest.mark.asyncio
async def test_neutral_message_has_no_tone_system_message():
    svc = _service()
    messages = await svc._build_input_messages("u1", "What's my account balance?")

    assert len(messages) == 1
    assert isinstance(messages[0], HumanMessage)


@pytest.mark.asyncio
async def test_frustrated_message_prepends_tone_system_message():
    svc = _service()
    messages = await svc._build_input_messages("u1", "This is so frustrating, nothing works!!!")

    assert len(messages) == 2
    assert isinstance(messages[0], SystemMessage)
    assert "acknowledge" in messages[0].content.lower()
    assert isinstance(messages[1], HumanMessage)


@pytest.mark.asyncio
async def test_anxious_message_prepends_tone_system_message():
    svc = _service()
    messages = await svc._build_input_messages("u1", "I'm so worried about my debt")

    assert len(messages) == 2
    assert isinstance(messages[0], SystemMessage)
    assert "reassur" in messages[0].content.lower()


@pytest.mark.asyncio
async def test_positive_message_prepends_tone_system_message():
    svc = _service()
    messages = await svc._build_input_messages("u1", "Thank you, this is awesome!")

    assert len(messages) == 2
    assert isinstance(messages[0], SystemMessage)
    assert "momentum" in messages[0].content.lower()


@pytest.mark.asyncio
async def test_human_message_content_is_preserved():
    svc = _service()
    messages = await svc._build_input_messages("u1", "I'm worried about my savings")

    human = messages[-1]
    assert isinstance(human, HumanMessage)
    assert human.content == "I'm worried about my savings"
