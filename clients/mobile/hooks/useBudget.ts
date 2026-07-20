import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createBudgetBudgetPost,
  getBudgetSummaryBudgetBudgetIdSummaryGet,
  listBudgetsBudgetGet,
  updateBudgetBudgetBudgetIdPatch,
} from "@/lib/api/sdk.gen";

export type BudgetLine = { account_id: string; limit_amount: string };
export type BudgetListItem = { id: string; period_start: string; period_end: string; lines: BudgetLine[] };
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

type BudgetInput = { period_start: string; period_end: string; lines: { account_id: string; limit_amount: number }[] };

export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: BudgetInput) => {
      await createBudgetBudgetPost({ body: input, throwOnError: true });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budgets"] });
      qc.invalidateQueries({ queryKey: ["budget-summary-full"] });
    },
  });
}

export function useUpdateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: BudgetInput & { id: string }) => {
      await updateBudgetBudgetBudgetIdPatch({ path: { budget_id: id }, body: input, throwOnError: true });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budgets"] });
      qc.invalidateQueries({ queryKey: ["budget-summary-full"] });
    },
  });
}
