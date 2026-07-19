import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
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

  return { markDone, remove, seed };
}
