import pytest

from salli.application.services.bug_report_service import RateLimited
from tests.unit.api.conftest import AUTH

BODY = {
    "title": "Statement upload fails on BOC PDFs",
    "description": "Uploaded a BOC statement and got a spinner forever.",
    "severity": "high",
    "area": "statements",
    "contact_ok": True,
    "file_ref": None,
    "context": {"route": "/statements", "app_commit": "abc123"},
}


@pytest.mark.asyncio
async def test_create_returns_201_and_id(client, mock_services):
    mock_services.bug_reports.create.return_value = "bug-1"
    r = await client.post("/bug-reports/", json=BODY, headers=AUTH)
    assert r.status_code == 201
    assert r.json() == {"id": "bug-1"}
    mock_services.bug_reports.create.assert_awaited_once()


@pytest.mark.asyncio
async def test_create_requires_auth(client):
    r = await client.post("/bug-reports/", json=BODY)
    assert r.status_code in (401, 403)


@pytest.mark.asyncio
async def test_title_over_200_is_422(client):
    r = await client.post("/bug-reports/", json={**BODY, "title": "x" * 201}, headers=AUTH)
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_empty_description_is_422(client):
    r = await client.post("/bug-reports/", json={**BODY, "description": ""}, headers=AUTH)
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_unknown_severity_is_422(client):
    r = await client.post("/bug-reports/", json={**BODY, "severity": "urgent"}, headers=AUTH)
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_unknown_context_key_is_ignored_not_rejected(client, mock_services):
    """
    The regression test for extra="ignore". The web client and this API deploy
    separately, so a newer client sending an unrecognised diagnostic key is a
    permanent condition — and a 422 here means a bug report nobody ever hears
    about. The key must be dropped, not rejected.
    """
    mock_services.bug_reports.create.return_value = "bug-1"
    payload = {
        **BODY,
        "context": {"route": "/x", "evil": {"a": [1] * 1000}, "future_field": "whatever"},
    }
    r = await client.post("/bug-reports/", json=payload, headers=AUTH)
    assert r.status_code == 201

    received = mock_services.bug_reports.create.call_args.args[1]
    assert received["context"]["route"] == "/x"
    assert "evil" not in received["context"]
    assert "future_field" not in received["context"]


@pytest.mark.asyncio
async def test_email_comes_from_the_jwt_not_the_body(client, mock_services):
    """Otherwise the contact-back opt-in switch would be decorative."""
    mock_services.bug_reports.create.return_value = "bug-1"
    r = await client.post(
        "/bug-reports/",
        json={**BODY, "email": "attacker@evil.test", "contact_email": "attacker@evil.test"},
        headers=AUTH,
    )
    assert r.status_code == 201

    kwargs = mock_services.bug_reports.create.call_args.kwargs
    received = mock_services.bug_reports.create.call_args.args[1]
    # The fake dependency yields None for email; either way it must not be the body's.
    assert kwargs["email"] != "attacker@evil.test"
    assert "email" not in received
    assert "contact_email" not in received


@pytest.mark.asyncio
async def test_user_id_is_not_taken_from_the_body(client, mock_services):
    mock_services.bug_reports.create.return_value = "bug-1"
    r = await client.post("/bug-reports/", json={**BODY, "user_id": "someone-else"}, headers=AUTH)
    assert r.status_code == 201
    assert mock_services.bug_reports.create.call_args.args[0] == "test-user-1"


@pytest.mark.asyncio
async def test_rate_limited_returns_429_with_retry_after(client, mock_services):
    mock_services.bug_reports.create.side_effect = RateLimited(10, 900)
    r = await client.post("/bug-reports/", json=BODY, headers=AUTH)
    assert r.status_code == 429
    assert r.headers["retry-after"] == "900"
    assert r.json()["detail"]["error"] == "rate_limited"


@pytest.mark.asyncio
async def test_many_recent_failures_are_accepted_not_rejected(client, mock_services):
    """Trimming is the domain's job (bound_context); the API must not 422 them."""
    mock_services.bug_reports.create.return_value = "bug-1"
    payload = {
        **BODY,
        "context": {"recent_failures": [{"status": 500, "method": "GET"}] * 50},
    }
    r = await client.post("/bug-reports/", json=payload, headers=AUTH)
    assert r.status_code == 201


@pytest.mark.asyncio
async def test_list_returns_reports(client, mock_services):
    mock_services.bug_reports.list_reports.return_value = [{"id": "bug-1"}]
    r = await client.get("/bug-reports/", headers=AUTH)
    assert r.status_code == 200
    assert r.json() == {"reports": [{"id": "bug-1"}]}


@pytest.mark.asyncio
async def test_get_missing_report_is_404(client, mock_services):
    mock_services.bug_reports.get_report.return_value = None
    r = await client.get("/bug-reports/nope", headers=AUTH)
    assert r.status_code == 404
