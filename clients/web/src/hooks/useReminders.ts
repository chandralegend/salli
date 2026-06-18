"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listRemindersRemindersGet,
  markDoneRemindersReminderIdDonePatch,
  seedFilingCalendarRemindersSeedPost,
} from "@/lib/api/sdk.gen";

export type Reminder = {
  id: string;
  kind: string;
  due_date: string;
  status: string;
};

export function useReminders() {
  const qc = useQueryClient();

  const reminders = useQuery({
    queryKey: ["reminders"],
    queryFn: async () => {
      const res = await listRemindersRemindersGet({ throwOnError: true });
      return res.data as Reminder[];
    },
  });

  const markDone = useMutation({
    mutationFn: async (reminderId: string) => {
      await markDoneRemindersReminderIdDonePatch({
        path: { reminder_id: reminderId },
        throwOnError: true,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reminders"] });
    },
  });

  const seedCalendar = useMutation({
    mutationFn: async (year?: string) => {
      await seedFilingCalendarRemindersSeedPost({
        query: year ? { year } : undefined,
        throwOnError: true,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reminders"] });
    },
  });

  return { reminders, markDone, seedCalendar };
}
