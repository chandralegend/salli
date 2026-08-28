"""
The model picker: which Claude models exist, what each costs, and which one
this user has chosen.

Every model is available on every plan. The tier decides how many credits you
get, not which models you may spend them on — so this endpoint returns the same
catalogue to a Free user and a Pro one, and the multiplier does the rationing.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from salli.domain.ai_models import DEFAULT_MODEL, MODELS
from salli.domain.billing.credits import ACTION_AGENT_MESSAGE, cost
from salli.interfaces.api.deps import AppServices, CurrentUser

router = APIRouter(prefix="/ai-models", tags=["ai-models"])


class ModelSelection(BaseModel):
    # None means "go back to the default", which is why this is nullable rather
    # than omitted — `upsert` cannot write None, so the profile repository has a
    # dedicated setter for exactly this case.
    model_id: str | None


@router.get("")
async def list_models(user_id: CurrentUser, svc: AppServices):
    """The catalogue, with what a chat message costs on each."""
    selected = await svc.profile.get_preferred_model(user_id)
    return {
        "selected": selected,
        "default": DEFAULT_MODEL,
        "models": [
            {
                "id": m.id,
                "name": m.name,
                "blurb": m.blurb,
                "credit_multiplier": m.credit_multiplier,
                # The number users actually reason with: not an abstract
                # multiplier, but what one conversation costs them.
                "credits_per_message": cost(ACTION_AGENT_MESSAGE, m.id),
                "is_default": m.id == DEFAULT_MODEL,
            }
            for m in MODELS.values()
        ],
    }


@router.put("/selection", status_code=204)
async def set_model(body: ModelSelection, user_id: CurrentUser, svc: AppServices):
    """Choose a model, or send null to go back to the default."""
    try:
        await svc.profile.set_preferred_model(user_id, body.model_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
