"""
Bug-report domain — pure, frozen dataclasses and pure functions. No I/O.

A bug report is a user's description of a problem plus a technical snapshot of
the client that produced it. Two things in here carry real weight:

- `bound_context` caps a client-supplied diagnostics blob. It runs before the
  blob touches the database, because the payload arrives from a browser and
  nothing else stops one report writing megabytes into JSONB.
- `jira_labels` / `jira_priority` map severity onto a tracker. Severity is
  carried *twice* — always as a label, best-effort as a priority — because
  labels exist on every Jira project while priority schemes and issue-type names
  vary, so label-based JQL triage keeps working even when the adapter's
  degradation ladder had to drop the priority field.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from typing import Any, Literal, cast

Severity = Literal["low", "medium", "high", "blocking"]
PushStatus = Literal["pending", "sent", "failed", "skipped"]

# A report that reaches the size floor still keeps its route and build, because
# "which page, which build" is the last thing worth knowing about a bug.
MAX_CONTEXT_BYTES = 16_384
MAX_RECENT_FAILURES = 20


@dataclass(frozen=True)
class BugReport:
    """A submitted report, before it is persisted or pushed to a tracker."""

    title: str
    description: str
    severity: Severity
    area: str | None = None
    contact_ok: bool = False
    contact_email: str | None = None
    file_ref: str | None = None
    context: dict[str, Any] = field(default_factory=dict[str, Any])


# Jira's default priority scheme. A project with a custom scheme rejects an
# unknown name with a 400; the adapter drops the field rather than trying to
# discover the scheme — one fewer round trip, and a ticket with no priority beats
# no ticket at all.
_PRIORITY_BY_SEVERITY: dict[str, str] = {
    "blocking": "Highest",
    "high": "High",
    "medium": "Medium",
    "low": "Low",
}

_LABEL_UNSAFE = re.compile(r"[^a-z0-9-]+")


def jira_priority(severity: str) -> str | None:
    """A Jira priority name for a severity, or None if we don't recognise it."""
    return _PRIORITY_BY_SEVERITY.get(severity)


def jira_labels(severity: str, area: str | None, surface: str = "web") -> list[str]:
    """
    Labels for a report. Hyphens only — Jira rejects labels containing
    whitespace, so an unsanitised area name would fail the whole issue creation.
    """
    labels = ["salli", f"salli-{surface}", f"severity-{severity}"]
    if area:
        slug = _LABEL_UNSAFE.sub("-", area.strip().lower()).strip("-")[:30]
        if slug:
            labels.append(f"area-{slug}")
    return labels


def _size(blob: dict[str, Any]) -> int:
    return len(json.dumps(blob, default=str, separators=(",", ":")).encode())


def bound_context(blob: dict[str, Any]) -> dict[str, Any]:
    """
    Cap a client-supplied diagnostics blob so no single report can write
    megabytes into JSONB.

    Degrades in order of *increasing* forensic value — the biggest, most
    redundant fields go first — and records that it degraded, so a reader never
    mistakes a truncated blob for a complete one.
    """
    out: dict[str, Any] = dict(blob)

    raw_failures = out.get("recent_failures")
    failures = cast(list[Any], raw_failures) if isinstance(raw_failures, list) else []
    if len(failures) > MAX_RECENT_FAILURES:
        out["recent_failures"] = failures[:MAX_RECENT_FAILURES]
        out["_recent_failures_dropped"] = len(failures) - MAX_RECENT_FAILURES
    if _size(out) <= MAX_CONTEXT_BYTES:
        return out

    raw_err = out.get("client_error")
    if isinstance(raw_err, dict):
        err = cast(dict[str, Any], raw_err)
        out["client_error"] = {
            k: v for k, v in err.items() if k not in ("stack", "component_stack")
        }
        out["_truncated"] = "client_error.stack"
    if _size(out) <= MAX_CONTEXT_BYTES:
        return out

    raw_remaining = out.get("recent_failures")
    remaining = cast(list[Any], raw_remaining) if isinstance(raw_remaining, list) else []
    out["recent_failures"] = remaining[:5]
    out["_truncated"] = "client_error.stack,recent_failures"
    if _size(out) <= MAX_CONTEXT_BYTES:
        return out

    return {
        "_truncated": "all",
        "route": out.get("route"),
        "app_commit": out.get("app_commit"),
    }
