import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createReminderRemindersPost,
  deleteReminderRemindersReminderIdDelete,
  listRemindersRemindersGet,
  markDoneRemindersReminderIdDonePatch,
  seedFilingCalendarRemindersSeedPost,
  syncAlertsRemindersSyncAlertsPost,
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

/**
 * Turn current budget-overspend, missed-charge and policy-expiry conditions
 * into reminder rows, then list them.
 *
 * `POST /reminders/sync-alerts` is the whole cross-domain alerting engine, and
 * it had no caller anywhere and no scheduler — so these alerts had never fired
 * for anyone. Running it when the screen opens makes them appear without
 * depending on infrastructure that doesn't exist yet.
 *
 * It's a write on a read-shaped action, which is only acceptable because the
 * endpoint is explicitly idempotent: it upserts the conditions that are true
 * right now rather than appending.
 */
export function useSyncAlertsOnOpen() {
  const qc = useQueryClient();
  return useQuery({
    queryKey: ["reminders-sync"],
    queryFn: async () => {
      const { data } = await syncAlertsRemindersSyncAlertsPost({ throwOnError: true });
      await qc.invalidateQueries({ queryKey: ["reminders"] });
      return (data as unknown as { total: number }).total;
    },
    // Once per screen visit is plenty — the conditions change with the ledger,
    // not by the second.
    staleTime: 60 * 1000,
    // An alert sweep failing must never blank the reminders list.
    retry: false,
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
