"""
Speech-to-text for the mobile app's Voice Mode.

Availability is a per-user question, not a boot-time one: this service used to
exist only when a *platform* OpenAI key was configured, so a user with their own
key still got a 503. Production currently has no platform OpenAI key at all,
which makes BYOK the only way Voice Mode works — so the resolution has to happen
per request.
"""

from __future__ import annotations

from typing import Any


class TranscriptionUnavailable(Exception):
    """Neither the user nor the platform has an OpenAI key for this request."""


class TranscriptionService:
    def __init__(self, adapter_factory: Any, credentials: Any) -> None:
        self._adapter_factory = adapter_factory
        self._credentials = credentials

    async def transcribe(
        self, user_id: str, audio_bytes: bytes, *, filename: str, mime_type: str
    ) -> str:
        creds = await self._credentials.resolve(user_id)
        if creds.openai is None:
            raise TranscriptionUnavailable
        adapter = self._adapter_factory(creds.openai)
        text = await adapter.transcribe(audio_bytes, filename=filename, mime_type=mime_type)
        return text.strip()
