"""
The 402 a client sees when an AI action costs more credits than it has.

Four routers charge for AI work and every one of them had a byte-identical
twelve-line `except QuotaExceeded` block. That is the shape of thing that
drifts: someone adds a field for one surface, and three others quietly keep
sending the old body.
"""

from __future__ import annotations

from fastapi import HTTPException, status

from salli.application.services.billing_service import QuotaExceeded


def credit_error(exc: QuotaExceeded) -> HTTPException:
    """Map a shortfall to 402 with enough detail for the client to act on it."""
    return HTTPException(
        status_code=status.HTTP_402_PAYMENT_REQUIRED,
        detail={
            "error": "quota_exceeded",
            "metric": exc.metric,
            "limit": exc.limit,
            "plan": exc.plan_key,
            # What this action would have cost and what the user actually has.
            # "This needs 30 credits and you have 12" is a message someone can
            # act on; "out of credits" is one they bounce off.
            "cost": exc.cost,
            "balance": exc.balance,
            "action": exc.action,
            "upgrade": True,
        },
    )
