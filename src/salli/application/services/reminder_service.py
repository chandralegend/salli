"""
ReminderService — filing calendar and user-defined reminders.

Automatically seeds tax-deadline reminders from the active tax pack's
FilingCalendar when a user's first account is created. Users can also
create custom reminders (e.g. "gather bank statements").
"""

from __future__ import annotations

import uuid
from collections.abc import Callable
from typing import Any


class ReminderService:
    def __init__(self, uow_factory: Callable[[], Any]) -> None:
        self._uow_factory = uow_factory

    async def list_reminders(
        self,
        user_id: str,
        status: str | None = None,
    ) -> list[dict]:
        async with self._uow_factory() as uow:
            return await uow.reminders.list_reminders(user_id, status)

    async def create_reminder(
        self,
        user_id: str,
        kind: str,
        due_date: str,
    ) -> str:
        reminder_id = str(uuid.uuid4())
        async with self._uow_factory() as uow:
            await uow.reminders.create_reminder(user_id, reminder_id, kind, due_date)
        return reminder_id

    async def mark_done(self, user_id: str, reminder_id: str) -> None:
        async with self._uow_factory() as uow:
            await uow.reminders.mark_done(user_id, reminder_id)

    async def delete_reminder(self, user_id: str, reminder_id: str) -> None:
        async with self._uow_factory() as uow:
            await uow.reminders.delete_reminder(user_id, reminder_id)

    async def seed_filing_calendar(self, user_id: str, year: str = "2025/26") -> list[str]:
        """
        Seed the standard IRD filing deadlines for the given year of assessment.
        Safe to call multiple times — skips kinds that already exist.
        """
        from salli.domain.tax.packs.registry import get_pack

        pack = get_pack("LK", year)
        cal = pack.filing

        # Extract the year start (April 1 for LK)
        yoa_start = year.split("/")[0]  # "2025"

        deadlines: list[tuple[str, str]] = []
        if cal.return_due:
            deadlines.append((f"return_due_{year}", f"{int(yoa_start) + 1}-{cal.return_due}"))
        for i, mmdd in enumerate(cal.installments, 1):
            yr = yoa_start if int(mmdd[:2]) >= 4 else str(int(yoa_start) + 1)
            deadlines.append((f"installment_{i}_{year}", f"{yr}-{mmdd}"))

        async with self._uow_factory() as uow:
            existing = {r["kind"] for r in await uow.reminders.list_reminders(user_id)}
            created = []
            for kind, due_date in deadlines:
                if kind not in existing and due_date:
                    rid = str(uuid.uuid4())
                    await uow.reminders.create_reminder(user_id, rid, kind, due_date)
                    created.append(rid)

        return created
