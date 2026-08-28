"""
The model a user is charged for must be the model that runs.

These two facts live in different layers — pricing in `domain/billing/credits`,
execution in the agent graph — and nothing structural stops them drifting. The
first version of this feature had exactly that bug: the multiplier was applied
at the router while `_get_agent` still returned a cached Sonnet graph, so
picking Opus cost 5x and changed nothing about the answer.
"""

from __future__ import annotations

from salli.domain.agents.model_factory import HAIKU, SONNET
from salli.domain.ai_models import DEFAULT_MODEL, EXTRACTION_MODEL, MODELS


class TestOneCatalogue:
    def test_model_factory_reads_from_the_catalogue(self):
        """There were three hardcoded model tables before this — the factory's
        constants, a tier dict in the Anthropic adapter, and a bare literal in
        the statement classifier. They had already drifted."""
        assert SONNET == DEFAULT_MODEL
        assert HAIKU == EXTRACTION_MODEL

    def test_the_adapter_tier_table_reads_from_the_catalogue(self):
        from salli.adapters.llm.anthropic_adapter import _MODEL_TIERS

        assert _MODEL_TIERS["fast"] == EXTRACTION_MODEL
        assert _MODEL_TIERS["strong"] == DEFAULT_MODEL

    def test_no_model_id_is_spelled_out_anywhere_else(self):
        """A literal model id outside the catalogue is how the three tables got
        out of sync in the first place. Guarding it the same way
        test_model_key_threading guards model construction."""
        import pathlib

        root = pathlib.Path(__file__).resolve().parents[3] / "src" / "salli"
        allowed = {"ai_models.py"}
        offenders = []
        for path in root.rglob("*.py"):
            if path.name in allowed:
                continue
            text = path.read_text()
            for marker in ("claude-sonnet", "claude-haiku", "claude-opus", "claude-fable"):
                if marker in text:
                    offenders.append(f"{path.relative_to(root)}: {marker}")
        assert not offenders, (
            f"Model ids must come from domain/ai_models.py, not be written out again: {offenders}"
        )


class TestCacheKeyIncludesModel:
    def test_switching_model_does_not_reuse_the_other_models_graph(self):
        """`_get_agent` caches compiled graphs, and langchain binds the model at
        construction — so without `model` in the key, a user who switched would
        be charged the new multiplier and served the old graph."""
        import inspect

        from salli.application.services.agent_service import AgentService

        source = inspect.getsource(AgentService._get_agent)
        # The key tuple must carry the model alongside persona/date/credential.
        assert "cache_key = (persona" in source
        assert "model)" in source, "model must be part of the agent cache key"

    def test_every_selectable_model_is_a_real_catalogue_entry(self):
        for model_id, model in MODELS.items():
            assert model.id == model_id
            assert model.name
            assert model.blurb
