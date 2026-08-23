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


# ── Persona is server-owned on resume/replay ─────────────────────────────────


class _FakeSessionRepo:
    def __init__(self, session: dict | None) -> None:
        self._session = session

    async def get(self, user_id: str, thread_id: str) -> dict | None:
        return self._session


class _FakeUoW:
    def __init__(self, session: dict | None) -> None:
        self.agent_sessions = _FakeSessionRepo(session)

    async def __aenter__(self) -> _FakeUoW:
        return self

    async def __aexit__(self, *exc: object) -> None:
        return None


def _service_with_session(session: dict | None) -> AgentService:
    return AgentService(ledger_svc=None, tax_svc=None, uow_factory=lambda: _FakeUoW(session))


@pytest.mark.asyncio
async def test_stored_persona_wins_over_the_requested_one():
    """A client resuming a buddy thread without echoing persona must not get the
    scrooge graph. Both graphs have identical topology, so the mismatch wouldn't
    raise — it would silently run the wrong prompt over a pending write approval."""
    svc = _service_with_session({"persona": "buddy"})
    assert await svc._persona_for_thread("u1", "t1", "scrooge") == "buddy"


@pytest.mark.asyncio
async def test_falls_back_when_the_thread_predates_session_tracking():
    svc = _service_with_session(None)
    assert await svc._persona_for_thread("u1", "t1", "buddy") == "buddy"


@pytest.mark.asyncio
async def test_unknown_stored_persona_falls_back_rather_than_picking_no_graph():
    svc = _service_with_session({"persona": "not-a-persona"})
    assert await svc._persona_for_thread("u1", "t1", "buddy") == "buddy"


@pytest.mark.asyncio
async def test_no_db_falls_back_to_the_requested_persona():
    svc = AgentService(ledger_svc=None, tax_svc=None)
    assert await svc._persona_for_thread("u1", "t1", "buddy") == "buddy"
