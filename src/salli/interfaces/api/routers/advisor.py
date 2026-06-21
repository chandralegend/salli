"""
Wealth Advisor router — run the advisor (quota-gated), browse reports, and act on
recommendations. The daily cron endpoint is added in the scheduling phase.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from salli.application.services.billing_service import QuotaExceeded
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
