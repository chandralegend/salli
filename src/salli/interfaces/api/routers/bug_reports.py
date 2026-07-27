"""
Bug reports router — user-submitted problem reports plus a client diagnostics
snapshot.

The `context` models below use `extra="ignore"` rather than `extra="forbid"` on
purpose. The web client and this API deploy independently, so a newer client that
sends a diagnostic key this build has never heard of is a permanent condition, not
a transient one — and this is the one endpoint where a 422 is worst, because a
rejected bug report is a bug nobody ever hears about. Unknown keys are dropped;
every key we *do* know is individually length-bounded.
"""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field

from salli.application.services.bug_report_service import RateLimited
from salli.interfaces.api.deps import AppServices, CurrentEmail, CurrentUser
from salli.interfaces.api.request_context import get_request_id

router = APIRouter(prefix="/bug-reports", tags=["bug-reports"])


class RecentFailure(BaseModel):
    model_config = ConfigDict(extra="ignore")

    ago_ms: int | None = Field(default=None, ge=0, le=86_400_000)
    method: str | None = Field(default=None, max_length=10)
    status: int | None = Field(default=None, ge=0, le=999)
    path_template: str | None = Field(default=None, max_length=200)
    request_id: str | None = Field(default=None, max_length=64)


class Viewport(BaseModel):
    model_config = ConfigDict(extra="ignore")

    w: int | None = Field(default=None, ge=0, le=100_000)
    h: int | None = Field(default=None, ge=0, le=100_000)
    dpr: float | None = Field(default=None, ge=0, le=16)


class ClientError(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str | None = Field(default=None, max_length=120)
    message: str | None = Field(default=None, max_length=1_000)
    stack: str | None = Field(default=None, max_length=4_000)
    component_stack: str | None = Field(default=None, max_length=4_000)


class BugContext(BaseModel):
    model_config = ConfigDict(extra="ignore")

    route: str | None = Field(default=None, max_length=300)
    page_title: str | None = Field(default=None, max_length=300)
    app_commit: str | None = Field(default=None, max_length=64)
    viewport: Viewport | None = None
    user_agent: str | None = Field(default=None, max_length=400)
    language: str | None = Field(default=None, max_length=32)
    timezone: str | None = Field(default=None, max_length=64)
    theme: str | None = Field(default=None, max_length=16)
    supabase_configured: bool | None = None
    token_exp: int | None = Field(default=None, ge=0)
    agent_thread_id: str | None = Field(default=None, max_length=64)
    onboarding_complete: bool | None = None
    tour_complete: bool | None = None
    react_version: str | None = Field(default=None, max_length=32)
    # Intentionally unbounded in length here: a 50-entry array should be accepted
    # and trimmed by the domain's bound_context, not 422'd back at the reporter.
    recent_failures: list[RecentFailure] = Field(default_factory=list[RecentFailure])
    client_error: ClientError | None = None


class BugReportRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=10_000)
    severity: Literal["low", "medium", "high", "blocking"]
    area: str | None = Field(default=None, max_length=50)
    contact_ok: bool = False
    file_ref: str | None = Field(default=None, max_length=64)
    context: BugContext = Field(default_factory=BugContext)


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_bug_report(
    body: BugReportRequest,
    user_id: CurrentUser,
    email: CurrentEmail,
    svc: AppServices,
):
    """
    File a bug report. Always persisted locally; mirrored to the issue tracker on
    a best-effort basis, so a tracker outage still returns 201.
    """
    try:
        report_id = await svc.bug_reports.create(
            user_id,
            body.model_dump(),
            email=email,
            request_id=get_request_id(),
        )
    except RateLimited as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "rate_limited",
                "limit": exc.limit,
                "retry_after_seconds": exc.retry_after_seconds,
            },
            headers={"Retry-After": str(exc.retry_after_seconds)},
        ) from exc
    return {"id": report_id}


@router.get("/")
async def list_bug_reports(user_id: CurrentUser, svc: AppServices, limit: int = 50):
    return {"reports": await svc.bug_reports.list_reports(user_id, limit)}


@router.get("/{report_id}")
async def get_bug_report(report_id: str, user_id: CurrentUser, svc: AppServices):
    report = await svc.bug_reports.get_report(user_id, report_id)
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bug report not found")
    return report
