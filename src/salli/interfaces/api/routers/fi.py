"""
Financial Independence router — FI score, goals, AI FIRE strategy, projections, surplus.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from salli.interfaces.api.deps import AppServices, CurrentEmail, CurrentUser

router = APIRouter(prefix="/fi", tags=["financial-independence"])

_SSE_HEADERS = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}


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
async def update_goal(
    goal_id: str, body: GoalUpdateRequest, user_id: CurrentUser, svc: AppServices
):
    await svc.fi.update_goal(user_id, goal_id, body.model_dump(exclude_none=True))
    return {"updated": True}


@router.delete("/goals/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(goal_id: str, user_id: CurrentUser, svc: AppServices):
    await svc.fi.delete_goal(user_id, goal_id)


# ── FIRE Strategy ──────────────────────────────────────────────────────────────


@router.get("/strategy")
async def get_strategy(user_id: CurrentUser, svc: AppServices):
    """Return the user's active FIRE strategy, or 404 if none exists yet."""
    strategy = await svc.fi.get_strategy(user_id)
    if strategy is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No FIRE strategy found")
    return strategy


@router.get("/strategy/history")
async def get_strategy_history(user_id: CurrentUser, svc: AppServices):
    """List all strategy versions (summary only)."""
    return {"history": await svc.fi.get_strategy_history(user_id)}


@router.post("/strategy/generate")
async def generate_strategy(user_id: CurrentUser, email: CurrentEmail, svc: AppServices):
    """
    Trigger AI FIRE strategy generation. Returns an SSE stream.

    Stream events:
      {"type": "status",  "message": "..."} — progress updates
      {"type": "done",    "strategy": {...}} — final result
      {"type": "error",   "message": "..."}  — failure
    """
    return StreamingResponse(
        svc.fi.generate_strategy(user_id, email),
        media_type="text/event-stream",
        headers=_SSE_HEADERS,
    )


# ── Projections & Surplus ──────────────────────────────────────────────────────


@router.get("/projections")
async def get_projections(user_id: CurrentUser, svc: AppServices):
    """15-year portfolio projections across conservative/base/growth scenarios."""
    return await svc.fi.get_projections(user_id)


@router.get("/surplus")
async def get_surplus_breakdown(user_id: CurrentUser, svc: AppServices):
    """Income-by-source and expense-by-category breakdown from the trailing 12 months."""
    return await svc.fi.get_surplus_breakdown(user_id)
