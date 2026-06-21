"""
Wealth Advisor router — run the advisor (quota-gated), browse reports, and act on
recommendations. The daily cron endpoint is added in the scheduling phase.
"""

from __future__ import annotations

import hmac
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, status
from starlette.background import BackgroundTask
from starlette.responses import JSONResponse

from salli.application.services.billing_service import QuotaExceeded
from salli.config import Settings, get_settings
from salli.interfaces.api.deps import AppServices, CurrentEmail, CurrentUser

router = APIRouter(prefix="/advisor", tags=["advisor"])


@router.post("/run")
async def run_advisor(user_id: CurrentUser, email: CurrentEmail, svc: AppServices):
    """Run the Wealth Advisor now (counts against the advisor_runs quota)."""
    try:
        return await svc.advisor.run_advisor(user_id, email, trigger="manual")
    except QuotaExceeded as exc:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "error": "quota_exceeded",
                "metric": exc.metric,
                "limit": exc.limit,
                "plan": exc.plan_key,
                "upgrade": True,
            },
        )


@router.get("/reports")
async def list_reports(user_id: CurrentUser, svc: AppServices):
    return {"reports": await svc.advisor.list_reports(user_id)}


@router.get("/reports/latest")
async def latest_report(user_id: CurrentUser, svc: AppServices):
    return await svc.advisor.get_latest_report(user_id) or {}


@router.post("/reports/{report_id}/recommendations/{rec_id}/apply")
async def apply_recommendation(
    report_id: str, rec_id: str, user_id: CurrentUser, svc: AppServices
):
    try:
        return await svc.advisor.apply_recommendation(user_id, report_id, rec_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post("/reports/{report_id}/recommendations/{rec_id}/dismiss")
async def dismiss_recommendation(
    report_id: str, rec_id: str, user_id: CurrentUser, svc: AppServices
):
    try:
        return await svc.advisor.dismiss_recommendation(user_id, report_id, rec_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


# ── Daily scheduling (called by Supabase pg_cron, not end users) ──────────────


async def _run_due(svc) -> None:
    """Background: run the advisor for each due paid user; skip those over quota."""
    due = await svc.advisor.due_users()
    for sub in due:
        try:
            await svc.advisor.run_advisor(sub["user_id"], None, trigger="scheduled")
        except QuotaExceeded:
            continue
        except Exception:
            continue


@router.post("/cron/run-due", status_code=status.HTTP_202_ACCEPTED)
async def cron_run_due(
    svc: AppServices,
    settings: Annotated[Settings, Depends(get_settings)],
    x_cron_secret: Annotated[str | None, Header()] = None,
):
    """Trigger the daily advisor for all due paid users. Auth: X-Cron-Secret header."""
    secret = settings.cron_secret
    if not secret or not x_cron_secret or not hmac.compare_digest(x_cron_secret, secret):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid cron secret")
    due = await svc.advisor.due_users()
    return JSONResponse(
        {"due": len(due), "scheduled": True},
        status_code=status.HTTP_202_ACCEPTED,
        background=BackgroundTask(_run_due, svc),
    )
