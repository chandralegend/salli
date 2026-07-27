"""
Unit tests for BugReportService using in-memory fakes.

The load-bearing property here is that a tracker failure is never fatal. A user
filing a bug report is telling us something is broken; losing that because Jira
was down, misconfigured, or rejected a custom field would be the worst possible
failure mode for this feature.
"""

from __future__ import annotations

import datetime
from contextlib import asynccontextmanager

import pytest

from salli.application.services.bug_report_service import (
    RATE_LIMIT_PER_HOUR,
    BugReportService,
    RateLimited,
)

# ── In-memory fakes ────────────────────────────────────────────────────────────


class FakeBugReportRepo:
    def __init__(self) -> None:
        self.rows: dict[str, dict] = {}
        self.saved: list[dict] = []

    async def save(self, user_id, report):
        row = {**report, "user_id": user_id, "created_at": datetime.datetime.now(datetime.UTC)}
        self.rows[report["id"]] = row
        self.saved.append(row)
        return report["id"]

    async def get(self, user_id, report_id):
        row = self.rows.get(report_id)
        return row if row and row["user_id"] == user_id else None

    async def list(self, user_id, limit=50):
        return [r for r in self.rows.values() if r["user_id"] == user_id][:limit]

    async def update(self, user_id, report_id, updates):
        row = self.rows.get(report_id)
        if row and row["user_id"] == user_id:
            row.update(updates)

    async def delete(self, user_id, report_id):
        self.rows.pop(report_id, None)

    async def count_since(self, user_id, since):
        return sum(
            1 for r in self.rows.values() if r["user_id"] == user_id and r["created_at"] >= since
        )


class FakeUow:
    def __init__(self, repo):
        self.bug_reports = repo


def make_uow_factory(repo):
    @asynccontextmanager
    async def _factory():
        yield FakeUow(repo)

    return _factory


class FakeTracker:
    def __init__(self, create_error=None, attach_error=None):
        self._create_error = create_error
        self._attach_error = attach_error
        self.create_calls = 0
        self.attach_calls = 0

    async def create_issue(self, **kwargs):
        self.create_calls += 1
        if self._create_error:
            raise self._create_error
        return {"key": "SAL-42", "url": "https://example.atlassian.net/browse/SAL-42"}

    async def attach_file(self, issue_key, filename, content, mime_type):
        self.attach_calls += 1
        if self._attach_error:
            raise self._attach_error


PAYLOAD = {
    "title": "Freedom score shows zero",
    "description": "Opened the page and the score is 0.",
    "severity": "high",
    "area": "freedom",
    "contact_ok": True,
    "file_ref": None,
    "context": {"route": "/financial-independence", "app_commit": "abc123"},
}


# ── Tests ──────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_jira_failure_still_saves_and_does_not_raise():
    repo = FakeBugReportRepo()
    tracker = FakeTracker(create_error=RuntimeError("boom"))
    svc = BugReportService(make_uow_factory(repo), tracker=tracker)

    report_id = await svc.create("u1", dict(PAYLOAD))

    assert report_id in repo.rows
    row = repo.rows[report_id]
    assert row["push_status"] == "failed"
    assert "boom" in row["push_error"]


@pytest.mark.asyncio
async def test_no_tracker_marks_skipped():
    repo = FakeBugReportRepo()
    svc = BugReportService(make_uow_factory(repo), tracker=None)

    report_id = await svc.create("u1", dict(PAYLOAD))

    assert repo.rows[report_id]["push_status"] == "skipped"


@pytest.mark.asyncio
async def test_success_records_key_and_url():
    repo = FakeBugReportRepo()
    tracker = FakeTracker()
    svc = BugReportService(make_uow_factory(repo), tracker=tracker)

    report_id = await svc.create("u1", dict(PAYLOAD))

    row = repo.rows[report_id]
    assert row["push_status"] == "sent"
    assert row["jira_issue_key"] == "SAL-42"
    assert row["jira_url"].endswith("/browse/SAL-42")
    assert row["pushed_at"] is not None


@pytest.mark.asyncio
async def test_email_only_stored_when_contact_ok():
    repo = FakeBugReportRepo()
    svc = BugReportService(make_uow_factory(repo))

    opted_in = await svc.create("u1", {**PAYLOAD, "contact_ok": True}, email="a@b.com")
    opted_out = await svc.create("u1", {**PAYLOAD, "contact_ok": False}, email="a@b.com")

    assert repo.rows[opted_in]["contact_email"] == "a@b.com"
    assert repo.rows[opted_out]["contact_email"] is None


@pytest.mark.asyncio
async def test_context_is_bounded_before_persist():
    repo = FakeBugReportRepo()
    svc = BugReportService(make_uow_factory(repo))

    payload = {
        **PAYLOAD,
        "context": {
            "route": "/ledger",
            "recent_failures": [{"status": 500, "method": "GET"} for _ in range(60)],
        },
    }
    report_id = await svc.create("u1", payload)

    stored = repo.rows[report_id]["context"]
    assert len(stored["recent_failures"]) == 20
    assert stored["_recent_failures_dropped"] == 40


@pytest.mark.asyncio
async def test_rate_limit_raises_after_window_fills():
    repo = FakeBugReportRepo()
    svc = BugReportService(make_uow_factory(repo))

    for _ in range(RATE_LIMIT_PER_HOUR):
        await svc.create("u1", dict(PAYLOAD))

    with pytest.raises(RateLimited) as exc:
        await svc.create("u1", dict(PAYLOAD))
    assert exc.value.limit == RATE_LIMIT_PER_HOUR

    # Scoped per user — a second reporter is unaffected.
    assert await svc.create("u2", dict(PAYLOAD))


@pytest.mark.asyncio
async def test_attachment_failure_keeps_status_sent():
    """The issue exists, so the push succeeded; only the screenshot is missing."""
    repo = FakeBugReportRepo()
    tracker = FakeTracker(attach_error=RuntimeError("413"))

    class FakeDocs:
        async def get_document(self, user_id, doc_id):
            return {"title": "shot.png", "mime_type": "image/png"}

        async def get_file_as_base64(self, user_id, doc_id):
            return ("aGVsbG8=", "image/png")

    svc = BugReportService(make_uow_factory(repo), tracker=tracker, documents=FakeDocs())
    report_id = await svc.create("u1", {**PAYLOAD, "file_ref": "doc-1"})

    row = repo.rows[report_id]
    assert row["push_status"] == "sent"
    assert row["push_error"].startswith("attachment: ")
    assert tracker.attach_calls == 1


@pytest.mark.asyncio
async def test_non_image_attachment_is_skipped_not_attached():
    repo = FakeBugReportRepo()
    tracker = FakeTracker()

    class FakeDocs:
        async def get_document(self, user_id, doc_id):
            return {"title": "statement.pdf", "mime_type": "application/pdf"}

        async def get_file_as_base64(self, user_id, doc_id):
            raise AssertionError("must not read a non-image attachment")

    svc = BugReportService(make_uow_factory(repo), tracker=tracker, documents=FakeDocs())
    report_id = await svc.create("u1", {**PAYLOAD, "file_ref": "doc-1"})

    assert repo.rows[report_id]["push_status"] == "sent"
    assert tracker.attach_calls == 0
