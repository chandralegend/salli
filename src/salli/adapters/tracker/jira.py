"""
JiraIssueTrackerAdapter — implements IssueTrackerPort against Jira Cloud REST v3.

Two things about Jira Cloud trip up every first implementation:

1. Auth is HTTP Basic with base64("email:api_token"). A Jira Cloud user API token
   is not a bearer token, and sending it as one returns 401.
2. The v3 `description` field is an Atlassian Document Format document, not a
   string. The ADF tree is built by the pure renderer in
   domain/bugreport/adf.py and passed straight through here.

Constructor takes plain primitives, never Settings; composition.py builds this
lazily and returns None when unconfigured.
"""

from __future__ import annotations

import base64
from typing import Any

import httpx

from salli.application.ports import IssueTrackerPort

_TIMEOUT = 20.0


class JiraIssueTrackerAdapter(IssueTrackerPort):
    def __init__(
        self,
        base_url: str,
        email: str,
        api_token: str,
        project_key: str,
        issue_type: str = "Bug",
    ) -> None:
        self._base = base_url.rstrip("/")
        creds = base64.b64encode(f"{email}:{api_token}".encode()).decode()
        self._headers = {
            "Authorization": f"Basic {creds}",
            "Accept": "application/json",
        }
        self._project = project_key
        self._issue_type = issue_type or "Bug"

    async def create_issue(
        self,
        *,
        summary: str,
        description_adf: dict[str, Any],
        labels: list[str],
        priority_name: str | None,
    ) -> dict[str, Any]:
        """
        Create an issue, degrading optional fields on rejection.

        The ladder is not a retry framework — this repo has none and shouldn't grow
        one here. Each rung drops exactly the optional field a differently
        configured Jira project rejects: a custom priority scheme, a locked-down
        labels field, a renamed issue type. Only a 400 advances the ladder;
        401/403/5xx/timeout fail immediately, because retrying those just
        multiplies latency on a push that was best-effort to begin with.
        """
        rungs: list[tuple[str | None, list[str], str]] = [
            (priority_name, labels, self._issue_type),
            (None, labels, self._issue_type),
            (None, [], self._issue_type),
            (None, [], "Task"),
        ]
        last_error = ""

        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            for priority, rung_labels, issue_type in rungs:
                fields: dict[str, Any] = {
                    "project": {"key": self._project},
                    # Jira's own summary limit is 255; the API contract caps the
                    # title at 200, so this is belt and braces.
                    "summary": summary[:255],
                    "description": description_adf,
                    "issuetype": {"name": issue_type},
                }
                if rung_labels:
                    fields["labels"] = rung_labels
                if priority:
                    fields["priority"] = {"name": priority}

                resp = await client.post(
                    f"{self._base}/rest/api/3/issue",
                    headers={**self._headers, "Content-Type": "application/json"},
                    json={"fields": fields},
                )
                if resp.status_code < 300:
                    key = str(resp.json()["key"])
                    return {"key": key, "url": f"{self._base}/browse/{key}"}
                if resp.status_code != 400:
                    resp.raise_for_status()
                last_error = resp.text[:500]

        raise RuntimeError(f"Jira rejected the issue on every rung: {last_error}")

    async def attach_file(
        self, issue_key: str, filename: str, content: bytes, mime_type: str
    ) -> None:
        """
        Attach a file to an existing issue.

        Attachments are a separate multipart call and require the XSRF opt-out
        header — without `X-Atlassian-Token: no-check` Jira returns 403.
        """
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.post(
                f"{self._base}/rest/api/3/issue/{issue_key}/attachments",
                headers={**self._headers, "X-Atlassian-Token": "no-check"},
                files={"file": (filename, content, mime_type)},
            )
            resp.raise_for_status()
