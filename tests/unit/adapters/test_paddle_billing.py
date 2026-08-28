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
from salli.application.ports import BillingChangePending, BillingChangeRejected

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


# ── Plan changes (mocked transport) ──────────────────────────────────────────


def _mock_http(monkeypatch, handler):
    """Point the adapter's httpx at `handler` and return a dict the handler fills in."""
    transport = httpx.MockTransport(handler)
    real_client = httpx.AsyncClient

    def _client(*args, **kwargs):
        kwargs.pop("timeout", None)
        return real_client(transport=transport)

    monkeypatch.setattr("salli.adapters.billing.paddle.httpx.AsyncClient", _client)


def _capturing(monkeypatch, response: httpx.Response) -> dict:
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["method"] = request.method
        captured["url"] = str(request.url)
        captured["auth"] = request.headers.get("authorization")
        captured["body"] = json.loads(request.content) if request.content else None
        return response

    _mock_http(monkeypatch, handler)
    return captured


def _sub_response(**overrides) -> httpx.Response:
    data = {
        "id": "sub_123",
        "status": "active",
        "customer_id": "ctm_123",
        "items": [{"price": {"id": "pri_plus_y"}}],
        "current_billing_period": {
            "starts_at": "2026-08-01T00:00:00Z",
            "ends_at": "2027-08-01T00:00:00Z",
        },
        "scheduled_change": None,
    }
    data.update(overrides)
    return httpx.Response(200, json={"data": data})


def _error(status_code: int, code: str = "some_code", detail: str = "Paddle says no"):
    return httpx.Response(status_code, json={"error": {"code": code, "detail": detail}})


async def test_change_subscription_sends_complete_item_list_and_billing_mode(adapter, monkeypatch):
    # The body assertion IS the regression test: sending `items` on a PATCH is what
    # replaces the price in place instead of opening a second subscription.
    captured = _capturing(monkeypatch, _sub_response())

    await adapter.change_subscription("sub_123", "plus", "year")

    assert captured["method"] == "PATCH"
    assert captured["url"] == "https://sandbox-api.paddle.com/subscriptions/sub_123"
    assert captured["auth"] == "Bearer apikey_test"
    assert captured["body"] == {
        "items": [{"price_id": "pri_plus_y", "quantity": 1}],
        "proration_billing_mode": "prorated_immediately",
        "on_payment_failure": "prevent_change",
    }


async def test_change_subscription_normalizes_like_the_webhook(adapter, monkeypatch):
    # One normalizer feeds both paths, so the row written after a change and the row
    # written by the webhook that follows it cannot disagree.
    _capturing(monkeypatch, _sub_response(items=[{"price": {"id": "pri_pro"}}]))
    changed = await adapter.change_subscription("sub_123", "pro", "month")

    raw = _subscription_body(
        current_billing_period={
            "starts_at": "2026-08-01T00:00:00Z",
            "ends_at": "2027-08-01T00:00:00Z",
        }
    )
    from_webhook = adapter.verify_and_parse_webhook(raw, _sign(raw))
    assert from_webhook is not None
    assert changed == {k: v for k, v in from_webhook.items() if k != "user_id"}


async def test_preview_targets_the_preview_endpoint(adapter, monkeypatch):
    captured = _capturing(monkeypatch, httpx.Response(200, json={"data": {}}))

    await adapter.preview_subscription_change("sub_123", "pro", "month")

    assert captured["method"] == "PATCH"
    assert captured["url"] == "https://sandbox-api.paddle.com/subscriptions/sub_123/preview"
    assert captured["body"]["items"] == [{"price_id": "pri_pro_m", "quantity": 1}]


