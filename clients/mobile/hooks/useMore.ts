import { useQuery } from "@tanstack/react-query";

import {
  getBudgetSummaryBudgetBudgetIdSummaryGet,
  getLatestTaxLatestGet,
  getPayoffPlanDebtPayoffPlanGet,
  getProfileOnboardingProfileGet,
  getSummaryPortfolioSummaryGet,
  listBudgetsBudgetGet,
  listDebtsDebtGet,
  listRemindersRemindersGet,
} from "@/lib/api/sdk.gen";
import type { Debt } from "./useDebt";
import type { BudgetSummary, TaxComputation } from "./useDashboard";

export type Profile = { display_name: string | null; email: string | null; id: string };
export type PortfolioSummary = { total_value: string; total_gain_pct: string };
export type DebtPayoffPlan = { months_to_payoff: number | null };
export type Reminder = { id: string; status: string };

/**
 * The signed-in user's profile on its own.
 *
 * Split out of `useMore` so a header button can read the name without firing
 * the six other queries that hook bundles (budgets, budget summary, portfolio,
 * debts, payoff plan, tax, reminders). Same query key, so the two share one
 * cache entry and one request.
 */
export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data } = await getProfileOnboardingProfileGet({ throwOnError: true });
      return data as unknown as Profile;
    },
  });
}

/** First letter of the display name, falling back to the email. Trimmed,
 *  because a display name of " " would otherwise render a blank avatar. */
export function profileInitial(profile: Profile | undefined): string {
  const source = profile?.display_name?.trim() || profile?.email?.trim() || "";
  return source.charAt(0).toUpperCase() || "?";
}

export function useMore() {
  const profile = useProfile();

  const budgets = useQuery({
    queryKey: ["budgets"],
    queryFn: async () => {
      const { data } = await listBudgetsBudgetGet({ throwOnError: true });
      return (data as unknown as { budgets: { id: string }[] }).budgets;
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

  const portfolio = useQuery({
    queryKey: ["portfolio-summary"],
    queryFn: async () => {
      const { data } = await getSummaryPortfolioSummaryGet({ throwOnError: true });
      return data as unknown as PortfolioSummary;
    },
  });

  const debtPlan = useQuery({
    queryKey: ["debt-payoff-plan"],
    queryFn: async () => {
      const { data } = await getPayoffPlanDebtPayoffPlanGet({ throwOnError: true });
      return data as unknown as DebtPayoffPlan;
    },
  });

  const debts = useQuery({
    queryKey: ["debts"],
    queryFn: async () => {
      const { data } = await listDebtsDebtGet({ throwOnError: true });
      return (data as unknown as { debts: Debt[] }).debts;
    },
  });

  const tax = useQuery({
    queryKey: ["tax-latest"],
    queryFn: async () => {
      const { data } = await getLatestTaxLatestGet({ query: { year: "2025/26" }, throwOnError: true });
      return (data as unknown as { result: TaxComputation | null }).result;
    },
  });

  const reminders = useQuery({
    queryKey: ["reminders"],
    queryFn: async () => {
      const { data } = await listRemindersRemindersGet({ throwOnError: true });
      return (data as unknown as { reminders: Reminder[] }).reminders;
    },
  });

  const overdueCount = (reminders.data ?? []).filter((r) => r.status === "overdue").length;

  const activeDebts = (debts.data ?? []).filter((d) => d.is_active);
  const totalDebt = activeDebts.reduce((sum, d) => sum + Number(d.principal), 0);

  return {
    profile: profile.data,
    budgetSummary: budgetSummary.data,
    portfolio: portfolio.data,
    debtPlan: debtPlan.data,
    hasDebts: activeDebts.length > 0,
    totalDebt,
    tax: tax.data,
    overdueCount,
  };
}
