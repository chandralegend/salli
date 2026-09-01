"""
RevenueCat webhooks — the iOS half of purchasing.

Paddle cannot serve this. Its post-*Epic* external checkout is limited to the
United States (Paddle's own docs say so), and the other carve-outs from Apple's
in-app-purchase requirement are the EU and South Korea. Salli's users are in
Sri Lanka, so StoreKit is the only compliant route there, and RevenueCat is the
layer over StoreKit that also reconciles with Paddle so a user ends up with one
credit balance rather than two.

The deliberate design choice here is how little this adds. A credit is a credit
whoever sold it, so this module's whole job is to turn a verified delivery into
`(user_id, credits, transaction_key)` and hand it to the same
`BillingService.grant_credits` the Paddle webhook already calls — including its
idempotency, which matters more here because RevenueCat retries for up to
80 minutes.

Verification mirrors `paddle.py` rather than inventing a second style: HMAC
first, then the replay window, then parse. The scheme differs only in format —
RevenueCat signs `"<timestamp>.<raw body>"` and sends
`X-RevenueCat-Webhook-Signature: t=<unix>,v1=<hex>`.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import time
from typing import Any

_log = logging.getLogger(__name__)

# RevenueCat retries a failed delivery for up to ~80 minutes, but a single
# delivery's clock skew and latency is seconds. Sized like Paddle's for the same
# reason: long enough to tolerate skew, short enough that a captured request
# stops being replayable quickly. Retries are unaffected — each retry is signed
# afresh with a current timestamp.
MAX_WEBHOOK_AGE_SECONDS = 300

# Consumable purchases. Subscriptions arrive as INITIAL_PURCHASE / RENEWAL and
# are deliberately not handled yet — see the note in `_map_event`.
_CREDIT_EVENT_TYPES = frozenset({"NON_RENEWING_PURCHASE"})


class RevenueCatAdapter:
    """Verifies and interprets RevenueCat webhook deliveries.

    Holds no API key: everything needed to grant credits arrives in the signed
    payload, so there is no outbound call and therefore no credential to leak.
    """

    def __init__(self, webhook_secret: str, credit_packs: dict[str, int] | None = None) -> None:
        self._webhook_secret = webhook_secret
        # product identifier -> credits granted. Product ids are chosen in App
        # Store Connect and mirrored in RevenueCat; the mapping lives in config
        # for the same reason Paddle's price map does — it is environment
        # specific and must not be baked into the image.
        # `if k` is load-bearing, not defensive tidiness. Unconfigured settings
        # are empty strings, so without it the three packs collapse to a single
        # {"": 60000} entry — and an event whose product_id is missing reads as
        # "" and matches it. That grants 60,000 credits for nothing.
        self._credits_by_product = {k: v for k, v in (credit_packs or {}).items() if k and v > 0}

    @property
    def configured(self) -> bool:
        """False when no signing secret is set, which disables the route."""
        return bool(self._webhook_secret)

    def verify_and_parse_webhook(
        self, raw_body: bytes, signature: str | None
    ) -> dict[str, Any] | None:
        """Return a normalized event, `{}` for deliveries we ignore, or None if
        the signature is bad.

        None and `{}` are different on purpose: None becomes a 400 so a forged
        request is rejected, `{}` becomes a 200 so RevenueCat does not retry a
        legitimate event we simply do not act on.
        """
        if not signature or not self._webhook_secret:
            return None

        # Header format: "t=1700000000,v1=<hex hmac>"
        parts = dict(p.split("=", 1) for p in signature.split(",") if "=" in p)
        ts, v1 = parts.get("t"), parts.get("v1")
        if not ts or not v1:
            return None

        signed = f"{ts}.".encode() + raw_body
        expected = hmac.new(self._webhook_secret.encode(), signed, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, v1):
            return None

        # Only after the signature checks out. A valid HMAC alone stays valid
        # forever, so a captured delivery could otherwise be replayed to grant
        # the same pack repeatedly. `t` is inside the signed string, so it
        # cannot be edited without invalidating v1. Checked second so an
        # unauthenticated caller cannot use the response to probe our clock.
        try:
            age = time.time() - int(ts)
        except ValueError:
            return None
        if abs(age) > MAX_WEBHOOK_AGE_SECONDS:
            return None

        try:
            payload = json.loads(raw_body)
        except json.JSONDecodeError:
            return None

        return self._map_event(payload)

    def _map_event(self, payload: dict[str, Any]) -> dict[str, Any]:
        event: dict[str, Any] = payload.get("event") or {}
        event_type = str(event.get("type") or "")

        if event_type not in _CREDIT_EVENT_TYPES:
            # Subscription lifecycle (INITIAL_PURCHASE, RENEWAL, CANCELLATION,
            # EXPIRATION, …) lands here and is ignored for now. Granting credits
            # on it would be wrong, and setting the *plan* from it needs a
            # decision this module cannot make on its own: a user could hold an
            # Apple subscription and a Paddle one at once, and `subscriptions`
            # has a single row per user. Ignoring is the safe half of that
            # problem — no money moves and nothing is corrupted.
            return {}

        credits = self._credits_for_product(event)
        if not credits:
            # A consumable we do not recognise. Loud, because it means someone
            # shipped a product in App Store Connect without mapping it here,
            # and the user has paid for credits they will not receive.
            _log.error(
                "RevenueCat NON_RENEWING_PURCHASE for unmapped product %r — "
                "the user paid and no credits were granted. Add it to "
                "PADDLE-style credit pack config.",
                event.get("product_id"),
            )
            return {}

        user_id = event.get("app_user_id") or event.get("original_app_user_id")
        if not user_id:
            _log.error("RevenueCat purchase with no app_user_id; cannot attribute the grant")
            return {}

        return {
            "user_id": str(user_id),
            "credits": credits,
            # The event id, not the store transaction id. RevenueCat reuses the
            # event id across retries of the same delivery, which is exactly the
            # idempotency key we want; `transaction_id` would also work but is
            # absent on some stores. Prefixed so it can never collide with a
            # Paddle transaction id in the same unique column.
            "transaction_id": f"rc_{event.get('id')}",
            "store": event.get("store"),
            # SANDBOX deliveries are real webhooks from test purchases. Passed
            # through so the caller can decide; see the router.
            "sandbox": str(event.get("environment") or "").upper() == "SANDBOX",
        }

    def _credits_for_product(self, event: dict[str, Any]) -> int:
        product_id = str(event.get("product_id") or "")
        return self._credits_by_product.get(product_id, 0)
