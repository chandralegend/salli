"""Unit tests for AdvisorService using in-memory fakes."""

from __future__ import annotations

import uuid
from contextlib import asynccontextmanager

import pytest

from salli.application.services.advisor_service import AdvisorService

# ── In-memory fakes ────────────────────────────────────────────────────────────


class FakeAdvisoryRepo:
    def __init__(self):
        self._reports: dict[str, dict] = {}

    async def save(self, user_id, report):
        rid = str(uuid.uuid4())
        self._reports[rid] = {**report, "id": rid, "user_id": user_id}
        return rid

    async def get(self, user_id, report_id):
        r = self._reports.get(report_id)
        return r if r and r["user_id"] == user_id else None

    async def get_latest(self, user_id):
        matches = [r for r in self._reports.values() if r["user_id"] == user_id]
        return matches[-1] if matches else None

    async def list(self, user_id, limit=30):
        return [r for r in self._reports.values() if r["user_id"] == user_id][:limit]

    async def update_recommendations(self, user_id, report_id, recommendations):
        if report_id in self._reports:
            self._reports[report_id]["recommendations"] = recommendations

    async def ran_today(self, user_id, day):
        return any(
            r["user_id"] == user_id and r.get("created_at", "").startswith(day)
            for r in self._reports.values()
        )


class FakeReminderRepo:
    def __init__(self):
        self.created: list[tuple] = []

    async def create_reminder(self, user_id, reminder_id, label, due_date):
        self.created.append((user_id, reminder_id, label, due_date))
        return reminder_id


class FakeBillingSubscriptionRepo:
    def __init__(self, active_paid):
        self._active_paid = active_paid

    async def list_active_paid(self):
        return self._active_paid


class FakeUoW:
    def __init__(self, advisories, reminders, subscriptions=None):
        self.advisories = advisories
        self.reminders = reminders
        self.subscriptions = subscriptions

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_):
        pass


def _make_service(active_paid=None):
    advisories = FakeAdvisoryRepo()
    reminders = FakeReminderRepo()
    subscriptions = FakeBillingSubscriptionRepo(active_paid or [])

    @asynccontextmanager
    async def uow_factory():
        yield FakeUoW(advisories, reminders, subscriptions)

    svc = AdvisorService(uow_factory, fi_service=None, billing_service=None)
    return svc, advisories, reminders


def _rec(rec_id: str, action_type: str = "none", **action_params) -> dict:
    return {
        "id": rec_id,
        "title": "Do the thing",
        "rationale": "Because reasons",
        "category": "savings",
        "priority": 1,
        "bucket_key": None,
        "action_type": action_type,
        "action_params": action_params,
        "status": "pending",
    }


# ── apply_recommendation ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_apply_recommendation_none_action_marks_applied_without_reminder():
    svc, advisories, reminders = _make_service()
    rec_id = str(uuid.uuid4())
    report_id = await advisories.save("u1", {"recommendations": [_rec(rec_id)]})

    result = await svc.apply_recommendation("u1", report_id, rec_id)

    assert result == {"id": rec_id, "status": "applied"}
    assert reminders.created == []
    updated = await advisories.get("u1", report_id)
    assert updated["recommendations"][0]["status"] == "applied"


@pytest.mark.asyncio
async def test_apply_recommendation_reminder_action_creates_reminder():
    svc, advisories, reminders = _make_service()
    rec_id = str(uuid.uuid4())
    report_id = await advisories.save(
        "u1",
        {
            "recommendations": [
                _rec(rec_id, action_type="reminder", label="Open a FD", due_in_days=7)
            ]
        },
    )

    await svc.apply_recommendation("u1", report_id, rec_id)

    assert len(reminders.created) == 1
    user_id, _, label, _ = reminders.created[0]
    assert user_id == "u1"
    assert label == "Open a FD"


