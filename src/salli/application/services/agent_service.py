"""
AgentService — use-case orchestration for agent interactions.

Builds the manager agent (supervisor) and the return workflow. Exposes:
  - stream_chat(): streaming manager agent conversation as typed events
  - resume_chat(): resume after an interrupt (write-tool approval gate)
  - prepare_return(): run the return workflow to the review interrupt
  - resume_return(): resume after human decision
  - get_history(): fetch message history for a thread
"""

from __future__ import annotations

import base64
import uuid
from collections.abc import AsyncIterator
from typing import Any


_WORKER_NODES = {"tax_specialist", "finance_specialist"}


async def _pending_interrupt(agent: Any, config: dict[str, Any]) -> Any | None:
    """
    Return the value of a pending interrupt() gate, or None.

    langgraph 1.x does not raise GraphInterrupt out of astream_events, nor emit a
    custom event — when a tool calls interrupt() the graph pauses and the interrupt
    is recorded in the checkpointed state. We read it back after the stream ends.
    """
    try:
        state = await agent.aget_state(config)
    except Exception:
        return None

    interrupts = list(getattr(state, "interrupts", None) or [])
    if not interrupts:
        for task in getattr(state, "tasks", None) or []:
            interrupts.extend(getattr(task, "interrupts", None) or [])
    if interrupts:
        return getattr(interrupts[0], "value", interrupts[0])
    return None


def _worker_from_event(event: dict) -> str | None:
    """
    Return the worker name if this LangGraph event originates from a worker agent.

    langgraph-supervisor compiles workers as subgraphs. Inside a subgraph the
    `langgraph_node` field is the *internal* node name (e.g. "agent"), NOT the
    worker's name. The worker name is recoverable from `langgraph_checkpoint_ns`
    which is formatted as "<worker>:<uuid>|<internal_node>:<uuid>".
    """
    meta = event.get("metadata", {})
    node = meta.get("langgraph_node", "")

    # Direct match — sometimes langgraph_node IS the worker name
    if node in _WORKER_NODES:
        return node

    # Inspect checkpoint namespace for the subgraph path
    ns: str = meta.get("langgraph_checkpoint_ns", "")
    if ns:
        # namespace looks like "tax_specialist:uuid|agent:uuid" or just "tax_specialist:uuid"
        first_segment = ns.split("|")[0].split(":")[0]
        if first_segment in _WORKER_NODES:
            return first_segment

    return None


