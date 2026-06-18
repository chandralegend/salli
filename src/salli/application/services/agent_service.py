"""
AgentService — use-case orchestration for agent interactions.

Builds and holds the Tax Agent and Return Workflow, exposes:
  - stream_chat(): streaming Tax Agent conversation as typed events
  - prepare_return(): run the return workflow to the review interrupt
  - resume_return(): resume after human decision
  - get_history(): fetch message history for a thread
"""
from __future__ import annotations

import uuid
from collections.abc import AsyncIterator
from typing import Any


class AgentService:
    def __init__(self, ledger_svc, tax_svc, checkpointer=None) -> None:
        self._ledger_svc = ledger_svc
        self._tax_svc = tax_svc
        self._checkpointer = checkpointer
        self._agent = None
        self._workflow = None

    def _get_agent(self):
        if self._agent is None:
            from salli.domain.agents.tax_agent import build_tax_agent

            self._agent = build_tax_agent(
                self._ledger_svc,
                self._tax_svc,
                checkpointer=self._checkpointer,
            )
        return self._agent

    def _get_workflow(self):
        if self._workflow is None:
            from salli.domain.agents.return_workflow import build_return_workflow

            self._workflow = build_return_workflow(
                self._ledger_svc,
                self._tax_svc,
                checkpointer=self._checkpointer,
            )
        return self._workflow

    async def stream_chat(
        self,
        user_id: str,
        message: str,
        thread_id: str | None = None,
    ) -> AsyncIterator[tuple[str, Any]]:
        """
        Yield (event_type, payload) tuples for SSE:
          ("token",       str)
          ("tool_call",   {"name": str, "input": dict})
          ("tool_result", {"name": str, "output": Any})
          ("interrupt",   dict)
          ("done",        None)
        """
        if thread_id is None:
            thread_id = str(uuid.uuid4())

        agent = self._get_agent()
        config = {"configurable": {"thread_id": f"{user_id}:{thread_id}"}}

        try:
            async for event in agent.astream_events(
                {"messages": [("user", message)]},
                config=config,
                version="v2",
            ):
                kind = event["event"]

                if kind == "on_chat_model_stream":
                    chunk = event["data"]["chunk"]
                    content = chunk.content
                    if isinstance(content, str) and content:
                        yield ("token", content)
                    elif isinstance(content, list):
                        for block in content:
                            if isinstance(block, dict) and block.get("type") == "text":
                                text = block.get("text", "")
                                if text:
                                    yield ("token", text)

                elif kind == "on_tool_start":
                    yield ("tool_call", {"name": event.get("name"), "input": event["data"].get("input", {})})

                elif kind == "on_tool_end":
                    output = event["data"].get("output")
                    if hasattr(output, "content"):
                        output = output.content
                    yield ("tool_result", {"name": event.get("name"), "output": output})

        except Exception as exc:
            # Surface interrupt payloads from the return workflow when run via stream_chat
            exc_type = type(exc).__name__
            if "interrupt" in exc_type.lower() or "GraphInterrupt" in exc_type:
                yield ("interrupt", {"message": str(exc)})
            else:
                raise
        finally:
            yield ("done", None)

    async def get_history(
        self,
        user_id: str,
        thread_id: str,
    ) -> list[dict[str, Any]]:
        """Return message history for a conversation thread."""
        agent = self._get_agent()
        config = {"configurable": {"thread_id": f"{user_id}:{thread_id}"}}

        state = await agent.aget_state(config)
        messages = []
        for msg in state.values.get("messages", []):
            role = "assistant" if msg.__class__.__name__ == "AIMessage" else "user"
            content = msg.content
            if isinstance(content, list):
                content = " ".join(
                    b.get("text", "") for b in content if isinstance(b, dict) and b.get("type") == "text"
                )
            messages.append({"role": role, "content": content})
        return messages

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
        return {"thread_id": thread_id, "draft_return": result.get("draft_return", {}), "state": result}

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
