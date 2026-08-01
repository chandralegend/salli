"""API tests for the billing plan-change endpoints.

Covers the mapping from service/provider failures to HTTP status codes. The service
itself is an AsyncMock (see conftest), so these assert the router's contract only:
which code, and what the client can branch on in the body.
"""

from __future__ import annotations

import pytest

from salli.application.ports import BillingChangePending, BillingChangeRejected
from salli.application.services.billing_service import SubscriptionChangeUnavailable
from tests.unit.api.conftest import AUTH

PREVIEW = "/billing/subscription/preview"
CHANGE = "/billing/subscription/change"
BODY = {"plan": "plus", "cycle": "year"}


async def test_preview_returns_the_service_payload(client, mock_services):
    mock_services.billing.preview_plan_change.return_value = {
        "immediate_charge_minor": 4271,
        "currency": "USD",
        "result": "charge",
    }

    resp = await client.post(PREVIEW, json=BODY, headers=AUTH)

    assert resp.status_code == 200
    assert resp.json()["immediate_charge_minor"] == 4271
    mock_services.billing.preview_plan_change.assert_awaited_once_with(
        "test-user-1", None, "plus", "year"
    )


async def test_change_returns_fresh_entitlements(client, mock_services):
    mock_services.billing.change_plan.return_value = {"plan": "plus", "billing_cycle": "year"}

    resp = await client.post(CHANGE, json=BODY, headers=AUTH)

    assert resp.status_code == 200
    assert resp.json() == {"plan": "plus", "billing_cycle": "year"}


@pytest.mark.parametrize(
    "reason", ["checkout_required", "past_due", "paused", "scheduled_change", "no_change"]
)
async def test_unavailable_states_return_409_with_a_machine_readable_reason(
    client, mock_services, reason
):
    # The clients branch on `error` (checkout_required triggers the checkout fallback),
    # so it has to survive as a code, not just prose.
    mock_services.billing.change_plan.side_effect = SubscriptionChangeUnavailable(reason)

    resp = await client.post(CHANGE, json=BODY, headers=AUTH)

    assert resp.status_code == 409
    detail = resp.json()["detail"]
    assert detail["error"] == reason
    assert detail["message"] and not detail["message"].startswith(reason)


async def test_provider_rejection_returns_409_with_mapped_copy(client, mock_services):
    mock_services.billing.change_plan.side_effect = BillingChangeRejected(
        "subscription_locked_renewal", "Subscription is renewing"
    )

    resp = await client.post(CHANGE, json=BODY, headers=AUTH)

    assert resp.status_code == 409
    detail = resp.json()["detail"]
    assert detail["error"] == "provider_rejected"
    assert detail["code"] == "subscription_locked_renewal"
    assert "few minutes" in detail["message"]


async def test_unmapped_provider_code_falls_back_to_the_provider_detail(client, mock_services):
    mock_services.billing.change_plan.side_effect = BillingChangeRejected(
        "some_new_code", "Paddle's own explanation"
    )

    resp = await client.post(CHANGE, json=BODY, headers=AUTH)

    assert resp.json()["detail"]["message"] == "Paddle's own explanation"


async def test_timeout_returns_202_pending_not_an_error(client, mock_services):
    # 2xx on purpose: the card may already have been charged, so the UI must wait for
    # the webhook rather than show a failure with a retry button.
    mock_services.billing.change_plan.side_effect = BillingChangePending("timed out")

    resp = await client.post(CHANGE, json=BODY, headers=AUTH)

    assert resp.status_code == 202
    assert resp.json()["status"] == "pending"


async def test_unconfigured_provider_returns_503(client, mock_services):
    mock_services.billing.change_plan.side_effect = RuntimeError("Billing provider not configured")

    resp = await client.post(CHANGE, json=BODY, headers=AUTH)

    assert resp.status_code == 503
    assert "not configured" in resp.json()["detail"]


@pytest.mark.parametrize(
    "body",
    [
        {"plan": "gold", "cycle": "month"},
        {"plan": "plus", "cycle": "weekly"},
        {"cycle": "month"},
    ],
)
async def test_invalid_plan_or_cycle_is_rejected_before_reaching_the_service(
    client, mock_services, body
):
    resp = await client.post(CHANGE, json=body, headers=AUTH)

    assert resp.status_code == 422
    mock_services.billing.change_plan.assert_not_awaited()


async def test_cycle_defaults_to_monthly(client, mock_services):
    mock_services.billing.change_plan.return_value = {}

    await client.post(CHANGE, json={"plan": "pro"}, headers=AUTH)

    mock_services.billing.change_plan.assert_awaited_once_with("test-user-1", None, "pro", "month")


@pytest.mark.parametrize("path", [PREVIEW, CHANGE])
async def test_plan_changes_require_authentication(client, path):
    assert (await client.post(path, json=BODY)).status_code == 401
