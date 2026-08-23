"""Quick-add parsing and Voice Mode transcription used to exist only when a
*platform* key was configured, so they 503'd for exactly the users BYOK is for.
These pin the new behaviour: the services always exist, and which key they run
on — or whether they're usable at all — is decided per request.

This is not hypothetical for transcription: production has no platform OpenAI
key, so a user's own key is currently the only way Voice Mode works.
"""

from __future__ import annotations

from typing import Any

import pytest

from salli.application.services.entry_parse_service import EntryParseService
from salli.application.services.llm_credential_service import ResolvedCredentials
from salli.application.services.transcription_service import (
    TranscriptionService,
    TranscriptionUnavailable,
)
from salli.domain.secrets import Secret


class FakeCredentials:
    def __init__(self, anthropic: str = "", openai: str | None = None) -> None:
        self._anthropic = anthropic
        self._openai = openai
        self.resolved_for: list[str] = []

    async def resolve(self, user_id: str) -> ResolvedCredentials:
        self.resolved_for.append(user_id)
        return ResolvedCredentials(
            anthropic=Secret(self._anthropic),
            openai=Secret(self._openai) if self._openai else None,
            anthropic_is_user_key=bool(self._anthropic),
            openai_is_user_key=bool(self._openai),
        )


# ── Transcription ─────────────────────────────────────────────────────────────


class FakeWhisper:
    def __init__(self, api_key: Any) -> None:
        self.api_key = api_key

    async def transcribe(self, audio: bytes, *, filename: str, mime_type: str) -> str:
        return "  hello there  "


@pytest.mark.asyncio
async def test_transcription_uses_the_users_key_with_no_platform_key():
    creds = FakeCredentials(openai="sk-proj-USER")
    built: list[FakeWhisper] = []

    def factory(key: Any) -> FakeWhisper:
        adapter = FakeWhisper(key)
        built.append(adapter)
        return adapter

    svc = TranscriptionService(factory, creds)
    assert await svc.transcribe("u1", b"audio", filename="v.m4a", mime_type="audio/m4a") == (
        "hello there"
    )
    assert built[0].api_key.reveal() == "sk-proj-USER"


@pytest.mark.asyncio
async def test_transcription_raises_when_no_key_exists_anywhere():
    svc = TranscriptionService(FakeWhisper, FakeCredentials(openai=None))
    with pytest.raises(TranscriptionUnavailable):
        await svc.transcribe("u1", b"audio", filename="v.m4a", mime_type="audio/m4a")


@pytest.mark.asyncio
async def test_transcription_resolves_per_user_not_once():
    """Two users in one process must not share a resolution."""
    creds = FakeCredentials(openai="sk-proj-X")
    svc = TranscriptionService(FakeWhisper, creds)
    await svc.transcribe("u1", b"a", filename="v.m4a", mime_type="audio/m4a")
    await svc.transcribe("u2", b"a", filename="v.m4a", mime_type="audio/m4a")
    assert creds.resolved_for == ["u1", "u2"]


# ── Quick-add parsing ─────────────────────────────────────────────────────────


class FakeLedger:
    async def list_accounts(self, user_id: str) -> list[Any]:
        return []


class FakeLLM:
    def __init__(self, api_key: Any) -> None:
        self.api_key = api_key

    async def extract_structured(self, prompt: str, schema: Any, *, model_tier: str) -> dict:
        return {
            "entry_type": "expense",
            "amount": "500",
            "description": "lunch",
            "debit_account_id": None,
            "credit_account_id": None,
            "debit_account_hint": None,
            "credit_account_hint": None,
            "currency": "LKR",
            "confidence": 0.9,
        }


@pytest.mark.asyncio
async def test_entry_parse_builds_the_adapter_against_the_resolved_key():
    creds = FakeCredentials(anthropic="sk-ant-USER")
    built: list[FakeLLM] = []

    def factory(key: Any) -> FakeLLM:
        llm = FakeLLM(key)
        built.append(llm)
        return llm

    svc = EntryParseService(FakeLedger(), factory, credentials=creds)
    draft = await svc.parse_draft("u1", "spent 500 on lunch")
    assert draft["amount"] == "500"
    assert built[0].api_key.reveal() == "sk-ant-USER"


@pytest.mark.asyncio
async def test_entry_parse_resolves_per_user():
    creds = FakeCredentials(anthropic="sk-ant-X")
    svc = EntryParseService(FakeLedger(), FakeLLM, credentials=creds)
    await svc.parse_draft("u1", "spent 500 on lunch")
    await svc.parse_draft("u2", "spent 900 on fuel")
    assert creds.resolved_for == ["u1", "u2"]


def test_entry_parse_reports_unavailable_without_a_credential_source():
    assert EntryParseService(FakeLedger(), FakeLLM).available is False
    assert EntryParseService(FakeLedger(), FakeLLM, credentials=FakeCredentials()).available is True
