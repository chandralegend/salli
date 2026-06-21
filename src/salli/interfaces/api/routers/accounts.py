from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from salli.interfaces.api.deps import AppServices, CurrentUser

router = APIRouter(prefix="/accounts", tags=["accounts"])

AccountTypeStr = Literal["asset", "liability", "equity", "income", "expense"]


class AddAccountRequest(BaseModel):
    code: str
    name: str
    type: AccountTypeStr
    currency: str = "LKR"
    parent_id: str | None = None


class UpdateAccountRequest(BaseModel):
    code: str
    name: str
    type: AccountTypeStr
    currency: str = "LKR"


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


@router.patch("/{account_id}", status_code=200)
async def update_account(
    account_id: str, body: UpdateAccountRequest, user_id: CurrentUser, svc: AppServices
):
    await svc.ledger.update_account(
        user_id=user_id,
        account_id=account_id,
        code=body.code,
        name=body.name,
        type=body.type,
        currency=body.currency,
    )
    return {"id": account_id}


@router.delete("/{account_id}", status_code=204)
async def deactivate_account(account_id: str, user_id: CurrentUser, svc: AppServices):
    await svc.ledger.deactivate_account(user_id=user_id, account_id=account_id)
