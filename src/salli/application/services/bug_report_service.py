"""
BugReportService — stores a user-submitted bug report, then best-effort mirrors
it into an external issue tracker.

The ordering is the whole design: the report is committed to Salli's own database
*before* the tracker is touched, and every tracker failure is swallowed into a
`push_status` column rather than raised. A tracker outage, a misconfigured project
key, or a rejected custom field must never cost us a user's report — they only
ever tried to tell us something was broken.

Rate limiting is deliberately not billing's metering. See RATE_LIMIT_PER_HOUR.
"""

from __future__ import annotations

import datetime
import uuid
from collections.abc import Callable
from typing import Any

from salli.domain.bugreport.adf import render_description_adf
from salli.domain.bugreport.models import bound_context, jira_labels, jira_priority

# Bug reporting is never plan-gated — a user who cannot file a bug is a bug we
# never hear about — so this is a flat per-user burst limit, not a billing metric.
# An hour-long window rather than billing's calendar month because spam is a burst
# problem: a monthly cap still permits a hundred tickets in ninety seconds.
RATE_LIMIT_PER_HOUR = 10

# Jira caps attachments well above this; the limit here is about not shipping a
# large image to a third party on a support path.
MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024
_ATTACHABLE_MIME = ("image/png", "image/jpeg")


class RateLimited(Exception):
    """
    Too many reports from one user inside the window.

    Deliberately not billing's QuotaExceeded: that reads per-plan limits, so a
    metric absent from a plan's limits dict has an effective limit of zero, and it
    would surface in Settings as "Bug reports: 2 / 100" next to the pricing.
    """

    def __init__(self, limit: int, retry_after_seconds: int) -> None:
        self.limit = limit
        self.retry_after_seconds = retry_after_seconds
        super().__init__(f"Bug report rate limit reached ({limit}/hour)")


