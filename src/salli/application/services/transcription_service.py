from __future__ import annotations

from salli.application.ports import TranscriptionPort


class TranscriptionService:
    def __init__(self, port: TranscriptionPort) -> None:
        self._port = port

    async def transcribe(self, audio_bytes: bytes, *, filename: str, mime_type: str) -> str:
        text = await self._port.transcribe(audio_bytes, filename=filename, mime_type=mime_type)
        return text.strip()
