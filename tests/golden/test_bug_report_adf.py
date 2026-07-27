"""
Golden tests for the Jira description renderer and the severity/label mapping.

These are pure functions, so the exact output can be pinned. Two of these tests
guard integration failures that are otherwise only discoverable against a live
Jira: the v3 API rejects a plain-string description, and it 400s the entire issue
creation on raw C0 control characters.
"""

from __future__ import annotations

import json

import pytest

from salli.domain.bugreport.adf import render_description_adf
from salli.domain.bugreport.models import (
    MAX_CONTEXT_BYTES,
    bound_context,
    jira_labels,
    jira_priority,
)

BASE = {
    "description": "Score shows zero.\n\nExpected the real figure.",
    "report_id": "r-1",
    "user_id": "u-1",
    "severity": "high",
    "area": "freedom",
    "contact_ok": True,
    "api_version": "0.1.0",
    "environment": "production",
    "request_id": "req-1",
}


def _node_types(doc):
    """Every node `type` in the tree, flattened."""
    out = []

    def walk(node):
        if isinstance(node, dict):
            if "type" in node:
                out.append(node["type"])
            for v in node.values():
                walk(v)
        elif isinstance(node, list):
            for v in node:
                walk(v)

    walk(doc)
    return out


def test_renders_an_adf_document_not_a_string():
    """Jira Cloud v3 rejects a plain-text description — this must stay a dict."""
    doc = render_description_adf(**BASE, context={})
    assert isinstance(doc, dict)
    assert doc["type"] == "doc"
    assert doc["version"] == 1
    assert isinstance(doc["content"], list)


def test_users_words_come_first():
    """A triager should not have to scroll past diagnostics to see what broke."""
    doc = render_description_adf(**BASE, context={"route": "/x"})
    first = doc["content"][0]
    assert first["type"] == "paragraph"
    assert first["content"][0]["text"] == "Score shows zero."


def test_control_characters_are_stripped():
    doc = render_description_adf(**{**BASE, "description": "a\x00b\x07c"}, context={})
    serialised = json.dumps(doc)
    assert "\\u0000" not in serialised
    assert "\\u0007" not in serialised


def test_newlines_and_tabs_survive():
    """They carry meaning in a stack trace, so only the other C0 chars are stripped."""
    doc = render_description_adf(
        **BASE,
        context={"client_error": {"name": "E", "message": "m", "stack": "at a\n\tat b"}},
    )
    blocks = [n for n in doc["content"] if n["type"] == "codeBlock"]
    assert any(n["content"][0]["text"] == "at a\n\tat b" for n in blocks)


def test_markup_is_inert_not_escaped():
    """
    Injection safety is structural: hostile input lands as a text node's value and
    renders literally. It must appear verbatim, and must not have created any node
    type of its own.
    """
    hostile = "<script>alert(1)</script>{code}x{code}"
    doc = render_description_adf(**{**BASE, "description": hostile}, context={})

    texts = [n["text"] for n in doc["content"][0]["content"]]
    assert texts == [hostile]
    assert set(_node_types(doc)) <= {
        "doc",
        "paragraph",
        "text",
        "heading",
        "bulletList",
        "listItem",
    }


def test_long_text_is_capped_per_node():
    doc = render_description_adf(**{**BASE, "description": "x" * 5000}, context={})
    assert len(doc["content"][0]["content"][0]["text"]) == 2_000


def test_failures_render_as_one_code_block():
    context = {
        "recent_failures": [
            {
                "ago_ms": 120,
                "method": "POST",
                "status": 422,
                "path_template": "/entries/",
                "request_id": "a",
            },
            {
                "ago_ms": 900,
                "method": "GET",
                "status": 500,
                "path_template": "/accounts/{id}",
                "request_id": "b",
            },
        ]
    }
    doc = render_description_adf(**BASE, context=context)
    blocks = [n for n in doc["content"] if n["type"] == "codeBlock"]
    assert len(blocks) == 1
    body = blocks[0]["content"][0]["text"]
    assert "/accounts/{id}" in body
    assert "422" in body and "500" in body


def test_truncation_is_disclosed_in_the_ticket():
    """A reader must never mistake a truncated blob for a complete one."""
    doc = render_description_adf(
        **BASE, context={"_truncated": "client_error.stack", "_recent_failures_dropped": 30}
    )
    assert any("truncated" in json.dumps(n) for n in doc["content"])


@pytest.mark.parametrize(
    "severity,expected",
    [
        ("blocking", "Highest"),
        ("high", "High"),
        ("medium", "Medium"),
        ("low", "Low"),
        ("nope", None),
    ],
)
def test_severity_maps_to_priority(severity, expected):
    assert jira_priority(severity) == expected


def test_labels_never_contain_whitespace():
    """Jira rejects labels containing whitespace, which would fail issue creation."""
    labels = jira_labels("high", "tax & VAT filing")
    assert all(" " not in label for label in labels)
    assert "area-tax-vat-filing" in labels
    assert "severity-high" in labels


def test_labels_omit_area_when_absent():
    labels = jira_labels("low", None)
    assert labels == ["salli", "salli-web", "severity-low"]


# ── bound_context ──────────────────────────────────────────────────────────────


def _size(blob):
    return len(json.dumps(blob, default=str, separators=(",", ":")).encode())


def test_bound_context_trims_failures_and_records_the_drop():
    out = bound_context({"recent_failures": [{"status": 500} for _ in range(50)]})
    assert len(out["recent_failures"]) == 20
    assert out["_recent_failures_dropped"] == 30


def test_bound_context_drops_stack_before_failures():
    out = bound_context(
        {
            "route": "/ledger",
            "client_error": {"name": "E", "message": "m", "stack": "x" * 40_000},
            "recent_failures": [{"status": 500}],
        }
    )
    assert "stack" not in out["client_error"]
    assert out["_truncated"] == "client_error.stack"
    assert out["recent_failures"] == [{"status": 500}]
    assert _size(out) <= MAX_CONTEXT_BYTES


def test_bound_context_falls_back_to_a_floor():
    out = bound_context(
        {
            "route": "/ledger",
            "app_commit": "abc123",
            # Not reachable by dropping the two known-large fields.
            "user_agent": "y" * 40_000,
        }
    )
    assert out == {"_truncated": "all", "route": "/ledger", "app_commit": "abc123"}
    assert _size(out) <= MAX_CONTEXT_BYTES


def test_bound_context_leaves_small_blobs_untouched():
    blob = {"route": "/x", "app_commit": "abc", "recent_failures": []}
    assert bound_context(blob) == blob
