"""
Financial Independence router — FI score (compute/read/history) and goal management.
The score is computed by the deterministic engine; no LLM is involved.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from salli.interfaces.api.deps import AppServices, CurrentUser

router = APIRouter(prefix="/fi", tags=["financial-independence"])


# ── Score ─────────────────────────────────────────────────────────────────────


@router.get("/score")
async def get_score(user_id: CurrentUser, svc: AppServices):
    """Latest FI score, computing one on first access."""
    return await svc.fi.get_or_compute_score(user_id)


@router.post("/score/recompute")
async def recompute_score(user_id: CurrentUser, svc: AppServices):
    """Recompute the FI score from the current ledger and store a snapshot."""
    return await svc.fi.compute_score(user_id)


@router.get("/score/history")
async def score_history(user_id: CurrentUser, svc: AppServices):
    return {"history": await svc.fi.get_score_history(user_id)}


# ── Goals ─────────────────────────────────────────────────────────────────────


class GoalRequest(BaseModel):
    name: str
    kind: str = "custom"
    target_amount: float = 0
    current_amount: float = 0
    target_date: str | None = None
    priority: int = 2


class GoalUpdateRequest(BaseModel):
    name: str | None = None
    kind: str | None = None
    target_amount: float | None = None
    current_amount: float | None = None
    target_date: str | None = None
    priority: int | None = None
    is_active: bool | None = None


@router.get("/goals")
async def list_goals(user_id: CurrentUser, svc: AppServices):
    return {"goals": await svc.fi.list_goals(user_id)}


@router.post("/goals", status_code=status.HTTP_201_CREATED)
async def create_goal(body: GoalRequest, user_id: CurrentUser, svc: AppServices):
    goal_id = await svc.fi.create_goal(user_id, body.model_dump())
    return {"id": goal_id}


@router.patch("/goals/{goal_id}")
async def update_goal(goal_id: str, body: GoalUpdateRequest, user_id: CurrentUser, svc: AppServices):
    await svc.fi.update_goal(user_id, goal_id, body.model_dump(exclude_none=True))
    return {"updated": True}


@router.delete("/goals/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(goal_id: str, user_id: CurrentUser, svc: AppServices):
    await svc.fi.delete_goal(user_id, goal_id)
