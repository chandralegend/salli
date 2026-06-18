"""
AgentService — use-case orchestration for agent interactions.

Builds and holds the Tax Agent and Return Workflow, exposes:
  - stream_chat(): streaming Tax Agent conversation
  - prepare_return(): run the return workflow to the review interrupt
  - resume_return(): resume after human decision
"""
from __future__ import annotations

import uuid
from collections.abc import AsyncIterator, Callable
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
    ) -> AsyncIterator[str]:
        """
        Stream a Tax Agent response token by token.
        thread_id is the conversation session; pass the same ID to continue.
        """
        if thread_id is None:
            thread_id = str(uuid.uuid4())

        agent = self._get_agent()
        config = {"configurable": {"thread_id": thread_id}}

        async for event in agent.astream(
            {"messages": [("user", message)]},
            config=config,
            stream_mode="messages",
        ):
            msg, metadata = event
            if hasattr(msg, "content") and metadata.get("langgraph_node") == "agent":
                content = msg.content
                if isinstance(content, str):
                    yield content
                elif isinstance(content, list):
                    for block in content:
                        if isinstance(block, dict) and block.get("type") == "text":
                            yield block["text"]

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
