"""
The AI model catalogue — pure domain, no I/O.

One source of truth for which models exist, what they cost in credits, and
which one is used when a user has not chosen. Before this module the answer
was split across three places that had already drifted: the `SONNET`/`HAIKU`
constants in `domain/agents/model_factory.py`, a `_MODEL_TIERS` dict in
`adapters/llm/anthropic_adapter.py`, and a bare literal inside
`adapters/parsing/llm_classifier.py`. Adding user-selectable models on top of
that split would have meant a choice that silently applied to one path and not
the others.

`domain/agents` imports this for the model id; `domain/billing` imports it for
the credit multiplier. Both are pure domain, so neither direction creates a
cycle or drags I/O into the core.

## Why the multipliers are exact, not estimates

Every current Claude model prices output at exactly 5x its input, and the
models are exact integer multiples of each other:

    Haiku 4.5    $1 / $5     x1
    Sonnet 5     $3 / $15    x3
    Opus 5       $5 / $25    x5
    Fable 5      $10 / $50   x10

So a single integer per model is true cost passthrough rather than an
approximation, and the ratios stay correct no matter how the input/output
split of a particular request happens to fall.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class AiModel:
    id: str
    name: str
    blurb: str
    #: Credits are charged as `base_action_cost * credit_multiplier`.
    credit_multiplier: int


MODELS: dict[str, AiModel] = {
    "claude-haiku-4-5-20251001": AiModel(
        id="claude-haiku-4-5-20251001",
        name="Haiku 4.5",
        blurb="Fastest and cheapest. Good for quick questions and logging spending.",
        credit_multiplier=1,
    ),
    "claude-sonnet-5": AiModel(
        id="claude-sonnet-5",
        name="Sonnet 5",
        blurb="The balanced default. Strong at tax reasoning and planning.",
        credit_multiplier=3,
    ),
    "claude-opus-5": AiModel(
        id="claude-opus-5",
        name="Opus 5",
        blurb="Deeper reasoning for complex tax positions. Uses credits faster.",
        credit_multiplier=5,
    ),
    "claude-fable-5": AiModel(
        id="claude-fable-5",
        name="Fable 5",
        blurb="The most capable model. Ten times the credit cost of Haiku.",
        credit_multiplier=10,
    ),
}

#: Used when a user has expressed no preference.
DEFAULT_MODEL = "claude-sonnet-5"

#: Bulk row classification and free-text entry parsing stay pinned here
#: regardless of what the user picked for conversation. These are mechanical
#: extraction jobs where Haiku is the right tool, and letting someone aim Opus
#: at a 600-row bank statement is a cost trap with no quality upside. Because
#: it is always Haiku, that work is always charged at x1.
EXTRACTION_MODEL = "claude-haiku-4-5-20251001"


def get_model(model_id: str | None) -> AiModel:
    """Return the model for an id, falling back to the default."""
    return MODELS.get(model_id or DEFAULT_MODEL, MODELS[DEFAULT_MODEL])


def is_valid_model(model_id: str) -> bool:
    return model_id in MODELS
