import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch";

/** Mirrors clients/web/src/hooks/useBudget.ts */

export type BudgetLine = { account_id: string; limit_amount: string };

export type Budget = {
  id: string;
  period_start: string;
  period_end: string;
  lines: BudgetLine[];
  created_at?: string | null;
  updated_at?: string | null;
};

export type BudgetSummaryLine = {
  account_id: string;
  category: string;
  limit_amount: string;
  actual_amount: string;
  variance: string;
};

export type BudgetSummary = {
  id: string;
  period_start: string;
  period_end: string;
  total_limit: string;
  total_actual: string;
  total_variance: string;
  lines: BudgetSummaryLine[];
};

export function useBudgets() {
  return useQuery({
    queryKey: ["budget", "list"],
    queryFn: () => apiFetch<{ budgets: Budget[] }>("GET", "/budget/").then((d) => d.budgets),
    staleTime: 30_000,
  });
}

export function useBudgetSummary(budgetId: string | null) {
  return useQuery({
    queryKey: ["budget", "summary", budgetId],
    queryFn: () => apiFetch<BudgetSummary>("GET", `/budget/${budgetId}/summary`),
    enabled: !!budgetId,
    staleTime: 15_000,
  });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { period_start: string; period_end: string; lines: BudgetLine[] }) =>
      apiFetch<{ id: string }>("POST", "/budget/", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budget"] }),
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch("DELETE", `/budget/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budget"] }),
  });
}
