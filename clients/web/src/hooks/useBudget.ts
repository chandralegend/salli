"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  createBudgetBudgetPost,
  getBudgetSummaryBudgetBudgetIdSummaryGet,
  getScoreFiScoreGet,
  listBudgetsBudgetGet,
  updateBudgetBudgetBudgetIdPatch,
} from "@/lib/api/sdk.gen";

export type BudgetLine = { account_id: string; limit_amount: string };
export type BudgetListItem = {
  id: string;
  period_start: string;
  period_end: string;
  lines: BudgetLine[];
};
export type BudgetSummaryLine = {
  category: string;
  limit_amount: string;
  actual_amount: string;
  variance: string;
};
export type BudgetSummaryFull = {
  period_start: string;
  period_end: string;
  lines: BudgetSummaryLine[];
  total_limit: string;
  total_actual: string;
  total_variance: string;
};

/** First day / last day of the current calendar month, ISO yyyy-mm-dd. */
export function monthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { from, to };
}

type BudgetInput = {
  period_start: string;
  period_end: string;
  lines: { account_id: string; limit_amount: number }[];
};

export function useBudget() {
  const qc = useQueryClient();

  const budgets = useQuery({
    queryKey: ["budgets"],
    queryFn: async () => {
      const { data } = await listBudgetsBudgetGet({ throwOnError: true });
      return (data as unknown as { budgets: BudgetListItem[] }).budgets;
    },
  });

  const latest = budgets.data?.[0];

  const summary = useQuery({
    queryKey: ["budget-summary-full", latest?.id],
    queryFn: async () => {
      const { data } = await getBudgetSummaryBudgetBudgetIdSummaryGet({
        path: { budget_id: latest!.id },
        throwOnError: true,
      });
      return data as unknown as BudgetSummaryFull;
    },
    enabled: Boolean(latest?.id),
  });

  // Avg monthly income drives the "% of income" recommendation in the editor.
  const income = useQuery({
    queryKey: ["fi-score"],
    queryFn: async () => {
      const { data } = await getScoreFiScoreGet({ throwOnError: true });
      return data as unknown as { monthly_income?: string } | null;
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["budgets"] });
    qc.invalidateQueries({ queryKey: ["budget-summary-full"] });
  };

  const createBudget = useMutation({
    mutationFn: async (input: BudgetInput) => {
      await createBudgetBudgetPost({ body: input, throwOnError: true });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Budget created");
    },
    onError: (e) =>
      toast.error(`Failed to create budget: ${e instanceof Error ? e.message : "Unknown error"}`),
  });

  const updateBudget = useMutation({
    mutationFn: async ({ id, ...input }: BudgetInput & { id: string }) => {
      await updateBudgetBudgetBudgetIdPatch({
        path: { budget_id: id },
        body: input,
        throwOnError: true,
      });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Budget updated");
    },
    onError: (e) =>
      toast.error(`Failed to update budget: ${e instanceof Error ? e.message : "Unknown error"}`),
  });

  const monthlyIncome = Number(income.data?.monthly_income ?? 0);

  return { budgets, latest, summary, monthlyIncome, createBudget, updateBudget };
}
