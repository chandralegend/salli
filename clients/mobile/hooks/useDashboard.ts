import { useQuery } from "@tanstack/react-query";

import {
  getBudgetSummaryBudgetBudgetIdSummaryGet,
  getLatestTaxLatestGet,
  getNetWorthStatementReportsNetWorthGet,
  getScoreFiScoreGet,
  listAccountsAccountsGet,
  listBudgetsBudgetGet,
  listEntriesEntriesGet,
} from "@/lib/api/sdk.gen";

export type Account = {
  id: string;
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "income" | "expense";
  currency: string;
  is_active: boolean;
};

export type JournalEntry = {
  id: string;
  entry_date: string;
  description: string;
  source: "manual" | "statement";
  reversed_by: string | null;
  // Direction enum: DEBIT = 1, CREDIT = -1 (not 2 — a common wrong assumption).
  postings: { account_id: string; direction: 1 | -1; amount: string; currency: string }[];
};

export type FiScore = {
  overall_score: string;
  grade: string;
  monthly_income: string;
  monthly_expenses: string;
  monthly_surplus: string;
  savings_rate: string;
  fi_number: string;
  net_worth: string;
  progress_to_fi: string;
  components: { label: string; score: string; weight: string; detail: string }[];
};

export type NetWorthStatement = {
  current_net_worth: string;
  as_of: string;
  trend: { date: string; net_worth: string }[];
};

export type TaxComputation = {
  tax_payable: string;
  gross_income: string;
  pack_year: string;
};

export type BudgetSummary = {
  period_start: string;
  period_end: string;
  total_limit: string;
  total_actual: string;
  total_variance: string;
};

/** Aggregates the Dashboard's tiles/lists from several endpoints — there's no
 * single /dashboard route on the backend, so the client composes it. */
export function useDashboard() {
  const netWorth = useQuery({
    queryKey: ["net-worth"],
    queryFn: async () => {
      const { data } = await getNetWorthStatementReportsNetWorthGet({ throwOnError: true });
      return data as unknown as NetWorthStatement;
    },
  });

  const fiScore = useQuery({
    queryKey: ["fi-score"],
    queryFn: async () => {
      const { data } = await getScoreFiScoreGet({ throwOnError: true });
      return data as unknown as FiScore | null;
    },
  });

  const tax = useQuery({
    queryKey: ["tax-latest"],
    queryFn: async () => {
      const { data } = await getLatestTaxLatestGet({ query: { year: "2025/26" }, throwOnError: true });
      // GET /tax/latest wraps in {result: ...|null}; POST /tax/compute returns the object directly.
      return (data as unknown as { result: TaxComputation | null }).result;
    },
  });

  const accounts = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const { data } = await listAccountsAccountsGet({ throwOnError: true });
      return data as unknown as Account[];
    },
  });

  const entries = useQuery({
    queryKey: ["entries", "recent"],
    queryFn: async () => {
      const { data } = await listEntriesEntriesGet({ throwOnError: true });
      return (data as unknown as JournalEntry[]).slice(0, 5);
    },
  });

  const budgets = useQuery({
    queryKey: ["budgets"],
    queryFn: async () => {
      const { data } = await listBudgetsBudgetGet({ throwOnError: true });
      return (data as unknown as { budgets: { id: string; period_start: string; period_end: string }[] }).budgets;
    },
  });

  const latestBudgetId = budgets.data?.[0]?.id;
  const budgetSummary = useQuery({
    queryKey: ["budget-summary", latestBudgetId],
    queryFn: async () => {
      const { data } = await getBudgetSummaryBudgetBudgetIdSummaryGet({
        path: { budget_id: latestBudgetId! },
        throwOnError: true,
      });
      return data as unknown as BudgetSummary;
    },
    enabled: Boolean(latestBudgetId),
  });

  return {
    isLoading: netWorth.isLoading || fiScore.isLoading || accounts.isLoading || entries.isLoading,
    netWorth: netWorth.data,
    fiScore: fiScore.data,
    tax: tax.data,
    accounts: accounts.data ?? [],
    entries: entries.data ?? [],
    budgetSummary: budgetSummary.data,
  };
}
