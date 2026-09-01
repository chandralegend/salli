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
BODY = {"plan": "pro", "cycle": "year"}


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
        "test-user-1", None, "pro", "year"
    )


async def test_change_returns_fresh_entitlements(client, mock_services):
    mock_services.billing.change_plan.return_value = {"plan": "pro", "billing_cycle": "year"}

    resp = await client.post(CHANGE, json=BODY, headers=AUTH)

    assert resp.status_code == 200
    assert resp.json() == {"plan": "pro", "billing_cycle": "year"}


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
        {"plan": "pro", "cycle": "weekly"},
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


# ── Credit top-ups ───────────────────────────────────────────────────────────


async def test_credit_checkout_returns_paddle_data(client, mock_services):
    mock_services.billing.create_credit_checkout.return_value = {
        "provider": "paddle",
        "environment": "sandbox",
        "price_id": "pri_credits_25k",
        "custom_data": {"user_id": "test-user-1"},
    }

    resp = await client.post("/billing/credits/checkout", json={"pack": "25k"}, headers=AUTH)

    assert resp.status_code == 200
    assert resp.json()["price_id"] == "pri_credits_25k"
    mock_services.billing.create_credit_checkout.assert_awaited_once_with(
        "test-user-1", None, "25k"
    )


async def test_an_unknown_pack_is_rejected_before_reaching_the_provider(client, mock_services):
    """A Literal, so FastAPI rejects it at the boundary. A client must not be
    able to name an arbitrary pack — or, worse, an arbitrary price."""
    resp = await client.post("/billing/credits/checkout", json={"pack": "1000k"}, headers=AUTH)

    assert resp.status_code == 422
    mock_services.billing.create_credit_checkout.assert_not_awaited()


async def test_an_unconfigured_pack_returns_503_not_500(client, mock_services):
    mock_services.billing.create_credit_checkout.side_effect = RuntimeError(
        "Credit pack '60k' is not configured"
    )

    resp = await client.post("/billing/credits/checkout", json={"pack": "60k"}, headers=AUTH)

    assert resp.status_code == 503


async def test_the_retired_starter_plan_cannot_be_bought(client, mock_services):
    """`plus` is gone from the registry, and a subscription still carrying it
    resolves to Free limits — so a stale client must not be able to open a
    checkout for it and pay for nothing."""
    resp = await client.post("/billing/checkout", json={"plan": "plus"}, headers=AUTH)

    assert resp.status_code == 422
    mock_services.billing.create_checkout.assert_not_awaited()


# ── RevenueCat (iOS purchases) ───────────────────────────────────────────────


def _rc_sign(raw: bytes, secret: str = "rcsec_test") -> str:
    import hashlib
    import hmac
    import time

    ts = str(int(time.time()))
    mac = hmac.new(secret.encode(), f"{ts}.".encode() + raw, hashlib.sha256).hexdigest()
    return f"t={ts},v1={mac}"


def _rc_body(event_id: str = "evt_1", product: str = "lk.salli.credits.25k") -> bytes:
    import json

    return json.dumps(
        {
            "api_version": "1.0",
            "event": {
                "id": event_id,
                "type": "NON_RENEWING_PURCHASE",
                "app_user_id": "test-user-1",
                "product_id": product,
                "store": "APP_STORE",
                "environment": "PRODUCTION",
            },
        }
    ).encode()


@pytest.fixture
def revenuecat(mock_services):
    from salli.adapters.billing.revenuecat import RevenueCatAdapter

    mock_services.revenuecat = RevenueCatAdapter(
        webhook_secret="rcsec_test",
        credit_packs={"lk.salli.credits.25k": 25_000},
    )
    return mock_services.revenuecat


async def test_an_ios_purchase_grants_credits(client, mock_services, revenuecat):
    raw = _rc_body()
    resp = await client.post(
        "/billing/revenuecat/webhook",
        content=raw,
        headers={"X-RevenueCat-Webhook-Signature": _rc_sign(raw)},
    )

    assert resp.status_code == 200
    mock_services.billing.grant_credits.assert_awaited_once_with("test-user-1", 25_000, "rc_evt_1")


async def test_a_forged_ios_webhook_grants_nothing(client, mock_services, revenuecat):
    raw = _rc_body()
    resp = await client.post(
        "/billing/revenuecat/webhook",
        content=raw,
        headers={"X-RevenueCat-Webhook-Signature": _rc_sign(raw, secret="wrong")},
    )

    assert resp.status_code == 400
    mock_services.billing.grant_credits.assert_not_awaited()


async def test_a_subscription_event_is_a_200_no_op(client, mock_services, revenuecat):
    """200 so RevenueCat stops retrying; no grant because it isn't a top-up."""
    import json

    raw = json.dumps(
        {
            "api_version": "1.0",
            "event": {"id": "e", "type": "RENEWAL", "app_user_id": "test-user-1"},
        }
    ).encode()
    resp = await client.post(
        "/billing/revenuecat/webhook",
        content=raw,
        headers={"X-RevenueCat-Webhook-Signature": _rc_sign(raw)},
    )

    assert resp.status_code == 200
    mock_services.billing.grant_credits.assert_not_awaited()


async def test_the_route_503s_when_revenuecat_is_unconfigured(client, mock_services):
    from salli.adapters.billing.revenuecat import RevenueCatAdapter

    mock_services.revenuecat = RevenueCatAdapter(webhook_secret="", credit_packs={})
    raw = _rc_body()
    resp = await client.post(
        "/billing/revenuecat/webhook",
        content=raw,
        headers={"X-RevenueCat-Webhook-Signature": _rc_sign(raw)},
    )

    assert resp.status_code == 503
