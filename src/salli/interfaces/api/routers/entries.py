from __future__ import annotations

from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from salli.interfaces.api.deps import AppServices, CurrentUser

router = APIRouter(prefix="/entries", tags=["entries"])


class PostingRequest(BaseModel):
    account_id: str
    direction: int  # 1 = DEBIT, -1 = CREDIT
    amount: str  # Decimal as string to avoid float
    currency: str = "LKR"
    fx_rate: str = "1"
    fx_rate_source: str | None = None


class AddEntryRequest(BaseModel):
    entry_date: str  # YYYY-MM-DD
    description: str
    source: Literal["manual", "statement", "sms", "system"] = "manual"
    external_ref: str | None = None
    postings: list[PostingRequest]


@router.post("/", status_code=201)
async def add_entry(body: AddEntryRequest, user_id: CurrentUser, svc: AppServices):
    postings_data = [
        {
            "account_id": p.account_id,
            "direction": p.direction,
            "amount": Decimal(p.amount),
            "currency": p.currency,
            "fx_rate": Decimal(p.fx_rate),
            "fx_rate_source": p.fx_rate_source,
        }
        for p in body.postings
    ]
    entry_id = await svc.ledger.add_entry(
        user_id=user_id,
        entry_date=body.entry_date,
        description=body.description,
        source=body.source,
        postings_data=postings_data,
    )
    return {"id": entry_id}


@router.get("/")
async def list_entries(
    user_id: CurrentUser,
    svc: AppServices,
    from_date: str | None = None,
    to_date: str | None = None,
):
    entries = await svc.ledger.get_entries(user_id, from_date, to_date)
    return [
        {
            "id": e.id,
            "entry_date": e.entry_date,
            "description": e.description,
            "source": e.source,
            "external_ref": e.external_ref,
            "reversed_by": e.reversed_by,
            "postings": [
                {
                    "account_id": p.account_id,
                    "direction": p.direction.value,
                    "amount": str(p.amount),
                    "currency": p.currency,
                    "fx_rate": str(p.fx_rate),
                }
                for p in e.postings
            ],
        }
        for e in entries
    ]


@router.post("/{entry_id}/reverse", status_code=201)
async def reverse_entry(entry_id: str, user_id: CurrentUser, svc: AppServices):
    try:
        reversing_id = await svc.ledger.reverse_entry(user_id=user_id, entry_id=entry_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return {"id": reversing_id}
