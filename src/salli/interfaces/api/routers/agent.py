"""
Agent router — SSE streaming for the Tax Agent chat.

Stream protocol (newline-delimited JSON events):
  {"type": "token",     "content": "..."}          LLM text chunk
  {"type": "tool_call", "name": "...", "input": {}} Tool invocation
  {"type": "tool_result","name": "...", "output": {}} Tool result
  {"type": "interrupt", "data": {...}}               Human-approval gate
  {"type": "done"}                                   Stream complete
  {"type": "error",     "message": "..."}            Unrecoverable error

Clients resume an interrupted return-preparation workflow by POSTing to
/agent/resume with the thread_id and the approval decision.
"""

from __future__ import annotations

import json
from collections.abc import AsyncIterator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from salli.interfaces.api.deps import AppServices, CurrentUser

router = APIRouter(prefix="/agent", tags=["agent"])


# ── SSE helpers ───────────────────────────────────────────────────────────────


def _sse(data: dict) -> str:
    return f"data: {json.dumps(data, default=str)}\n\n"


async def _stream_agent(
    svc: AppServices,
    user_id: str,
    thread_id: str,
    message: str,
) -> AsyncIterator[str]:
    try:
        async for event_type, payload in svc.agent.stream_chat(
            user_id=user_id,
            thread_id=thread_id,
            message=message,
        ):
            if event_type == "token":
                yield _sse({"type": "token", "content": payload})
            elif event_type == "tool_call":
                yield _sse(
                    {
                        "type": "tool_call",
                        "name": payload.get("name"),
                        "input": payload.get("input"),
                    }
                )
            elif event_type == "tool_result":
                yield _sse(
                    {
                        "type": "tool_result",
                        "name": payload.get("name"),
                        "output": payload.get("output"),
                    }
                )
            elif event_type == "interrupt":
                yield _sse({"type": "interrupt", "data": payload})
            elif event_type == "done":
                yield _sse({"type": "done"})
                return
        yield _sse({"type": "done"})
    except Exception as exc:
        yield _sse({"type": "error", "message": str(exc)})


# ── Routes ────────────────────────────────────────────────────────────────────


class ChatRequest(BaseModel):
    thread_id: str
    message: str


@router.post("/chat")
async def chat(body: ChatRequest, user_id: CurrentUser, svc: AppServices):
    """
    Stream a Tax Agent response as Server-Sent Events.
    The client supplies a thread_id to maintain conversation history.
    """
    return StreamingResponse(
        _stream_agent(svc, user_id, body.thread_id, body.message),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


class ResumeRequest(BaseModel):
    thread_id: str
    decision: str  # "approve" | "edit" | "reject"
    edits: dict | None = None


@router.post("/resume")
async def resume_workflow(body: ResumeRequest, user_id: CurrentUser, svc: AppServices):
    """
    Resume an interrupted return-preparation workflow after human approval.
    The interrupt() gate in the StateGraph pauses here.
    """
    return StreamingResponse(
        _stream_agent(
            svc,
            user_id,
            body.thread_id,
            json.dumps({"__resume__": True, "decision": body.decision, "edits": body.edits}),
        ),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/history/{thread_id}")
async def get_history(thread_id: str, user_id: CurrentUser, svc: AppServices):
    """Return the message history for a conversation thread."""
    messages = await svc.agent.get_history(user_id=user_id, thread_id=thread_id)
    return {"thread_id": thread_id, "messages": messages}
