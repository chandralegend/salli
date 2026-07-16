import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch";

/** Mirrors clients/web/src/hooks/useDebt.ts */

export type Debt = {
  id: string;
  name: string;
  principal: string;
  apr: string;
  minimum_payment: string;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type PayoffScheduleEntry = {
  month: number;
  debt_name: string;
  payment: string;
  principal_paid: string;
  interest_paid: string;
  remaining_balance: string;
};

export type PayoffPlan = {
  strategy: "avalanche" | "snowball";
  months_to_payoff: number;
  total_interest_paid: string;
  schedule: PayoffScheduleEntry[];
};

export function useDebts(activeOnly = false) {
  return useQuery({
    queryKey: ["debt", "list", activeOnly],
    queryFn: () => apiFetch<{ debts: Debt[] }>("GET", `/debt/?active_only=${activeOnly}`).then((d) => d.debts),
    staleTime: 30_000,
  });
}

export function usePayoffPlan(extraMonthlyPayment: number, strategy: "avalanche" | "snowball") {
  return useQuery({
    queryKey: ["debt", "payoff-plan", extraMonthlyPayment, strategy],
    queryFn: () =>
      apiFetch<PayoffPlan>(
        "GET",
        `/debt/payoff-plan?extra_monthly_payment=${extraMonthlyPayment}&strategy=${strategy}`,
      ),
    staleTime: 15_000,
  });
}

export function useAddDebt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; principal: number; apr: number; minimum_payment: number }) =>
      apiFetch<{ id: string }>("POST", "/debt/", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["debt"] }),
  });
}

export function useUpdateDebt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch("PATCH", `/debt/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["debt"] }),
  });
}

export function useDeleteDebt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch("DELETE", `/debt/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["debt"] }),
  });
}
