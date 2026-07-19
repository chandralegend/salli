import { useQuery } from "@tanstack/react-query";

import {
  getBudgetSummaryBudgetBudgetIdSummaryGet,
  getLatestTaxLatestGet,
  getPayoffPlanDebtPayoffPlanGet,
  getProfileOnboardingProfileGet,
  getSummaryPortfolioSummaryGet,
  listBudgetsBudgetGet,
  listRemindersRemindersGet,
} from "@/lib/api/sdk.gen";
import type { BudgetSummary, TaxComputation } from "./useDashboard";

export type Profile = { display_name: string | null; email: string | null; id: string };
export type PortfolioSummary = { total_value: string; total_gain_pct: string };
export type DebtPayoffPlan = { months_to_payoff: number | null };
export type Reminder = { id: string; status: string };

export function useMore() {
  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data } = await getProfileOnboardingProfileGet({ throwOnError: true });
      return data as unknown as Profile;
    },
  });

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

  return {
    profile: profile.data,
    budgetSummary: budgetSummary.data,
    portfolio: portfolio.data,
    debtPlan: debtPlan.data,
    tax: tax.data,
    overdueCount,
  };
}