class AgentService:
    def __init__(
        self,
        ledger_svc: Any,
        tax_svc: Any,
        doc_svc: Any = None,
        checkpointer: Any = None,
        uow_factory: Any = None,
    ) -> None:
        self._ledger_svc = ledger_svc
        self._tax_svc = tax_svc
        self._doc_svc = doc_svc
        self._checkpointer = checkpointer
        self._uow_factory = uow_factory
        self._agent: Any = None
        self._agent_date: str | None = None
        self._workflow: Any = None

    def _get_agent(self) -> Any:
        import datetime

        today = datetime.date.today().isoformat()
        if self._agent is None or self._agent_date != today:
            from salli.domain.agents.manager_agent import build_manager_agent

            self._agent = build_manager_agent(
                self._ledger_svc,
                self._tax_svc,
                self._doc_svc,
                checkpointer=self._checkpointer,
            )
            self._agent_date = today
        return self._agent

    def _get_workflow(self) -> Any:
        if self._workflow is None:
            from salli.domain.agents.return_workflow import build_return_workflow

            self._workflow = build_return_workflow(
                self._ledger_svc,
                self._tax_svc,
                checkpointer=self._checkpointer,
            )
        return self._workflow

    async def _build_message_content(
        self,
        user_id: str,
        message: str,
        file_refs: list[str] | None = None,
    ) -> Any:
        """Build a HumanMessage content block list, injecting file attachments."""
        from langchain_core.messages import HumanMessage

        content: list[Any] = [{"type": "text", "text": message}]

        if file_refs and self._doc_svc:
            for ref_id in file_refs:
                result = await self._doc_svc.get_file_as_base64(user_id, ref_id)
                if result:
                    b64, mime = result
                    doc_meta = await self._doc_svc.get_document(user_id, ref_id)
                    title = doc_meta.get("title", "attachment") if doc_meta else "attachment"
                    content.append(
                        {
                            "type": "document",
                            "source": {"type": "base64", "media_type": mime, "data": b64},
                            "title": title,
                        }
                    )

        if len(content) == 1 and content[0]["type"] == "text":
            return HumanMessage(content=content[0]["text"])
        return HumanMessage(content=content)

    async def _stream_events(
        self, agent: Any, input_: Any, config: dict[str, Any]
    ) -> AsyncIterator[tuple[str, Any]]:
        """Shared SSE event extraction for both stream_chat and resume_chat."""
        active_worker: str | None = None

        try:
            async for event in agent.astream_events(input_, config=config, version="v2"):
                kind = event["event"]
                worker = _worker_from_event(event)

                if kind == "on_chat_model_stream":
                    chunk = event["data"]["chunk"]
                    content = chunk.content
                    text = ""
                    if isinstance(content, str):
                        text = content
                    elif isinstance(content, list):
                        text = "".join(
                            b.get("text", "")
                            for b in content
                            if isinstance(b, dict) and b.get("type") == "text"
                        )

                    if text:
                        if worker:
                            if active_worker != worker:
                                if active_worker:
                                    yield ("subagent_end", {"agent": active_worker})
                                active_worker = worker
                                yield ("subagent_start", {"agent": worker})
                            yield ("subagent_token", {"agent": worker, "content": text})
                        else:
                            if active_worker:
                                yield ("subagent_end", {"agent": active_worker})
                                active_worker = None
                            yield ("token", text)

                elif kind == "on_tool_start":
                    if active_worker and not worker:
                        yield ("subagent_end", {"agent": active_worker})
                        active_worker = None
                    name = event.get("name", "")
                    input_data = event["data"].get("input", {})
                    payload: dict[str, Any] = {"name": name, "input": input_data}
                    if worker:
                        payload["agent"] = worker
                    yield ("tool_call", payload)

                elif kind == "on_tool_end":
                    output = event["data"].get("output")
                    if hasattr(output, "content"):
                        output = output.content
                    name = event.get("name", "")
                    payload = {"name": name, "output": output}
                    if worker:
                        payload["agent"] = worker
                    yield ("tool_result", payload)

                elif kind == "on_custom_event" and event.get("name") == "interrupt":
                    yield ("interrupt", event["data"])

            # langgraph 1.x surfaces interrupt() via the checkpointed state rather
            # than an exception or custom event. After the stream drains, check for
            # a pending approval gate and surface it so the client can approve/deny.
            approval = await _pending_interrupt(agent, config)
            if approval is not None:
                yield ("approval_required", approval)

        except Exception as exc:
            exc_repr = repr(exc)
            # LangGraph raises an exception wrapping interrupt payloads
            if "GraphInterrupt" in exc_repr or "interrupt" in type(exc).__name__.lower():
                # Extract the interrupt value from the exception
                interrupt_value = getattr(exc, "args", [{}])
                if interrupt_value and isinstance(interrupt_value[0], (dict, list)):
                    data = interrupt_value[0]
                    if isinstance(data, list) and data:
                        data = data[0]
                        if hasattr(data, "value"):
                            data = data.value
                    yield ("approval_required", data)
                else:
                    yield ("interrupt", {"message": str(exc)})
            else:
                raise
        finally:
            if active_worker:
                yield ("subagent_end", {"agent": active_worker})
            yield ("done", None)

    # ── Session management ────────────────────────────────────────────────────

    async def _ensure_session(self, user_id: str, thread_id: str) -> None:
        if not self._uow_factory:
            return
        try:
            async with self._uow_factory() as uow:
                await uow.agent_sessions.upsert(user_id, thread_id)
        except Exception:
            pass

    async def _try_generate_title(
        self, user_id: str, thread_id: str, user_msg: str, ai_text: str
    ) -> None:
        """Fire-and-forget: generate a Haiku title and persist it."""
        if not self._uow_factory:
            return
        try:
            from langchain_anthropic import ChatAnthropic
            from langchain_core.messages import HumanMessage

            haiku = ChatAnthropic(
                model="claude-haiku-4-5-20251001", temperature=0, max_tokens=20
            )
            prompt = (
                "Generate a 3-5 word title for this conversation. "
                "Reply with ONLY the title — no quotes, no punctuation, no explanation.\n\n"
                f"User: {user_msg[:200]}\n"
                f"Assistant: {ai_text[:400]}"
            )
            response = await haiku.ainvoke([HumanMessage(content=prompt)])
            title = str(response.content).strip()[:100]
            if title:
                async with self._uow_factory() as uow:
                    await uow.agent_sessions.set_title(user_id, thread_id, title)
        except Exception:
            pass  # title generation is best-effort

    async def list_sessions(
        self, user_id: str, limit: int = 50
    ) -> list[dict[str, Any]]:
        if not self._uow_factory:
            return []
        async with self._uow_factory() as uow:
            return await uow.agent_sessions.list(user_id, limit=limit)

    async def delete_session(self, user_id: str, thread_id: str) -> None:
        if not self._uow_factory:
            return
        async with self._uow_factory() as uow:
            await uow.agent_sessions.delete(user_id, thread_id)

    # ── Chat streaming ────────────────────────────────────────────────────────

    async def stream_chat(
        self,
        user_id: str,
        message: str,
        thread_id: str | None = None,
        file_refs: list[str] | None = None,
    ) -> AsyncIterator[tuple[str, Any]]:
        """
        Yield (event_type, payload) tuples for SSE:
          ("token",            str)
          ("tool_call",        {"name": str, "input": dict, "agent"?: str})
          ("tool_result",      {"name": str, "output": Any, "agent"?: str})
          ("approval_required",{"type": str, "action": str, "description": str, "params": dict})
          ("subagent_start",   {"agent": str})
          ("subagent_end",     {"agent": str})
          ("subagent_token",   {"agent": str, "content": str})
          ("interrupt",        dict)
          ("done",             None)
        """
        if thread_id is None:
            thread_id = str(uuid.uuid4())

        from salli.domain.agents.tools import set_current_user

        set_current_user(user_id)  # tools read this, never the LLM-supplied id
        await self._ensure_session(user_id, thread_id)

        agent = self._get_agent()
        config = {"configurable": {"thread_id": f"{user_id}:{thread_id}", "user_id": user_id}}
        human_msg = await self._build_message_content(user_id, message, file_refs)

        async for event in self._stream_events(agent, {"messages": [human_msg]}, config):
            yield event

    async def resume_chat(
        self,
        user_id: str,
        thread_id: str,
        decision: str,
    ) -> AsyncIterator[tuple[str, Any]]:
        """
        Resume the manager agent after an interrupt (write-tool approval gate).
        decision: "approved" | "denied"
        """
        from langgraph.types import Command

        from salli.domain.agents.tools import set_current_user

        set_current_user(user_id)
        agent = self._get_agent()
        config = {"configurable": {"thread_id": f"{user_id}:{thread_id}", "user_id": user_id}}

        async for event in self._stream_events(agent, Command(resume=decision), config):
            yield event

    async def get_history(
        self,
        user_id: str,
        thread_id: str,
    ) -> list[dict[str, Any]]:
        """
        Rebuild the full rich conversation so a reloaded thread looks like it did
        while streaming: user messages, manager text, handoff/tool calls, and
        collapsible specialist (sub-agent) sections with their detailed output.

        Each assistant turn is a list of `parts` mirroring the frontend MessagePart:
          {"type": "text", "content": str}
          {"type": "tool_call", "name": str, "input": dict, "done": true}
          {"type": "subagent_section", "agent": str, "active": false, "parts": [...]}
        """
        agent = self._get_agent()
        config = {"configurable": {"thread_id": f"{user_id}:{thread_id}"}}
        state = await agent.aget_state(config)
        all_msgs = state.values.get("messages", [])

        def _text(content: Any) -> str:
            if isinstance(content, str):
                return content.strip()
            if isinstance(content, list):
                return " ".join(
                    b.get("text", "").strip()
                    for b in content
                    if isinstance(b, dict) and b.get("type") == "text"
                ).strip()
            return ""

        # Handoff plumbing the user should not see as a visible step
        _HIDE_TOOLS = {"transfer_back_to_supervisor"}

        result: list[dict[str, Any]] = []
        parts: list[dict[str, Any]] = []
        current_section: dict[str, Any] | None = None

        def flush_turn() -> None:
            nonlocal parts, current_section
            if parts:
                result.append({"role": "assistant", "parts": parts})
            parts = []
            current_section = None

        for msg in all_msgs:
            cls = msg.__class__.__name__
            name = getattr(msg, "name", None)

            if cls == "HumanMessage":
                flush_turn()
                user_text = _text(msg.content)
                if user_text:
                    result.append({"role": "user", "content": user_text})

            elif cls == "AIMessage":
                is_worker = name in _WORKER_NODES
                text = _text(msg.content)
                tool_calls = getattr(msg, "tool_calls", None) or []

                # A message whose only purpose is handing control back is plumbing —
                # skip both its tool call and its narration ("Transferring back...").
                is_handoff = any(tc.get("name") in _HIDE_TOOLS for tc in tool_calls)

                if is_worker:
                    # Group consecutive worker messages into one collapsible section
                    if current_section is None or current_section["agent"] != name:
                        current_section = {
                            "type": "subagent_section",
                            "agent": name,
                            "active": False,
                            "parts": [],
                        }
                        parts.append(current_section)
                    for tc in tool_calls:
                        if tc.get("name") in _HIDE_TOOLS:
                            continue
                        current_section["parts"].append({
                            "type": "tool_call",
                            "name": tc.get("name", ""),
                            "input": tc.get("args", {}),
                            "done": True,
                        })
                    if text and not is_handoff:
                        current_section["parts"].append({"type": "token", "content": text})
                else:
                    # A supervisor message closes any open worker section
                    current_section = None
                    if text:
                        parts.append({"type": "text", "content": text})
                    for tc in tool_calls:
                        if tc.get("name") in _HIDE_TOOLS:
                            continue
                        parts.append({
                            "type": "tool_call",
                            "name": tc.get("name", ""),
                            "input": tc.get("args", {}),
                            "done": True,
                        })

            # ToolMessage outputs are not rendered in the UI, so they are skipped.

        flush_turn()
        return result

    async def prepare_return(
        self,
        user_id: str,
        year: str = "2025/26",
        thread_id: str | None = None,
    ) -> dict[str, Any]:
        """
        Run the return workflow up to the human review gate.
        Returns the interrupt payload (draft return for human approval).
        """
        if thread_id is None:
            thread_id = str(uuid.uuid4())

        workflow = self._get_workflow()
        config = {"configurable": {"thread_id": thread_id}}

        result = await workflow.ainvoke(
            {"user_id": user_id, "year": year},
            config=config,
        )
        return {
            "thread_id": thread_id,
            "draft_return": result.get("draft_return", {}),
            "state": result,
        }

    async def resume_return(
        self,
        thread_id: str,
        decision: str,
    ) -> dict[str, Any]:
        """
        Resume the return workflow after human review.
        decision: "approve" | "edit" | "reject"
        """
        from langgraph.types import Command

        workflow = self._get_workflow()
        config = {"configurable": {"thread_id": thread_id}}

        result = await workflow.ainvoke(Command(resume=decision), config=config)
        return {"worksheet": result.get("worksheet", {}), "error": result.get("error", "")}
