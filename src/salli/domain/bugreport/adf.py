"""
Atlassian Document Format rendering for a bug report's Jira description.

Jira Cloud REST v3 rejects a plain-text `description` — it must be an ADF
document — and posting a string is the single most common way this integration
fails. That shape is constructed here and nowhere else, and this module is pure
(dicts in, dict out) so the exact output can be golden-tested.

Injection safety is *structural*, not filtered: every user-supplied string is
placed as the `text` value of a {"type": "text"} node, which Jira renders
literally. Nothing here ever concatenates user input into a formatting construct
— no markdown, no {code} wiki syntax, no HTML. Do not change that; it is the
whole reason a hostile title cannot alter the rendered ticket.
"""

from __future__ import annotations

import re
from typing import Any, cast

_MAX_TEXT = 2_000

# ADF rejects raw C0 control characters and 400s the entire issue creation, so
# they are stripped. Newline and tab survive because they carry meaning in a
# stack trace.
_CTRL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")


def _t(value: object) -> str:
    return _CTRL.sub("", str(value))[:_MAX_TEXT]


def _text(value: object) -> dict[str, Any]:
    return {"type": "text", "text": _t(value) or "—"}


def _para(value: object) -> dict[str, Any]:
    return {"type": "paragraph", "content": [_text(value)]}


def _heading(value: str) -> dict[str, Any]:
    return {"type": "heading", "attrs": {"level": 3}, "content": [_text(value)]}


def _bullets(pairs: list[tuple[str, object]]) -> dict[str, Any]:
    items = [
        {"type": "listItem", "content": [_para(f"{label}: {value}")]}
        for label, value in pairs
        if value not in (None, "", [])
    ]
    if not items:
        items = [{"type": "listItem", "content": [_para("none")]}]
    return {"type": "bulletList", "content": items}


def _code_block(body: str) -> dict[str, Any]:
    return {"type": "codeBlock", "attrs": {}, "content": [_text(body)]}


def _dicts(value: object) -> list[dict[str, Any]]:
    """Coerce an untrusted JSON value into a list of dicts, dropping anything else."""
    if not isinstance(value, list):
        return []
    items = cast(list[Any], value)
    return [item for item in items if isinstance(item, dict)]


def _failures_table(failures: list[dict[str, Any]]) -> str:
    """
    Recent failures as fixed-width text for a single codeBlock.

    A real ADF table is four nested node types with a paragraph wrapper per cell —
    roughly six times the nodes and six times the ways to earn a 400 — and Jira's
    table renderer is the flakiest part of ADF. A code block always renders
    monospaced, so the columns line up, and it copy-pastes into a terminal.
    """
    lines = [f"{'AGO':>9}  {'STATUS':>6}  {'METHOD':<7} {'PATH':<40} REQUEST-ID"]
    for f in failures:
        ago = f.get("ago_ms")
        ago_text = f"{ago}ms" if ago is not None else "?"
        status = str(f.get("status") or "?")
        method = str(f.get("method") or "?")
        path = str(f.get("path_template") or "?")
        request_id = str(f.get("request_id") or "-")
        lines.append(f"{ago_text:>9}  {status:>6}  {method:<7} {path:<40} {request_id}")
    return "\n".join(lines)


def render_description_adf(
    *,
    description: str,
    report_id: str,
    user_id: str,
    severity: str,
    area: str | None,
    contact_ok: bool,
    api_version: str,
    environment: str,
    request_id: str,
    context: dict[str, Any],
    screenshot_note: str | None = None,
) -> dict[str, Any]:
    """Render a report into an ADF document for Jira's `description` field."""
    ctx: dict[str, Any] = context or {}
    raw_viewport = ctx.get("viewport")
    viewport = cast(dict[str, Any], raw_viewport) if isinstance(raw_viewport, dict) else {}
    content: list[dict[str, Any]] = []

    # The reporter's own words come first — a triager should not have to scroll
    # past diagnostics to find out what broke.
    for block in (description or "").split("\n\n"):
        if block.strip():
            content.append(_para(block.strip()))

    content.append(_heading("Report"))
    content.append(
        _bullets(
            [
                ("Salli report id", report_id),
                # A pseudonymous identifier. The reporter's email address is
                # deliberately never sent to the tracker — it stays in Salli, so
                # account deletion actually removes it.
                ("Salli user id", user_id),
                ("Severity", severity),
                ("Area", area),
                ("Reporter agreed to follow-up email", "yes" if contact_ok else "no"),
                ("API version", api_version),
                ("Environment", environment),
                ("Submission request id", request_id),
            ]
        )
    )

    content.append(_heading("Client environment"))
    content.append(
        _bullets(
            [
                ("Route", ctx.get("route")),
                ("Page", ctx.get("page_title")),
                ("Web commit", ctx.get("app_commit")),
                (
                    "Viewport",
                    f"{viewport.get('w')}x{viewport.get('h')} @{viewport.get('dpr')}x"
                    if viewport
                    else None,
                ),
                ("User agent", ctx.get("user_agent")),
                ("Language / timezone", f"{ctx.get('language')} / {ctx.get('timezone')}"),
                ("Theme", ctx.get("theme")),
                ("React", ctx.get("react_version")),
                ("Supabase configured", ctx.get("supabase_configured")),
                ("Token expiry (epoch)", ctx.get("token_exp")),
                ("Agent thread", ctx.get("agent_thread_id")),
                (
                    "Onboarding / tour complete",
                    f"{ctx.get('onboarding_complete')} / {ctx.get('tour_complete')}",
                ),
            ]
        )
    )

    failures = _dicts(ctx.get("recent_failures"))
    if failures:
        content.append(_heading("Recent API failures (oldest first)"))
        content.append(_code_block(_failures_table(failures)))

    raw_err = ctx.get("client_error")
    err = cast(dict[str, Any], raw_err) if isinstance(raw_err, dict) else {}
    if err:
        content.append(_heading("Client-side error"))
        content.append(_para(f"{err.get('name') or 'Error'}: {err.get('message') or ''}"))
        traces: list[tuple[str, Any]] = [
            ("Stack", err.get("stack")),
            ("Component stack", err.get("component_stack")),
        ]
        for label, body in traces:
            if body:
                content.append(_para(label))
                content.append(_code_block(str(body)))

    if ctx.get("_truncated") or ctx.get("_recent_failures_dropped"):
        dropped = ctx.get("_recent_failures_dropped")
        content.append(
            _para(
                "Note: diagnostics were truncated before storage "
                f"(truncated: {ctx.get('_truncated') or 'none'}; "
                f"failures dropped: {dropped if dropped is not None else 0})."
            )
        )

    if screenshot_note:
        content.append(_heading("Screenshot"))
        content.append(_para(screenshot_note))

    return {"type": "doc", "version": 1, "content": content}
