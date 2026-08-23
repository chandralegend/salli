"""
OpenAI speech-to-text adapter for the mobile app's Voice Mode.

A single push-to-talk recording is uploaded whole (no streaming) and
transcribed in one call — this mirrors the turn-based interaction model on
the client (hold to talk, release to send), so there's no need for a
streaming transcription API here.
"""

from __future__ import annotations

from typing import Any

import httpx

from salli.application.ports import TranscriptionPort


def _reveal(key: Any) -> str:
    """Accept a Secret or a plain string. Interpolating a Secret directly would
    render the mask, so the unwrap has to be explicit and right here."""
    return key.reveal() if hasattr(key, "reveal") else str(key)


_TRANSCRIPTIONS_URL = "https://api.openai.com/v1/audio/transcriptions"


class OpenAIWhisperAdapter(TranscriptionPort):
    def __init__(
        self, api_key: Any, model: str = "gpt-4o-mini-transcribe", timeout: float = 30.0
    ) -> None:
        # May be a Secret; unwrapped only when the request is actually made.
        self._api_key = api_key
        self._model = model
        self._timeout = timeout

    async def transcribe(self, audio_bytes: bytes, *, filename: str, mime_type: str) -> str:
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.post(
                _TRANSCRIPTIONS_URL,
                headers={"Authorization": f"Bearer {_reveal(self._api_key)}"},
                data={"model": self._model},
                files={"file": (filename, audio_bytes, mime_type)},
            )
            response.raise_for_status()
            return str(response.json()["text"])
