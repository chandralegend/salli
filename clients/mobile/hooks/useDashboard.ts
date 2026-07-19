import { useQuery } from "@tanstack/react-query";

import {
  getBudgetSummaryBudgetBudgetIdSummaryGet,
  getLatestTaxLatestGet,
  getNetWorthStatementReportsNetWorthGet,
  getScoreFiScoreGet,
  incomeStatementLedgerIncomeStatementGet,
  listAccountsAccountsGet,
  listBudgetsBudgetGet,
  listEntriesEntriesGet,
  trialBalanceLedgerTrialBalanceGet,
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
  external_ref?: string | null;
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
  debt_to_asset: string;
  emergency_fund_months: string;
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

  // Per-account balances for the Accounts card (the list endpoint omits balances).
  const trialBalance = useQuery({
    queryKey: ["trial-balance"],
    queryFn: async () => {
      const { data } = await trialBalanceLedgerTrialBalanceGet({ throwOnError: true });
      return (data as unknown as { balances: Record<string, string> }).balances;
    },
  });

  // Year-to-date income & expense totals for the two hero tiles.
  const incomeStatement = useQuery({
    queryKey: ["income-statement", "ytd"],
    queryFn: async () => {
      const now = new Date();
      const from = `${now.getFullYear()}-01-01`;
      const to = now.toISOString().slice(0, 10);
      const { data } = await incomeStatementLedgerIncomeStatementGet({
        query: { from_date: from, to_date: to },
        throwOnError: true,
      });
      return data as unknown as { income: Record<string, string>; expenses: Record<string, string> };
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

  const sumValues = (m?: Record<string, string>) =>
    m ? Object.values(m).reduce((s, v) => s + Number(v), 0) : null;

  return {
    isLoading: netWorth.isLoading || fiScore.isLoading || accounts.isLoading || entries.isLoading,
    netWorth: netWorth.data,
    fiScore: fiScore.data,
    tax: tax.data,
    accounts: accounts.data ?? [],
    entries: entries.data ?? [],
    budgetSummary: budgetSummary.data,
    balances: trialBalance.data ?? {},
    incomeYtd: sumValues(incomeStatement.data?.income),
    expensesYtd: sumValues(incomeStatement.data?.expenses),
  };
}
