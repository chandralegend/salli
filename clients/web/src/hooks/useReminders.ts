"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listRemindersRemindersGet,
  markDoneRemindersReminderIdDonePatch,
  seedFilingCalendarRemindersSeedPost,
  createReminderRemindersPost,
} from "@/lib/api/sdk.gen";
import { apiFetch } from "@/lib/api-fetch";

export type Reminder = {
  id: string;
  kind: string;
  due_date: string;
  status: string;
};

/**
 * Turn current budget-overspend, missed-charge and policy-expiry conditions
 * into reminder rows, then refresh the list.
 *
 * `POST /reminders/sync-alerts` is the whole cross-domain alerting engine, and
 * it had no caller anywhere and no scheduler — so these alerts had never fired
 * for anyone. Running it when the page opens makes them appear without
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
      const r = await apiFetch<{ total: number }>("POST", "/reminders/sync-alerts");
      await qc.invalidateQueries({ queryKey: ["reminders"] });
      return r.total;
    },
    // Once per page visit is plenty — the conditions change with the ledger.
    staleTime: 60 * 1000,
    // An alert sweep failing must never blank the reminders list.
    retry: false,
  });
}

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reminders"] });
      toast.success("Reminder marked as done");
    },
    onError: (e) => toast.error(`Failed: ${e instanceof Error ? e.message : "Unknown error"}`),
  });

  const deleteReminder = useMutation({
    mutationFn: async (reminderId: string) => {
      return apiFetch("DELETE", `/reminders/${reminderId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reminders"] });
      toast.success("Reminder deleted");
    },
    onError: (e) => toast.error(`Failed to delete: ${e instanceof Error ? e.message : "Unknown error"}`),
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
      toast.success("Filing calendar seeded for YA 2025/26");
    },
    onError: (e) => toast.error(`Failed: ${e instanceof Error ? e.message : "Unknown error"}`),
  });

  const createReminder = useMutation({
    mutationFn: async (data: { kind: string; due_date: string }) => {
      const res = await createReminderRemindersPost({ body: data, throwOnError: true });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reminders"] });
      toast.success("Reminder created");
    },
    onError: (e) => toast.error(`Failed: ${e instanceof Error ? e.message : "Unknown error"}`),
  });

  return { reminders, markDone, deleteReminder, seedCalendar, createReminder };
}
