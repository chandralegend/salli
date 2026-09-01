"""
RevenueCat webhook verification and event mapping.

Two things are being protected here: that a forged delivery cannot grant
credits, and that a genuine one grants exactly the right number exactly once.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import time

import pytest

from salli.adapters.billing.revenuecat import MAX_WEBHOOK_AGE_SECONDS, RevenueCatAdapter

SECRET = "rcsec_test"
PACKS = {
    "lk.salli.credits.10k": 10_000,
    "lk.salli.credits.25k": 25_000,
    "lk.salli.credits.60k": 60_000,
}


@pytest.fixture
def adapter():
    return RevenueCatAdapter(webhook_secret=SECRET, credit_packs=PACKS)


def _sign(raw: bytes, ts: str | None = None, secret: str = SECRET) -> str:
    ts = ts or str(int(time.time()))
    mac = hmac.new(secret.encode(), f"{ts}.".encode() + raw, hashlib.sha256).hexdigest()
    return f"t={ts},v1={mac}"


def _body(**event) -> bytes:
    base = {
        "id": "evt_1",
        "type": "NON_RENEWING_PURCHASE",
        "app_user_id": "user-1",
        "product_id": "lk.salli.credits.25k",
        "store": "APP_STORE",
        "environment": "PRODUCTION",
    }
    base.update(event)
    return json.dumps({"api_version": "1.0", "event": base}).encode()


# ── Signature ────────────────────────────────────────────────────────────────


def test_a_valid_signature_is_accepted(adapter):
    raw = _body()
    out = adapter.verify_and_parse_webhook(raw, _sign(raw))
    assert out is not None and out["credits"] == 25_000


def test_no_signature_is_rejected(adapter):
    raw = _body()
    assert adapter.verify_and_parse_webhook(raw, None) is None


def test_a_tampered_body_is_rejected(adapter):
    """The signature covers the body, so editing the pack after signing must
    fail — otherwise anyone could upgrade a 10k purchase to 60k in flight."""
    raw = _body(product_id="lk.salli.credits.10k")
    sig = _sign(raw)
    tampered = _body(product_id="lk.salli.credits.60k")
    assert adapter.verify_and_parse_webhook(tampered, sig) is None


def test_a_signature_from_the_wrong_secret_is_rejected(adapter):
    raw = _body()
    assert adapter.verify_and_parse_webhook(raw, _sign(raw, secret="not-the-secret")) is None


def test_a_stale_delivery_is_rejected(adapter):
    """A valid HMAC stays valid forever, so without the timestamp window a
    captured delivery could be replayed to grant the same pack repeatedly."""
    old = str(int(time.time()) - MAX_WEBHOOK_AGE_SECONDS - 60)
    raw = _body()
    assert adapter.verify_and_parse_webhook(raw, _sign(raw, ts=old)) is None


def test_a_future_dated_delivery_is_rejected(adapter):
    future = str(int(time.time()) + MAX_WEBHOOK_AGE_SECONDS + 60)
    raw = _body()
    assert adapter.verify_and_parse_webhook(raw, _sign(raw, ts=future)) is None


def test_a_malformed_signature_header_is_rejected(adapter):
    raw = _body()
    for bad in ("", "garbage", "t=123", "v1=abc", "t=notanumber,v1=abc"):
        assert adapter.verify_and_parse_webhook(raw, bad) is None


def test_unparseable_body_is_rejected(adapter):
    raw = b"{not json"
    assert adapter.verify_and_parse_webhook(raw, _sign(raw)) is None


# ── Event mapping ────────────────────────────────────────────────────────────


@pytest.mark.parametrize(
    "product,credits",
    [
        ("lk.salli.credits.10k", 10_000),
        ("lk.salli.credits.25k", 25_000),
        ("lk.salli.credits.60k", 60_000),
    ],
)
def test_each_pack_grants_its_own_credits(adapter, product, credits):
    raw = _body(product_id=product)
    assert adapter.verify_and_parse_webhook(raw, _sign(raw))["credits"] == credits


def test_the_grant_is_keyed_on_the_event_id_for_idempotency(adapter):
    """RevenueCat retries for up to 80 minutes and reuses the event id, which
    is exactly the key `grant_credits` needs to settle repeats into one."""
    raw = _body(id="evt_abc")
    out = adapter.verify_and_parse_webhook(raw, _sign(raw))
    assert out["transaction_id"] == "rc_evt_abc"


def test_the_key_is_namespaced_away_from_paddle(adapter):
    """Both providers write to one unique column. An unprefixed store id could
    in principle collide with a Paddle transaction id and silently suppress a
    real grant as a 'duplicate'."""
    raw = _body(id="txn_01")
    out = adapter.verify_and_parse_webhook(raw, _sign(raw))
    assert out["transaction_id"].startswith("rc_")


def test_subscription_events_are_ignored_not_rejected(adapter):
    """Ignoring returns {} → HTTP 200, so RevenueCat stops retrying. Rejecting
    would return 400 and make it retry a legitimate event for 80 minutes."""
    for kind in ("INITIAL_PURCHASE", "RENEWAL", "CANCELLATION", "EXPIRATION"):
        raw = _body(type=kind)
        out = adapter.verify_and_parse_webhook(raw, _sign(raw))
        assert out == {}, kind


def test_an_unmapped_product_grants_nothing(adapter):
    raw = _body(product_id="lk.salli.credits.999k")
    assert adapter.verify_and_parse_webhook(raw, _sign(raw)) == {}


def test_a_purchase_with_no_user_grants_nothing(adapter):
    """Better to drop an unattributable grant than to credit the wrong account."""
    raw = _body(app_user_id=None, original_app_user_id=None)
    assert adapter.verify_and_parse_webhook(raw, _sign(raw)) == {}


def test_it_falls_back_to_the_original_app_user_id(adapter):
    raw = _body(app_user_id=None, original_app_user_id="user-original")
    out = adapter.verify_and_parse_webhook(raw, _sign(raw))
    assert out["user_id"] == "user-original"


def test_sandbox_purchases_are_flagged(adapter):
    raw = _body(environment="SANDBOX")
    assert adapter.verify_and_parse_webhook(raw, _sign(raw))["sandbox"] is True
    raw = _body(environment="PRODUCTION")
    assert adapter.verify_and_parse_webhook(raw, _sign(raw))["sandbox"] is False


# ── Configuration ────────────────────────────────────────────────────────────


def test_unconfigured_packs_never_match_an_empty_product_id():
    """Regression. Unset settings are empty strings, so the three packs used to
    collapse to {"": 60000} — and an event with no product_id read as "" and
    matched it, granting 60,000 credits for nothing."""
    # The repeated "" keys are the bug, not a typo: this is literally what
    # composition builds from three unset settings, and Python collapses it to
    # the last one. noqa because ruff is right in general and wrong here.
    a = RevenueCatAdapter(SECRET, {"": 10_000, "": 25_000, "": 60_000})  # noqa: F601
    raw = _body(product_id=None)
    assert a.verify_and_parse_webhook(raw, _sign(raw)) == {}


def test_no_secret_means_not_configured():
    a = RevenueCatAdapter("", PACKS)
    assert a.configured is False
    raw = _body()
    assert a.verify_and_parse_webhook(raw, _sign(raw)) is None
