import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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

export function useSubscriptions() {
  return useQuery({
    queryKey: ["subscriptions"],
    queryFn: async () => {
      const { data } = await listSubscriptionsSubscriptionsGet({ throwOnError: true });
      return (data as unknown as { subscriptions: Subscription[] }).subscriptions;
    },
  });
}

export function useSubscriptionReports() {
  return useQuery({
    queryKey: ["subscription-reports"],
    queryFn: async () => {
      const { data } = await getAllReportsSubscriptionsReportsGet({ throwOnError: true });
      return (data as unknown as { reports: SubscriptionReport[] }).reports;
    },
  });
}

export function useSubscriptionMutations() {
  const qc = useQueryClient();
  const remove = useMutation({
    mutationFn: async (id: string) => {
      await deleteSubscriptionSubscriptionsSubscriptionIdDelete({ path: { subscription_id: id }, throwOnError: true });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subscriptions"] }),
  });
  return { remove };
}

/** Track a new recurring subscription (POST /subscriptions) and refresh the
 * list plus the derived alert reports. */
export function useAddSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SubscriptionRequest) => {
      await addSubscriptionSubscriptionsPost({ body: input, throwOnError: true });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subscriptions"] });
      qc.invalidateQueries({ queryKey: ["subscription-reports"] });
    },
  });
}

/** Edit an existing subscription (PATCH /subscriptions/{id}). */
export function useUpdateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: SubscriptionUpdateRequest }) => {
      await updateSubscriptionSubscriptionsSubscriptionIdPatch({
        path: { subscription_id: id },
        body,
        throwOnError: true,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subscriptions"] });
      qc.invalidateQueries({ queryKey: ["subscription-reports"] });
    },
  });
}
