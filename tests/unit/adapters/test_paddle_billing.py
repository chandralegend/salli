"""Unit tests for PaddleBillingAdapter.

Checkout data, price↔plan mapping, and webhook HMAC verification/parsing are pure.
The portal-session call is exercised through an httpx.MockTransport (no network, no
`respx` dependency).
"""

from __future__ import annotations

import hashlib
import hmac
import json
import time

import httpx
import pytest

from salli.adapters.billing.paddle import MAX_WEBHOOK_AGE_SECONDS, PaddleBillingAdapter

SECRET = "whsec_test"
PRICE_MAP = {
    "plus:month": "pri_plus_m",
    "plus:year": "pri_plus_y",
    "pro:month": "pri_pro_m",
    "pro:year": "pri_pro_y",
}


@pytest.fixture
def adapter():
    return PaddleBillingAdapter(
        api_key="apikey_test",
        webhook_secret=SECRET,
        environment="sandbox",
        price_map=PRICE_MAP,
    )


def _sign(raw: bytes, ts: str | None = None, secret: str = SECRET) -> str:
    """Sign `raw` as Paddle does. Defaults to *now* because verification enforces a
    freshness window — a fixed timestamp would age out and fail every test."""
    ts = str(int(time.time())) if ts is None else ts
    signed = f"{ts}:".encode() + raw
    h1 = hmac.new(secret.encode(), signed, hashlib.sha256).hexdigest()
    return f"ts={ts};h1={h1}"


def _subscription_body(**overrides) -> bytes:
    data = {
        "id": "sub_123",
        "status": "active",
        "customer_id": "ctm_123",
        "items": [{"price": {"id": "pri_pro"}}],
        "current_billing_period": {
            "starts_at": "2026-07-01T00:00:00Z",
            "ends_at": "2026-08-01T00:00:00Z",
        },
        "scheduled_change": None,
        "custom_data": {"user_id": "user-1"},
    }
    data.update(overrides)
    payload = {"event_type": "subscription.updated", "data": data}
    return json.dumps(payload).encode()


# ── Checkout / mapping ───────────────────────────────────────────────────────


async def test_create_checkout_monthly(adapter):
    out = await adapter.create_checkout(
        user_id="user-1", email="u@example.com", plan_key="plus", cycle="month", customer_id="ctm_9"
    )
    assert out["provider"] == "paddle"
    assert out["environment"] == "sandbox"
    assert out["price_id"] == "pri_plus_m"
    assert out["customer_id"] == "ctm_9"
    assert out["customer_email"] == "u@example.com"
    assert out["custom_data"] == {"user_id": "user-1"}


async def test_create_checkout_yearly_picks_annual_price(adapter):
    out = await adapter.create_checkout("user-1", None, "pro", "year", None)
    assert out["price_id"] == "pri_pro_y"


async def test_create_checkout_unknown_cycle_falls_back_to_monthly(adapter):
    out = await adapter.create_checkout("user-1", None, "pro", "weekly", None)
    assert out["price_id"] == "pri_pro_m"


async def test_create_checkout_unmapped_plan_raises(adapter):
    with pytest.raises(RuntimeError, match="No Paddle price"):
        await adapter.create_checkout("user-1", None, "free", "month", None)


def test_plan_for_price_id(adapter):
    # Both the monthly and yearly price of a plan resolve to the same plan key.
    assert adapter.plan_for_price_id("pri_plus_m") == "plus"
    assert adapter.plan_for_price_id("pri_plus_y") == "plus"
    assert adapter.plan_for_price_id("pri_pro_m") == "pro"
    assert adapter.plan_for_price_id("pri_pro_y") == "pro"
    assert adapter.plan_for_price_id("pri_unknown") == "free"


def test_cycle_for_price_id(adapter):
    # The other half of the same lookup: the cycle the plan key deliberately drops.
    assert adapter.cycle_for_price_id("pri_plus_m") == "month"
    assert adapter.cycle_for_price_id("pri_plus_y") == "year"
    assert adapter.cycle_for_price_id("pri_pro_m") == "month"
    assert adapter.cycle_for_price_id("pri_pro_y") == "year"
    # None, not "month": an unmapped price means the cycle is genuinely unknown,
    # and the UI must be able to tell that apart from a known monthly plan.
    assert adapter.cycle_for_price_id("pri_unknown") is None


def test_cycle_lookup_ignores_unconfigured_prices():
    """A half-configured environment (no annual prices) must not invent cycles."""
    adapter = PaddleBillingAdapter(
        api_key="apikey_test",
        webhook_secret=SECRET,
        environment="sandbox",
        price_map={"plus:month": "pri_plus_m", "plus:year": "", "pro:month": "", "pro:year": ""},
    )
    assert adapter.cycle_for_price_id("pri_plus_m") == "month"
    assert adapter.cycle_for_price_id("") is None


def test_environment_falls_back_to_sandbox():
    a = PaddleBillingAdapter("k", "s", "bogus-env", PRICE_MAP)
    assert a._base == "https://sandbox-api.paddle.com"


# ── Webhook verification / parsing ───────────────────────────────────────────