@pytest.mark.asyncio
async def test_apply_recommendation_reminder_defaults_due_days_and_label():
    svc, advisories, reminders = _make_service()
    rec_id = str(uuid.uuid4())
    report_id = await advisories.save(
        "u1", {"recommendations": [_rec(rec_id, action_type="reminder")]}
    )

    await svc.apply_recommendation("u1", report_id, rec_id)

    _, _, label, _ = reminders.created[0]
    assert label == "Do the thing"  # falls back to rec["title"]


@pytest.mark.asyncio
async def test_apply_recommendation_report_not_found_raises():
    svc, _, _ = _make_service()
    with pytest.raises(ValueError, match="Report not found"):
        await svc.apply_recommendation("u1", "nonexistent", "rec1")


@pytest.mark.asyncio
async def test_apply_recommendation_rec_not_found_raises():
    svc, advisories, _ = _make_service()
    report_id = await advisories.save("u1", {"recommendations": [_rec("real-id")]})
    with pytest.raises(ValueError, match="Recommendation not found"):
        await svc.apply_recommendation("u1", report_id, "does-not-exist")


# ── dismiss_recommendation ───────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_dismiss_recommendation_marks_dismissed():
    svc, advisories, _ = _make_service()
    rec_id = str(uuid.uuid4())
    report_id = await advisories.save("u1", {"recommendations": [_rec(rec_id)]})

    result = await svc.dismiss_recommendation("u1", report_id, rec_id)

    assert result == {"id": rec_id, "status": "dismissed"}
    updated = await advisories.get("u1", report_id)
    assert updated["recommendations"][0]["status"] == "dismissed"


@pytest.mark.asyncio
async def test_dismiss_recommendation_report_not_found_raises():
    svc, _, _ = _make_service()
    with pytest.raises(ValueError, match="Report not found"):
        await svc.dismiss_recommendation("u1", "nonexistent", "rec1")


# ── list_reports / get_latest_report ────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_reports_scoped_to_user():
    svc, advisories, _ = _make_service()
    await advisories.save("u1", {"recommendations": []})
    await advisories.save("u2", {"recommendations": []})

    reports = await svc.list_reports("u1")

    assert len(reports) == 1
    assert reports[0]["user_id"] == "u1"


@pytest.mark.asyncio
async def test_get_latest_report_none_when_empty():
    svc, _, _ = _make_service()
    assert await svc.get_latest_report("u1") is None


@pytest.mark.asyncio
async def test_get_latest_report_returns_most_recent():
    svc, advisories, _ = _make_service()
    await advisories.save("u1", {"recommendations": [], "summary": "first"})
    await advisories.save("u1", {"recommendations": [], "summary": "second"})

    latest = await svc.get_latest_report("u1")

    assert latest["summary"] == "second"


# ── due_users ────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_due_users_excludes_users_who_ran_today():
    import datetime

    today = datetime.date.today().isoformat()
    svc, advisories, _ = _make_service(active_paid=[{"user_id": "u1"}, {"user_id": "u2"}])
    await advisories.save("u1", {"recommendations": [], "created_at": today})

    due = await svc.due_users()

    assert due == [{"user_id": "u2"}]


@pytest.mark.asyncio
async def test_due_users_empty_when_no_active_paid_subscribers():
    svc, _, _ = _make_service(active_paid=[])
    assert await svc.due_users() == []


# ── generate_advice (LLM-backed — skip if no API key) ───────────────────────────


@pytest.mark.asyncio
async def test_generate_advice_returns_structured_recommendations():
    import os

    if not os.environ.get("ANTHROPIC_API_KEY"):
        pytest.skip("ANTHROPIC_API_KEY not set — skipping live LLM call")

    from salli.domain.agents.advisor import generate_advice

    context = {
        "currency": "LKR",
        "fi_score": {"overall": 62, "grade": "B", "savings_rate": "0.25"},
        "fire_strategy": None,
        "fire_projections": {"fi_number": "50000000"},
        "surplus_breakdown": {"monthly_surplus": "50000"},
        "goals": [],
        "profile": {},
        "current_rates_research": "",
    }
    advice = await generate_advice(context)

    assert advice.summary
    assert advice.fire_tier_assessment
    assert len(advice.recommendations) > 0
