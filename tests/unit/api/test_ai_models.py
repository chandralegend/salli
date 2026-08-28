"""
The model picker surface.

The load-bearing property is that it never gates: every model comes back on
every plan, because the credit multiplier does the rationing instead. If a
per-plan allowlist ever creeps in, these fail.
"""

from __future__ import annotations

import pytest

from salli.domain.ai_models import DEFAULT_MODEL, MODELS

from .conftest import AUTH


async def test_catalogue_lists_every_model_with_its_cost(client, mock_services):
    mock_services.profile.get_preferred_model.return_value = DEFAULT_MODEL

    resp = await client.get("/ai-models", headers=AUTH)

    assert resp.status_code == 200
    body = resp.json()
    assert {m["id"] for m in body["models"]} == set(MODELS)
    assert body["selected"] == DEFAULT_MODEL
    assert body["default"] == DEFAULT_MODEL


async def test_cost_per_message_scales_with_the_model(client, mock_services):
    mock_services.profile.get_preferred_model.return_value = DEFAULT_MODEL

    body = (await client.get("/ai-models", headers=AUTH)).json()
    by_id = {m["id"]: m for m in body["models"]}

    haiku = by_id["claude-haiku-4-5-20251001"]
    opus = by_id["claude-opus-5"]
    # The number the UI shows, and the reason showing a model choice is safe.
    assert opus["credits_per_message"] == haiku["credits_per_message"] * 5


async def test_exactly_one_model_is_marked_default(client, mock_services):
    mock_services.profile.get_preferred_model.return_value = DEFAULT_MODEL

    body = (await client.get("/ai-models", headers=AUTH)).json()
    assert sum(1 for m in body["models"] if m["is_default"]) == 1


async def test_selecting_a_model_stores_it(client, mock_services):
    resp = await client.put(
        "/ai-models/selection", json={"model_id": "claude-opus-5"}, headers=AUTH
    )

    assert resp.status_code == 204
    mock_services.profile.set_preferred_model.assert_awaited_once_with(
        "test-user-1", "claude-opus-5"
    )


async def test_null_clears_the_preference(client, mock_services):
    """Back to the default. Stored as NULL rather than the default's id, so the
    user follows the default if it ever moves."""
    resp = await client.put("/ai-models/selection", json={"model_id": None}, headers=AUTH)

    assert resp.status_code == 204
    mock_services.profile.set_preferred_model.assert_awaited_once_with("test-user-1", None)


async def test_an_unknown_model_is_rejected(client, mock_services):
    mock_services.profile.set_preferred_model.side_effect = ValueError("Unknown model: gpt-9")

    resp = await client.put("/ai-models/selection", json={"model_id": "gpt-9"}, headers=AUTH)

    assert resp.status_code == 400


@pytest.mark.parametrize("path", ["/ai-models", "/ai-models/selection"])
async def test_requires_auth(client, path):
    resp = await (
        client.get(path) if path == "/ai-models" else client.put(path, json={"model_id": None})
    )
    assert resp.status_code == 401
