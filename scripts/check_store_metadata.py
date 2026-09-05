#!/usr/bin/env python3
"""
Check the App Store listing copy against Apple's character limits.

The copy lives in `clients/mobile/store-assets/APP_STORE.md` so it can be read
and edited as prose rather than buried in a JSON blob. That makes it easy to
write one word too many, and App Store Connect only tells you at paste time.

Each field is a fenced block following a `**Field** (N max)` heading. The limit
is read from the heading itself, so there is one place to change it and the
document cannot disagree with the checker.

Keywords are additionally checked for the trailing spaces that silently eat the
100-character budget: App Store Connect counts the whole string, separators
included, so "tax, IRD" spends a character that "tax,IRD" does not.
"""

from __future__ import annotations

import pathlib
import re
import sys

DOC = pathlib.Path(__file__).resolve().parents[1] / "clients/mobile/store-assets/APP_STORE.md"

#: `**Name** (30 max)` followed, eventually, by the next ``` fenced block.
FIELD = re.compile(
    r"\*\*(?P<field>[^*]+?)\*\*\s*\((?P<limit>\d+) max[^)]*\)\s*\n+```\n(?P<body>.*?)\n```",
    re.DOTALL,
)


def main() -> int:
    if not DOC.exists():
        print(f"missing {DOC}")
        return 1

    text = DOC.read_text()
    failures: list[str] = []
    checked = 0

    for m in FIELD.finditer(text):
        field, limit, body = m["field"], int(m["limit"]), m["body"]
        # Apple counts what you paste. The document wraps the description for
        # readability, and those newlines are real characters in the box.
        n = len(body)
        checked += 1
        status = "ok " if n <= limit else "OVER"
        print(f"  {status} {field:<18} {n:>5} / {limit}")
        if n > limit:
            failures.append(f"{field} is {n - limit} characters over its {limit} limit")

        if field.lower().startswith("keywords"):
            if ", " in body:
                failures.append(
                    "Keywords contain a space after a comma. App Store Connect "
                    "counts separators, so each one wastes a character."
                )
            if "\n" in body.strip():
                failures.append("Keywords must be a single line.")

    if not checked:
        print("no fields found — has the document format changed?")
        return 1

    print()
    if failures:
        for f in failures:
            print(f"FAIL: {f}")
        return 1
    print(f"all {checked} fields within limits")
    return 0


if __name__ == "__main__":
    sys.exit(main())
