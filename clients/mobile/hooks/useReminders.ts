import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createReminderRemindersPost,
  deleteReminderRemindersReminderIdDelete,
  listRemindersRemindersGet,
  markDoneRemindersReminderIdDonePatch,
  seedFilingCalendarRemindersSeedPost,
} from "@/lib/api/sdk.gen";

export type Reminder = {
  id: string;
  kind: string;
  due_date: string;
  status: "pending" | "done";
  alert_type: string | null;
  severity: "critical" | "warning" | null;
};

export function useReminders() {
  return useQuery({
    queryKey: ["reminders"],
    queryFn: async () => {
      const { data } = await listRemindersRemindersGet({ throwOnError: true });
      return (data as unknown as { reminders: Reminder[] }).reminders;
    },
  });
}

export function useReminderMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["reminders"] });

  // The backend CreateReminderRequest accepts only { kind, due_date } — the
  // freeform `kind` string doubles as the reminder's title/description.
  const create = useMutation({
    mutationFn: async (input: { kind: string; due_date: string }) => {
      await createReminderRemindersPost({ body: input, throwOnError: true });
    },
    onSuccess: invalidate,
  });

  const markDone = useMutation({
    mutationFn: async (id: string) => {
      await markDoneRemindersReminderIdDonePatch({ path: { reminder_id: id }, throwOnError: true });
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await deleteReminderRemindersReminderIdDelete({ path: { reminder_id: id }, throwOnError: true });
    },
    onSuccess: invalidate,
  });

  const seed = useMutation({
    mutationFn: async (year: string) => {
      await seedFilingCalendarRemindersSeedPost({ query: { year }, throwOnError: true });
    },
    onSuccess: invalidate,
  });

  return { create, markDone, remove, seed };
}
