"""
The one place a chat model is constructed, and therefore the one place an API
key is unwrapped.

Every agent, worker, and one-shot LLM call goes through `chat_model()`. That
matters for two reasons:

1. `Secret.reveal()` is called here and nowhere else, so "where can a key
   escape?" has a single, greppable answer.
2. `api_key` is a required keyword argument with no default. Any call site that
   forgets it raises TypeError immediately, rather than falling through to
   ChatAnthropic's own `ANTHROPIC_API_KEY` environment lookup and silently
   billing the platform for a user who was supposed to be paying their own way.
   That fail-loud property is the whole point — it is why composition.py no
   longer seeds that environment variable.
"""

from __future__ import annotations

from typing import Any

from salli.domain.ai_models import DEFAULT_MODEL, EXTRACTION_MODEL

# Re-exported from the catalogue so there is one list of models in the codebase
# rather than three; the values come from `domain.ai_models` alongside the
# credit multipliers, so a model and its price cannot drift apart.
#
# This constant was called SONNET until conversations were pinned to the
# cheapest model. It is an alias for whatever DEFAULT_MODEL is, and naming it
# after one particular model made it a lie the moment that changed — the six
# agent modules that default to it would have read as "runs on Sonnet" while
# running on Haiku.
CONVERSATION_MODEL = DEFAULT_MODEL
HAIKU = EXTRACTION_MODEL


def reveal(api_key: Any) -> str:
    """Accept a `Secret` or a plain string, return the raw key.

    Tolerates both so callers that already hold a plain string (the CLI, tests)
    don't have to wrap it, while the request path keeps its key wrapped right up
    to this boundary.
    """
    revealed = api_key.reveal() if hasattr(api_key, "reveal") else api_key
    if not revealed:
        raise ValueError(
            "No Anthropic API key available for this request. Either the user's "
            "own key could not be resolved or no platform key is configured."
        )
    return str(revealed)


def chat_model(*, api_key: Any, model: str = CONVERSATION_MODEL, **kwargs: Any) -> Any:
    """Build a ChatAnthropic bound to exactly this key."""
    from langchain_anthropic import ChatAnthropic

    return ChatAnthropic(model=model, api_key=reveal(api_key), **kwargs)