async def test_preview_parses_a_charge(adapter, monkeypatch):
    _capturing(
        monkeypatch,
        httpx.Response(
            200,
            json={
                "data": {
                    "immediate_transaction": {
                        "details": {
                            "totals": {
                                "grand_total": "4271",
                                "credit": "1229",
                                "currency_code": "USD",
                            }
                        }
                    },
                    "next_transaction": {"billing_period": {"starts_at": "2027-08-01T00:00:00Z"}},
                    "recurring_transaction_details": {
                        "totals": {"total": "10000", "currency_code": "USD"}
                    },
                    "update_summary": {"result": {"action": "charge", "amount": "4271"}},
                }
            },
        ),
    )

    out = await adapter.preview_subscription_change("sub_123", "plus", "year")

    # Minor units as ints, never floats — Paddle sends them as strings.
    assert out["immediate_charge_minor"] == 4271
    assert out["credit_applied_minor"] == 1229
    assert out["result"] == "charge"
    assert out["result_amount_minor"] == 4271
    assert out["recurring_amount_minor"] == 10000
    assert out["currency"] == "USD"
    assert out["next_billed_at"] == "2027-08-01T00:00:00Z"
    assert out["plan"] == "plus" and out["cycle"] == "year"


async def test_preview_parses_a_credit_with_null_immediate_transaction(adapter, monkeypatch):
    # When the credit for unused time exceeds the new price, Paddle charges nothing and
    # sends immediate_transaction: null. Reporting that as a $0 charge would hide that
    # the money becomes account credit rather than a card refund.
    _capturing(
        monkeypatch,
        httpx.Response(
            200,
            json={
                "data": {
                    "immediate_transaction": None,
                    "update_summary": {
                        "result": {"action": "credit", "amount": "7042", "currency_code": "LKR"}
                    },
                }
            },
        ),
    )

    out = await adapter.preview_subscription_change("sub_123", "plus", "month")

    assert out["immediate_charge_minor"] == 0
    assert out["result"] == "credit"
    assert out["result_amount_minor"] == 7042
    assert out["currency"] == "LKR"


async def test_preview_tolerates_a_missing_update_summary(adapter, monkeypatch):
    # A bare d["key"] here would raise KeyError, which main.py maps to HTTP 404 —
    # a billing preview must never report "Not found" because of a shape variation.
    _capturing(monkeypatch, httpx.Response(200, json={"data": {}}))

    out = await adapter.preview_subscription_change("sub_123", "pro", "year")

    assert out["result"] == "none"
    assert out["immediate_charge_minor"] == 0
    assert out["next_billed_at"] is None


@pytest.mark.parametrize("code", [400, 403, 404, 409, 422, 429])
async def test_change_raises_rejected_for_provider_refusals(adapter, monkeypatch, code):
    _capturing(monkeypatch, _error(code, "subscription_locked_renewal", "Renewing"))

    with pytest.raises(BillingChangeRejected) as exc:
        await adapter.change_subscription("sub_123", "plus", "year")

    assert exc.value.code == "subscription_locked_renewal"
    assert "Renewing" in str(exc.value)


async def test_change_rejection_falls_back_to_raw_body(adapter, monkeypatch):
    _capturing(monkeypatch, httpx.Response(400, text="<html>gateway noise</html>"))

    with pytest.raises(BillingChangeRejected) as exc:
        await adapter.change_subscription("sub_123", "plus", "year")

    assert "gateway noise" in exc.value.detail


@pytest.mark.parametrize("code", [401, 500, 502])
async def test_change_lets_operator_failures_escape(adapter, monkeypatch, code):
    # A bad API key or a Paddle outage must not be reported to the user as a billing
    # decision — it should surface as a 500 and page someone.
    _capturing(monkeypatch, httpx.Response(code, json={}))

    with pytest.raises(httpx.HTTPStatusError):
        await adapter.change_subscription("sub_123", "plus", "year")


async def test_change_timeout_raises_pending_not_rejected(adapter, monkeypatch):
    # Paddle may have charged the card before we gave up. Pending (not an error) is
    # what stops the UI offering a retry that would prorate a second time.
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.TimeoutException("too slow")

    _mock_http(monkeypatch, handler)

    with pytest.raises(BillingChangePending):
        await adapter.change_subscription("sub_123", "plus", "year")


async def test_change_unmapped_price_raises_before_any_call(adapter, monkeypatch):
    def handler(request: httpx.Request) -> httpx.Response:
        raise AssertionError("must not reach Paddle with no price configured")

    _mock_http(monkeypatch, handler)
    half = PaddleBillingAdapter("k", SECRET, "sandbox", {"plus:month": "pri_plus_m"})

    with pytest.raises(RuntimeError, match="No Paddle price configured"):
        await half.change_subscription("sub_123", "pro", "year")


