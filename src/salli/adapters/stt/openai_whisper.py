"""
OpenAI speech-to-text adapter for the mobile app's Voice Mode.

A single push-to-talk recording is uploaded whole (no streaming) and
transcribed in one call — this mirrors the turn-based interaction model on
the client (hold to talk, release to send), so there's no need for a
streaming transcription API here.
"""

from __future__ import annotations

import httpx

from salli.application.ports import TranscriptionPort

_TRANSCRIPTIONS_URL = "https://api.openai.com/v1/audio/transcriptions"


class OpenAIWhisperAdapter(TranscriptionPort):
    def __init__(self, api_key: str, model: str = "gpt-4o-mini-transcribe", timeout: float = 30.0) -> None:
        self._api_key = api_key
        self._model = model
        self._timeout = timeout

    async def transcribe(self, audio_bytes: bytes, *, filename: str, mime_type: str) -> str:
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.post(
                _TRANSCRIPTIONS_URL,
                headers={"Authorization": f"Bearer {self._api_key}"},
                data={"model": self._model},
                files={"file": (filename, audio_bytes, mime_type)},
            )
            response.raise_for_status()
            return str(response.json()["text"])
