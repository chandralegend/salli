import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch";

/** Mirrors clients/web/src/hooks/useSubscriptions.ts */

export type Subscription = {
  id: string;
  name: string;
  amount: string;
  frequency: string;
  next_due_date: string;
  account_id: string | null;
  grace_days: number;
  amount_tolerance_pct: string;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type SubscriptionAlert = {
  kind: string;
  message: string;
  expected_amount: string | null;
  actual_amount: string | null;
};

export type SubscriptionMatch = { entry_id: string; entry_date: string; amount: string };

export type SubscriptionReport = {
  subscription_id: string;
  name: string;
  matches: SubscriptionMatch[];
  alerts: SubscriptionAlert[];
};

export function useSubscriptions(activeOnly = false) {
  return useQuery({
    queryKey: ["subscriptions", "list", activeOnly],
    queryFn: () =>
      apiFetch<{ subscriptions: Subscription[] }>("GET", `/subscriptions/?active_only=${activeOnly}`).then(
        (d) => d.subscriptions,
      ),
    staleTime: 30_000,
  });
}

export function useSubscriptionReports() {
  return useQuery({
    queryKey: ["subscriptions", "reports"],
    queryFn: () => apiFetch<{ reports: SubscriptionReport[] }>("GET", "/subscriptions/reports").then((d) => d.reports),
    staleTime: 15_000,
  });
}

export function useAddSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name: string; amount: number; frequency: string; next_due_date: string;
      account_id?: string | null; grace_days?: number; amount_tolerance_pct?: number;
    }) => apiFetch<{ id: string }>("POST", "/subscriptions/", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subscriptions"] }),
  });
}

export function useUpdateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch("PATCH", `/subscriptions/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subscriptions"] }),
  });
}

export function useDeleteSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch("DELETE", `/subscriptions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subscriptions"] }),
  });
}
