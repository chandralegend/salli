"""Pure-function tests for credit pricing — no I/O, no DB."""

from __future__ import annotations

import pytest

from salli.domain.ai_models import DEFAULT_MODEL, MODELS, get_model
from salli.domain.billing.credits import (
    ACTION_ADVISOR_RUN,
    ACTION_AGENT_MESSAGE,
    ACTION_COSTS,
    ACTION_ENTRY_PARSE,
    ACTION_FIRE_STRATEGY,
    ACTION_STATEMENT_UPLOAD,
    cost,
)


class TestMultipliers:
    def test_multipliers_track_real_list_pricing(self):
        """The whole design rests on these ratios being the actual price ratios.

        Anthropic prices output at 5x input on every model and the models are
        exact integer multiples of Haiku, which is what makes one integer per
        model exact rather than approximate. If a future model breaks that
        pattern, a single multiplier stops being honest and this test is where
        that should surface.
        """
        assert MODELS["claude-haiku-4-5-20251001"].credit_multiplier == 1
        assert MODELS["claude-sonnet-5"].credit_multiplier == 3
        assert MODELS["claude-opus-5"].credit_multiplier == 5
        assert MODELS["claude-fable-5"].credit_multiplier == 10

    def test_every_model_has_a_positive_multiplier(self):
        for model in MODELS.values():
            assert model.credit_multiplier >= 1, model.id

    def test_unknown_model_resolves_to_the_default(self):
        # A retired model id left in someone's profile must not be passed
        # through to the provider, and must not price as free either.
        assert get_model("claude-does-not-exist").id == DEFAULT_MODEL
        assert get_model(None).id == DEFAULT_MODEL


class TestCost:
    def test_conversation_scales_with_the_chosen_model(self):
        base = ACTION_COSTS[ACTION_AGENT_MESSAGE]
        assert cost(ACTION_AGENT_MESSAGE, "claude-haiku-4-5-20251001") == base
        assert cost(ACTION_AGENT_MESSAGE, "claude-sonnet-5") == base * 3
        assert cost(ACTION_AGENT_MESSAGE, "claude-opus-5") == base * 5
        assert cost(ACTION_AGENT_MESSAGE, "claude-fable-5") == base * 10

    @pytest.mark.parametrize("action", [ACTION_ENTRY_PARSE, ACTION_STATEMENT_UPLOAD])
    def test_extraction_never_scales_with_the_chosen_model(self, action):
        """Bulk extraction is pinned to Haiku, so picking Opus must not make a
        statement upload five times dearer for work that still ran on Haiku.
        Charging the multiplier here would bill people for a model we did not
        use."""
        base = ACTION_COSTS[action]
        for model_id in MODELS:
            assert cost(action, model_id) == base

    def test_relative_prices_reflect_relative_work(self):
        # A FIRE strategy allows 8,000 output tokens against the advisor's
        # 2,000, and both dwarf a single entry parse.
        at = lambda a: cost(a, "claude-haiku-4-5-20251001")  # noqa: E731
        assert at(ACTION_FIRE_STRATEGY) > at(ACTION_ADVISOR_RUN)
        assert at(ACTION_ADVISOR_RUN) > at(ACTION_ENTRY_PARSE)

    def test_unknown_action_is_free_rather_than_an_exception(self):
        """Failing open on price is the cheaper of the two failure modes: a
        miscount is a billing bug, but raising here would take down the feature
        itself."""
        assert cost("something_new_nobody_priced", "claude-opus-5") == 0
