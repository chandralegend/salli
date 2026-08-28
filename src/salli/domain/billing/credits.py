"""
What an AI action costs, in credits — pure domain, no I/O.

The single place the price of anything is decided. Everything else in the
billing path asks this module rather than carrying its own numbers.

## Why per-action and not per-token

The honest alternative is metering real input/output tokens. It was rejected
for a structural reason, not a philosophical one: `check_and_increment` runs
*before* the LLM call, in the router, and nothing in the stack returns token
usage back up from the model. Real-token metering would mean building a
post-hoc accounting path through LangGraph streaming and every adapter, and
still leaves the pre-flight check with no way to know a request's cost.

Per-action cost is deterministic from `(action, model)`, so it can be charged
at the existing call sites with the `by=` parameter `UsageRepository.increment`
already accepts.

The trade-off is real and worth stating: a forty-page statement costs the same
as "hi". That variance is accepted in exchange for a number users can predict
before they act, and it is bounded because the expensive bulk paths are pinned
to Haiku (see `ai_models.EXTRACTION_MODEL`).

## Reading the numbers

Base costs are expressed in Haiku-equivalents and scaled by the model's
multiplier, so the whole table can be re-read as "how much work is this
relative to one chat message". They are proportional to the real shape of each
call — an advisor run allows 2,000 output tokens and a FIRE strategy 8,000, so
the latter costs twice the former, not the same.
"""

from __future__ import annotations

from salli.domain.ai_models import get_model

# Action keys. These are not metrics — every action bills the one credit
# balance; the key only selects a base price.
ACTION_AGENT_MESSAGE = "agent_message"
ACTION_ENTRY_PARSE = "entry_parse"
ACTION_ADVISOR_RUN = "advisor_run"
ACTION_STATEMENT_UPLOAD = "statement_upload"
ACTION_FIRE_STRATEGY = "fire_strategy"

#: Base cost in credits, before the model multiplier.
ACTION_COSTS: dict[str, int] = {
    # A turn is a supervisor plus however many specialist workers it calls, so
    # it is several model round trips, not one.
    ACTION_AGENT_MESSAGE: 10,
    # One small structured extraction.
    ACTION_ENTRY_PARSE: 2,
    # One structured call, max_tokens=2000.
    ACTION_ADVISOR_RUN: 20,
    # Bulk row classification, batched 30 rows per call.
    ACTION_STATEMENT_UPLOAD: 30,
    # One structured call, max_tokens=8000 — twice the advisor's output budget.
    ACTION_FIRE_STRATEGY: 40,
}

#: Actions that always run on the pinned extraction model, so a user's model
#: choice must not scale them. Keeping this list next to the costs makes the
#: exemption visible to anyone changing either.
_ALWAYS_EXTRACTION = frozenset({ACTION_ENTRY_PARSE, ACTION_STATEMENT_UPLOAD})


def cost(action: str, model_id: str | None = None) -> int:
    """
    Credits for one `action` on `model_id`.

    Unknown actions cost nothing rather than raising. A miscounted charge is a
    billing bug; a raised exception here would take down the feature itself,
    and failing open on price is the cheaper of the two failures.
    """
    base = ACTION_COSTS.get(action, 0)
    if base == 0:
        return 0
    if action in _ALWAYS_EXTRACTION:
        return base
    return base * get_model(model_id).credit_multiplier