class BugReportService:
    def __init__(
        self,
        uow_factory: Callable[[], Any],
        tracker: Any = None,
        documents: Any = None,
        api_version: str = "0.1.0",
        environment: str = "development",
    ) -> None:
        self._uow_factory = uow_factory
        self._tracker = tracker
        self._documents = documents
        self._api_version = api_version
        self._environment = environment

    async def create(
        self,
        user_id: str,
        data: dict[str, Any],
        email: str | None = None,
        request_id: str = "",
    ) -> str:
        """
        Persist a report and attempt to mirror it. Returns the report id.

        Raises RateLimited; never raises for a tracker failure.
        """
        now = datetime.datetime.now(datetime.UTC)
        window_start = now - datetime.timedelta(hours=1)

        report_id = str(uuid.uuid4())
        context = bound_context(data.get("context") or {})
        contact_ok = bool(data.get("contact_ok", False))

        async with self._uow_factory() as uow:
            recent = await uow.bug_reports.count_since(user_id, window_start)
            if recent >= RATE_LIMIT_PER_HOUR:
                raise RateLimited(RATE_LIMIT_PER_HOUR, 900)

            await uow.bug_reports.save(
                user_id,
                {
                    "id": report_id,
                    "title": data["title"],
                    "description": data["description"],
                    "severity": data["severity"],
                    "area": data.get("area"),
                    "contact_ok": contact_ok,
                    # From the JWT, never the request body — otherwise the opt-in
                    # switch would be decorative.
                    "contact_email": email if contact_ok else None,
                    "file_ref": data.get("file_ref"),
                    "context": context,
                    "push_status": "pending",
                },
            )

        await self._push(
            user_id,
            report_id=report_id,
            title=data["title"],
            description=data["description"],
            severity=data["severity"],
            area=data.get("area"),
            contact_ok=contact_ok,
            file_ref=data.get("file_ref"),
            context=context,
            request_id=request_id,
        )
        return report_id

    async def list_reports(self, user_id: str, limit: int = 50) -> list[dict[str, Any]]:
        async with self._uow_factory() as uow:
            return await uow.bug_reports.list(user_id, limit)

    async def get_report(self, user_id: str, report_id: str) -> dict[str, Any] | None:
        async with self._uow_factory() as uow:
            return await uow.bug_reports.get(user_id, report_id)

    async def retry_push(self, user_id: str, report_id: str) -> dict[str, Any] | None:
        """Re-attempt the tracker push for a stored report. Operator path (CLI)."""
        async with self._uow_factory() as uow:
            report = await uow.bug_reports.get(user_id, report_id)
        if report is None:
            return None
        await self._push(
            user_id,
            report_id=report_id,
            title=report["title"],
            description=report["description"],
            severity=report["severity"],
            area=report.get("area"),
            contact_ok=bool(report.get("contact_ok")),
            file_ref=report.get("file_ref"),
            context=report.get("context") or {},
            request_id="",
        )
        async with self._uow_factory() as uow:
            return await uow.bug_reports.get(user_id, report_id)

    # ── internals ─────────────────────────────────────────────────────────────

    async def _push(
        self,
        user_id: str,
        *,
        report_id: str,
        title: str,
        description: str,
        severity: str,
        area: str | None,
        contact_ok: bool,
        file_ref: str | None,
        context: dict[str, Any],
        request_id: str,
    ) -> None:
        """Mirror a stored report into the tracker. Never raises."""
        if self._tracker is None:
            await self._mark(user_id, report_id, {"push_status": "skipped"})
            return

        try:
            attachment = await self._load_attachment(user_id, file_ref)
            adf = render_description_adf(
                description=description,
                report_id=report_id,
                user_id=user_id,
                severity=severity,
                area=area,
                contact_ok=contact_ok,
                api_version=self._api_version,
                environment=self._environment,
                request_id=request_id,
                context=context,
                screenshot_note=(
                    "The reporter attached a screenshot; it is attached to this issue."
                    if attachment
                    else None
                ),
            )
            issue = await self._tracker.create_issue(
                summary=title,
                description_adf=adf,
                labels=jira_labels(severity, area),
                priority_name=jira_priority(severity),
            )
        except Exception as exc:  # noqa: BLE001 — a tracker failure is never fatal
            await self._mark(
                user_id,
                report_id,
                {"push_status": "failed", "push_error": repr(exc)[:1000]},
            )
            return

        updates: dict[str, Any] = {
            "push_status": "sent",
            "jira_issue_key": issue.get("key"),
            "jira_url": issue.get("url"),
            "pushed_at": datetime.datetime.now(datetime.UTC),
        }

        if attachment is not None and issue.get("key"):
            filename, content, mime_type = attachment
            try:
                await self._tracker.attach_file(issue["key"], filename, content, mime_type)
            except Exception as exc:  # noqa: BLE001
                # The issue exists, so this is not a failed push — record why the
                # screenshot is missing and leave the status as sent.
                updates["push_error"] = f"attachment: {exc!r}"[:1000]

        await self._mark(user_id, report_id, updates)

    async def _load_attachment(
        self, user_id: str, file_ref: str | None
    ) -> tuple[str, bytes, str] | None:
        """
        Fetch an attached screenshot's bytes, or None.

        `file_ref` is never treated as a storage path — it is looked up through the
        user-scoped document service, so a forged ref reads nobody else's file.
        """
        if not file_ref or self._documents is None:
            return None
        try:
            import base64

            doc = await self._documents.get_document(user_id, file_ref)
            if doc is None:
                return None
            mime_type = doc.get("mime_type") or ""
            if mime_type not in _ATTACHABLE_MIME:
                return None
            fetched = await self._documents.get_file_as_base64(user_id, file_ref)
            if fetched is None:
                return None
            data_b64, mime_type = fetched
            content = base64.b64decode(data_b64)
            if len(content) > MAX_ATTACHMENT_BYTES:
                return None
            return (doc.get("title") or "screenshot.png", content, mime_type)
        except Exception:  # noqa: BLE001 — a missing screenshot must not block the ticket
            return None

    async def _mark(self, user_id: str, report_id: str, updates: dict[str, Any]) -> None:
        try:
            async with self._uow_factory() as uow:
                await uow.bug_reports.update(user_id, report_id, updates)
        except Exception:  # noqa: BLE001 — bookkeeping must not fail the request
            pass
