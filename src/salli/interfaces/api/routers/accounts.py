from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from salli.interfaces.api.deps import AppServices, CurrentUser

router = APIRouter(prefix="/accounts", tags=["accounts"])


class AddAccountRequest(BaseModel):
    code: str
    name: str
    type: str
    currency: str = "LKR"
    parent_id: str | None = None


@router.get("/")
async def list_accounts(user_id: CurrentUser, svc: AppServices):
    accounts = await svc.ledger.list_accounts(user_id)
    return [
        {
            "id": a.id,
            "code": a.code,
            "name": a.name,
            "type": a.type,
            "currency": a.currency,
            "parent_id": a.parent_id,
            "is_active": a.is_active,
        }
        for a in accounts
    ]


@router.post("/", status_code=201)
async def add_account(body: AddAccountRequest, user_id: CurrentUser, svc: AppServices):
    account_id = await svc.ledger.add_account(
        user_id=user_id,
        code=body.code,
        name=body.name,
        type=body.type,
        currency=body.currency,
        parent_id=body.parent_id,
    )
    return {"id": account_id}