async def test_find_subscription_id_returns_first_live_subscription(adapter, monkeypatch):
    captured = _capturing(
        monkeypatch, httpx.Response(200, json={"data": [{"id": "sub_999"}, {"id": "sub_000"}]})
    )

    assert await adapter.find_subscription_id("ctm_123") == "sub_999"
    assert "customer_id=ctm_123" in captured["url"]


async def test_find_subscription_id_returns_none_when_customer_has_none(adapter, monkeypatch):
    _capturing(monkeypatch, httpx.Response(200, json={"data": []}))
    assert await adapter.find_subscription_id("ctm_123") is None


# ── One-time credit packs ────────────────────────────────────────────────────
#
# Top-ups arrive on `transaction.completed`, the same event that already
# carried the customer id. They are deliberately NOT subscription items:
# `_change_body` sends `items` as the complete list, so an add-on item would be
# deleted the first time the user changed plan.

CREDIT_PACKS = {
    "10k": ("pri_credits_10k", 10_000),
    "25k": ("pri_credits_25k", 25_000),
    "60k": ("pri_credits_60k", 60_000),
}


@pytest.fixture
def credit_adapter():
    return PaddleBillingAdapter("k", SECRET, "sandbox", PRICE_MAP, credit_packs=CREDIT_PACKS)


def _parse_txn(adapter, items: list[dict], txn_id: str = "txn_01") -> dict:
    """Sign and parse a transaction.completed delivery, as Paddle would send it.

    Goes through the real verify_and_parse_webhook rather than reaching for an
    internal, so the signature path is exercised too — a mapping that only
    works on unsigned input would prove nothing.
    """
    raw = json.dumps(
        {
            "event_type": "transaction.completed",
            "data": {
                "id": txn_id,
                "customer_id": "ctm_1",
                "custom_data": {"user_id": "user-1"},
                "items": items,
            },
        }
    ).encode()
    return adapter.verify_and_parse_webhook(raw, _sign(raw))


def test_a_credit_pack_purchase_reports_credits_and_the_transaction_id(credit_adapter):
    event = _parse_txn(credit_adapter, [{"price": {"id": "pri_credits_25k"}}])
    assert event["credits"] == 25_000
    # The transaction id is what makes the grant idempotent against Paddle's
    # webhook retries; without it a redelivery grants a second pack.
    assert event["transaction_id"] == "txn_01"
    assert event["user_id"] == "user-1"


def test_quantity_multiplies_the_grant(credit_adapter):
    """Paddle lets someone buy three packs in one checkout."""
    event = _parse_txn(credit_adapter, [{"price": {"id": "pri_credits_10k"}, "quantity": 3}])
    assert event["credits"] == 30_000


def test_mixed_items_sum(credit_adapter):
    event = _parse_txn(
        credit_adapter,
        [{"price": {"id": "pri_credits_10k"}}, {"price": {"id": "pri_credits_60k"}}],
    )
    assert event["credits"] == 70_000


def test_an_ordinary_subscription_payment_grants_nothing(credit_adapter):
    """The same event fires for every subscription charge. Reporting credits
    there would hand out a free pack every billing cycle."""
    event = _parse_txn(credit_adapter, [{"price": {"id": "pri_pro_m"}}])
    assert "credits" not in event
    assert event["provider_customer_id"] == "ctm_1"


def test_unconfigured_packs_are_simply_absent(adapter):
    """The default adapter has no packs configured, which must be inert rather
    than an error — a deployment without top-ups still processes webhooks."""
    event = _parse_txn(adapter, [{"price": {"id": "pri_credits_10k"}}])
    assert "credits" not in event
    assert adapter.credit_pack_price_id("10k") == ""


def test_pack_name_resolves_to_its_price(credit_adapter):
    assert credit_adapter.credit_pack_price_id("25k") == "pri_credits_25k"
    assert credit_adapter.credit_pack_price_id("nonexistent") == ""
