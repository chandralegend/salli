import pytest

from salli.domain.billing.plans import PLANS
from tests.unit.api.conftest import AUTH


def _recommendation(rec_id: str, priority: int) -> dict:
    return {
        "id": rec_id,
        "title": f"Title {rec_id}",
        "rationale": "r",
        "category": "savings",
        "priority": priority,
        "bucket_key": None,
        "action_type": "none",
        "action_params": {"label": "", "due_in_days": None},
        "status": "pending",
    }


def _report(recs: list[dict]) -> dict:
    return {
        "id": "report-1",
        "trigger": "manual",
        "summary": "s",
        "fire_tier_assessment": "f",
        "recommendations": recs,
    }


@pytest.mark.asyncio
async def test_run_advisor_free_truncates(client, mock_services):
    recs = [_recommendation(str(i), 1) for i in range(5)]
    mock_services.advisor.run_advisor.return_value = _report(recs)
    mock_services.billing.get_current_plan.return_value = PLANS["free"]

    r = await client.post("/advisor/run", headers=AUTH)
    assert r.status_code == 200
    data = r.json()
    unlocked = [x for x in data["recommendations"] if not x["locked"]]
    assert len(unlocked) == 2
    assert data["recommendations_locked_count"] == 3
    for rec in data["recommendations"]:
        if rec["locked"]:
            assert set(rec.keys()) == {"id", "title", "category", "priority", "locked"}


@pytest.mark.asyncio
async def test_run_advisor_plus_unlimited(client, mock_services):
    recs = [_recommendation(str(i), 2) for i in range(5)]
    mock_services.advisor.run_advisor.return_value = _report(recs)
    mock_services.billing.get_current_plan.return_value = PLANS["plus"]

    r = await client.post("/advisor/run", headers=AUTH)
    assert r.status_code == 200
    data = r.json()
    assert all(not x["locked"] for x in data["recommendations"])
    assert data["recommendations_locked_count"] == 0
    assert all("rationale" in x for x in data["recommendations"])


@pytest.mark.asyncio
async def test_latest_report_empty_skips_plan_lookup(client, mock_services):
    mock_services.advisor.get_latest_report.return_value = None

    r = await client.get("/advisor/reports/latest", headers=AUTH)
    assert r.status_code == 200
    assert r.json() == {}
    mock_services.billing.get_current_plan.assert_not_awaited()


@pytest.mark.asyncio
async def test_latest_report_free_truncates(client, mock_services):
    recs = [_recommendation(str(i), 1) for i in range(5)]
    mock_services.advisor.get_latest_report.return_value = _report(recs)
    mock_services.billing.get_current_plan.return_value = PLANS["free"]

    r = await client.get("/advisor/reports/latest", headers=AUTH)
    assert r.status_code == 200
    data = r.json()
    assert data["recommendations_locked_count"] == 3


@pytest.mark.asyncio
async def test_list_reports_truncates_each(client, mock_services):
    recs = [_recommendation(str(i), 1) for i in range(5)]
    mock_services.advisor.list_reports.return_value = [_report(recs), _report(recs)]
    mock_services.billing.get_current_plan.return_value = PLANS["free"]

    r = await client.get("/advisor/reports", headers=AUTH)
    assert r.status_code == 200
    reports = r.json()["reports"]
    assert len(reports) == 2
    for rep in reports:
        assert rep["recommendations_locked_count"] == 3


@pytest.mark.asyncio
async def test_apply_recommendation_unaffected_by_gating(client, mock_services):
    mock_services.advisor.apply_recommendation.return_value = {"applied": True}

    r = await client.post("/advisor/reports/report-1/recommendations/rec-1/apply", headers=AUTH)
    assert r.status_code == 200
    mock_services.advisor.apply_recommendation.assert_awaited_once_with(
        "test-user-1", "report-1", "rec-1"
    )
    mock_services.billing.get_current_plan.assert_not_awaited()
