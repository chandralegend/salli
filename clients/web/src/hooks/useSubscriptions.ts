"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  addSubscriptionSubscriptionsPost,
  deleteSubscriptionSubscriptionsSubscriptionIdDelete,
  getAllReportsSubscriptionsReportsGet,
  listSubscriptionsSubscriptionsGet,
  updateSubscriptionSubscriptionsSubscriptionIdPatch,
} from "@/lib/api/sdk.gen";
import type { SubscriptionRequest, SubscriptionUpdateRequest } from "@/lib/api/types.gen";

export type Subscription = {
  id: string;
  name: string;
  amount: string;
  frequency: string;
  next_due_date: string;
  is_active: boolean;
};

export type SubscriptionReport = {
  subscription_id: string;
  name: string;
  alerts: { kind: "missed_charge" | "price_change"; message: string }[];
};

/** Billing cadences the engine understands (see monthlyEquivalent). Stored lowercase. */
export const FREQUENCIES = ["monthly", "annual", "quarterly", "weekly"] as const;
export type Frequency = (typeof FREQUENCIES)[number];

/** Normalises any billing cadence to a monthly-equivalent amount. Display only. */
export function monthlyEquivalent(amount: number, frequency: string): number {
  const f = frequency.toLowerCase();
  if (f === "annual" || f === "yearly") return amount / 12;
  if (f === "weekly") return (amount * 52) / 12;
  if (f === "quarterly") return amount / 3;
  return amount; // monthly
}

export function useSubscriptions() {
  const qc = useQueryClient();

  const subscriptions = useQuery({
    queryKey: ["subscriptions"],
    queryFn: async () => {
      const { data } = await listSubscriptionsSubscriptionsGet({ throwOnError: true });
      return (data as unknown as { subscriptions: Subscription[] }).subscriptions;
    },
  });

  const reports = useQuery({
    queryKey: ["subscription-reports"],
    queryFn: async () => {
      const { data } = await getAllReportsSubscriptionsReportsGet({ throwOnError: true });
      return (data as unknown as { reports: SubscriptionReport[] }).reports;
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["subscriptions"] });
    qc.invalidateQueries({ queryKey: ["subscription-reports"] });
  };

  const addSubscription = useMutation({
    mutationFn: async (input: SubscriptionRequest) => {
      const res = await addSubscriptionSubscriptionsPost({ body: input, throwOnError: true });
      return res.data;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Subscription added");
    },
    onError: (e) =>
      toast.error(`Failed to add subscription: ${e instanceof Error ? e.message : "Unknown error"}`),
  });

  const updateSubscription = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: SubscriptionUpdateRequest }) => {
      const res = await updateSubscriptionSubscriptionsSubscriptionIdPatch({
        path: { subscription_id: id },
        body,
        throwOnError: true,
      });
      return res.data;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Subscription updated");
    },
    onError: (e) =>
      toast.error(`Failed to update subscription: ${e instanceof Error ? e.message : "Unknown error"}`),
  });

  const deleteSubscription = useMutation({
    mutationFn: async (id: string) => {
      await deleteSubscriptionSubscriptionsSubscriptionIdDelete({
        path: { subscription_id: id },
        throwOnError: true,
      });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Subscription removed");
    },
    onError: (e) =>
      toast.error(`Failed to remove subscription: ${e instanceof Error ? e.message : "Unknown error"}`),
  });

  return { subscriptions, reports, addSubscription, updateSubscription, deleteSubscription };
}