def test_verify_and_parse_valid(adapter):
    raw = _subscription_body()
    event = adapter.verify_and_parse_webhook(raw, _sign(raw))
    assert event is not None
    assert event["user_id"] == "user-1"
    assert event["price_id"] == "pri_pro"
    assert event["status"] == "active"
    assert event["provider_customer_id"] == "ctm_123"
    assert event["provider_subscription_id"] == "sub_123"
    assert event["current_period_start"] == "2026-07-01T00:00:00Z"
    assert event["current_period_end"] == "2026-08-01T00:00:00Z"
    assert event["cancel_at_period_end"] is False


def test_verify_and_parse_cancel_scheduled(adapter):
    raw = _subscription_body(scheduled_change={"action": "cancel"})
    event = adapter.verify_and_parse_webhook(raw, _sign(raw))
    assert event is not None
    assert event["cancel_at_period_end"] is True


def test_verify_rejects_missing_signature(adapter):
    raw = _subscription_body()
    assert adapter.verify_and_parse_webhook(raw, None) is None


def test_verify_rejects_tampered_signature(adapter):
    raw = _subscription_body()
    good = _sign(raw)
    tampered = good[:-1] + ("0" if good[-1] != "0" else "1")
    assert adapter.verify_and_parse_webhook(raw, tampered) is None


def test_verify_rejects_wrong_secret(adapter):
    raw = _subscription_body()
    assert adapter.verify_and_parse_webhook(raw, _sign(raw, secret="other")) is None


def test_verify_rejects_malformed_signature_header(adapter):
    raw = _subscription_body()
    assert adapter.verify_and_parse_webhook(raw, "garbage-no-parts") is None


def test_verify_rejects_body_mismatch(adapter):
    # Valid signature computed for one body, then the body is changed.
    raw = _subscription_body()
    sig = _sign(raw)
    assert adapter.verify_and_parse_webhook(raw + b" ", sig) is None


def test_verify_valid_but_unhandled_event_returns_empty(adapter):
    # A legitimately-signed event we don't act on returns {} (a no-op → HTTP 200),
    # NOT None (which the router turns into 400 and Paddle retries).
    payload = {"event_type": "address.created", "data": {"id": "add_1"}}
    raw = json.dumps(payload).encode()
    assert adapter.verify_and_parse_webhook(raw, _sign(raw)) == {}


def test_verify_transaction_completed_captures_customer(adapter):
    payload = {
        "event_type": "transaction.completed",
        "data": {"id": "txn_1", "customer_id": "ctm_9", "custom_data": {"user_id": "user-1"}},
    }
    raw = json.dumps(payload).encode()
    event = adapter.verify_and_parse_webhook(raw, _sign(raw))
    assert event == {"user_id": "user-1", "provider_customer_id": "ctm_9"}


# ── Replay window ────────────────────────────────────────────────────────────


def test_verify_accepts_fresh_timestamp(adapter):
    raw = _subscription_body()
    # Inside the window but not exactly now — ordinary delivery latency.
    ts = str(int(time.time()) - (MAX_WEBHOOK_AGE_SECONDS - 30))
    assert adapter.verify_and_parse_webhook(raw, _sign(raw, ts=ts)) is not None


def test_verify_rejects_stale_timestamp(adapter):
    # A correctly-signed delivery captured and replayed later. The signature is
    # genuine, so only the freshness check can reject this.
    raw = _subscription_body()
    ts = str(int(time.time()) - (MAX_WEBHOOK_AGE_SECONDS + 60))
    assert adapter.verify_and_parse_webhook(raw, _sign(raw, ts=ts)) is None


def test_verify_rejects_future_timestamp(adapter):
    # Symmetric: a far-future ts means a skewed or forged clock, not a real event.
    raw = _subscription_body()
    ts = str(int(time.time()) + (MAX_WEBHOOK_AGE_SECONDS + 60))
    assert adapter.verify_and_parse_webhook(raw, _sign(raw, ts=ts)) is None


def test_verify_rejects_non_numeric_timestamp(adapter):
    # Must return None, not raise — the ts is attacker-supplied (it is signed, but
    # only against a secret we may have rotated).
    raw = _subscription_body()
    assert adapter.verify_and_parse_webhook(raw, _sign(raw, ts="not-a-number")) is None


def test_verify_returns_none_without_secret():
    a = PaddleBillingAdapter("k", "", "sandbox", PRICE_MAP)
    raw = _subscription_body()
    # No configured secret -> cannot verify.
    assert a.verify_and_parse_webhook(raw, "ts=1;h1=abc") is None


# ── Portal session (mocked transport) ────────────────────────────────────────


async def test_get_portal_url(adapter, monkeypatch):
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["auth"] = request.headers.get("authorization")
        return httpx.Response(
            200,
            json={"data": {"urls": {"general": {"overview": "https://portal.paddle/session-1"}}}},
        )

    transport = httpx.MockTransport(handler)
    real_client = httpx.AsyncClient

    def _client(*args, **kwargs):
        kwargs.pop("timeout", None)
        return real_client(transport=transport)

    monkeypatch.setattr("salli.adapters.billing.paddle.httpx.AsyncClient", _client)

    url = await adapter.get_portal_url("ctm_123")

    assert url == "https://portal.paddle/session-1"
    assert captured["url"] == ("https://sandbox-api.paddle.com/customers/ctm_123/portal-sessions")
    assert captured["auth"] == "Bearer apikey_test"
