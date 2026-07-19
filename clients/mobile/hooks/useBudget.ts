import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createBudgetBudgetPost, getBudgetSummaryBudgetBudgetIdSummaryGet, listBudgetsBudgetGet } from "@/lib/api/sdk.gen";

export type BudgetListItem = { id: string; period_start: string; period_end: string; lines: unknown[] };
export type BudgetSummaryLine = { category: string; limit_amount: string; actual_amount: string; variance: string };
export type BudgetSummaryFull = {
  period_start: string;
  period_end: string;
  lines: BudgetSummaryLine[];
  total_limit: string;
  total_actual: string;
  total_variance: string;
};

export function useBudgets() {
  return useQuery({
    queryKey: ["budgets"],
    queryFn: async () => {
      const { data } = await listBudgetsBudgetGet({ throwOnError: true });
      return (data as unknown as { budgets: BudgetListItem[] }).budgets;
    },
  });
}

export function useBudgetSummaryFull(budgetId: string | undefined) {
  return useQuery({
    queryKey: ["budget-summary-full", budgetId],
    queryFn: async () => {
      const { data } = await getBudgetSummaryBudgetBudgetIdSummaryGet({
        path: { budget_id: budgetId! },
        throwOnError: true,
      });
      return data as unknown as BudgetSummaryFull;
    },
    enabled: Boolean(budgetId),
  });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { period_start: string; period_end: string; lines: { account_id: string; limit_amount: number }[] }) => {
      await createBudgetBudgetPost({ body: input, throwOnError: true });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budgets"] }),
  });
}
