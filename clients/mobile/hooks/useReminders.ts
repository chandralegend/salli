import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listRemindersRemindersGet,
  markDoneRemindersReminderIdDonePatch,
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
      const payload = res.data as unknown as { reminders?: Reminder[] } | Reminder[] | null;
      if (Array.isArray(payload)) return payload;
      if (payload && "reminders" in payload) return payload.reminders ?? [];
      return [];
    },
  });

  const markDone = useMutation({
    mutationFn: async (reminderId: string) => {
      await markDoneRemindersReminderIdDonePatch({
        path: { reminder_id: reminderId },
        throwOnError: true,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminders"] }),
  });

  return { reminders, markDone };
}
