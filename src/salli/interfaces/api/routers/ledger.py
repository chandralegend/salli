from __future__ import annotations

from fastapi import APIRouter

from salli.interfaces.api.deps import AppServices, CurrentUser

router = APIRouter(prefix="/ledger", tags=["ledger"])


@router.get("/trial-balance")
async def trial_balance(
    user_id: CurrentUser,
    svc: AppServices,
    from_date: str | None = None,
    to_date: str | None = None,
):
    balances = await svc.ledger.get_trial_balance(user_id, from_date, to_date)
    return {
        "balances": {k: str(v) for k, v in balances.items()},
        "net": str(sum(balances.values())),
    }


@router.get("/income-statement")
async def income_statement(
    user_id: CurrentUser,
    svc: AppServices,
    from_date: str,
    to_date: str,
    income_accounts: str = "",
    expense_accounts: str = "",
):
    income_ids = set(income_accounts.split(",")) if income_accounts else set()
    expense_ids = set(expense_accounts.split(",")) if expense_accounts else set()
    net = await svc.ledger.get_income_statement(
        user_id, from_date, to_date, income_ids, expense_ids
    )
    return {"from_date": from_date, "to_date": to_date, "net_income": str(net)}
