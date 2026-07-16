import { apiFetch } from "@/lib/api-fetch";

/** Mirrors clients/web/src/hooks/useOnboardingWizard.ts */

export type ProfileIdentity = {
  display_name?: string;
  date_of_birth?: string;
  dependents_count?: number;
  employment_status?: string;
  employment_type?: string;
  residency_status?: string;
  employer?: string;
  ird_number?: string;
};

export type OpeningBalanceItem = { code: string; name: string; type: "asset" | "liability"; amount: number };

export type IncomeItem = {
  code: string;
  name: string;
  amount: number;
  deposit_account_code?: string;
  deposit_account_name?: string;
};

export type RiskQuestionnaire = {
  time_horizon_years: number;
  drawdown_reaction: string;
  income_stability: string;
  investment_experience: string;
  dependents_count: number;
};

export type RiskResult = { score: number; category: string; breakdown: Record<string, number> };

export type OnboardingGoalItem = {
  name: string;
  kind: string;
  target_amount: number;
  current_amount: number;
  target_date?: string | null;
  priority: number;
};

export async function updateProfileIdentity(data: ProfileIdentity) {
  return apiFetch("PATCH", "/onboarding/profile", data);
}

export async function declareBalanceSheet(balances: OpeningBalanceItem[]) {
  return apiFetch<{ entries_created: string[] }>("POST", "/onboarding/balance-sheet", { balances });
}

export async function declareIncome(incomes: IncomeItem[]) {
  return apiFetch<{ entries_created: string[] }>("POST", "/onboarding/income", { incomes });
}

export async function submitRiskQuestionnaire(data: RiskQuestionnaire) {
  return apiFetch<RiskResult>("POST", "/onboarding/risk-questionnaire", data);
}

export async function declareGoals(goals: OnboardingGoalItem[]) {
  return apiFetch<{ goal_ids: string[] }>("POST", "/onboarding/goals", { goals });
}
