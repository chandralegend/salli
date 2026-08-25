import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createGoalFiGoalsPost,
  deleteGoalFiGoalsGoalIdDelete,
  listGoalAllocationsFiGoalsGoalIdAllocationsGet,
  setGoalAllocationFiGoalsGoalIdAllocationsPut,
  updateGoalFiGoalsGoalIdPatch,
  generateStrategyFiStrategyGeneratePost,
  getProjectionsFiProjectionsGet,
  getScoreFiScoreGet,
  getStrategyFiStrategyGet,
  getSurplusBreakdownFiSurplusGet,
  latestReportAdvisorReportsLatestGet,
  listGoalsFiGoalsGet,
  runAdvisorAdvisorRunPost,
  simulatePurchaseFiSimulatePurchasePost,
} from "@/lib/api/sdk.gen";
import { isQuotaLikeError, QuotaError } from "@/lib/quota";
import type { FiScore } from "./useDashboard";

/** Locked (Free-tier) scenarios arrive as `null` — never plot them as zero. */
export type FiProjectionPoint = { year: number; conservative: string | null; base: string; growth: string | null };
export type ScenarioAccess = { visible: string[]; locked: string[]; requires_plan: string | null };
export type FiProjections = {
  points: FiProjectionPoint[];
  fi_number: string;
  fire_year_conservative: number | string | null;
  fire_year_base: number | string;
  fire_year_growth: number | string | null;
  current_portfolio: string;
  scenario_access?: ScenarioAccess;
};

export type FiSurplus = {
  gross_monthly_income: string;
  gross_monthly_expenses: string;
  monthly_surplus: string;
  savings_rate: string;
  /** Income source (account name) → monthly average. */
  income_by_source: Record<string, string>;
  /** Category tag — or the account name where spending is untagged → monthly
   *  average. Server returns the top few by size. */
  expense_by_category: Record<string, string>;
  /** Need tag slug → monthly average. Empty until spending carries `need`
   *  tags, which means "not classified yet" rather than "spent nothing". */
  expense_by_need: Record<string, string>;
};

/**
 * One way of funding a purchase, costed in months of freedom.
 *
 * `months_delay: null` means the FI date is not reachable on current figures —
 * NOT that the purchase is free. Render it as "can't tell yet", never as 0.
 */
export type PurchaseOption = {
  key: "cash" | "installments";
  label: string;
  total_cost: string;
  interest_cost: string;
  monthly_payment: string | null;
  term_months: number | null;
  months_to_fi: number | null;
  months_delay: number | null;
  exceeds_monthly_surplus: boolean;
};

export type PurchaseImpact = {
  amount: string;
  currency: string;
  fi_number: string;
  fi_asset_base_before: string;
  monthly_surplus: string;
  baseline_months_to_fi: number | null;
  payable_from_liquid: boolean;
  emergency_months_before: string;
  emergency_months_after_cash: string;
  emergency_fund_target_months: number;
  options: PurchaseOption[];
  cheapest_option_key: string | null;
  data_as_of: string | null;
  is_stale: boolean;
  stale_after_days: number;
  real_return_used: string;
  swr: string;
};

export type PurchaseQuery = {
  /** Decimal STRING, never a number — a float in the money path is a bug. */
  amount: string;
  term_months?: number | null;
  /** Fraction, not a percentage: 0.18 for 18%. */
  annual_interest_rate?: string;
};

export type FiStrategy = {
  version: number;
  fire_style: string;
  swr: string;
  return_conservative: string;
  return_base: string;
  return_growth: string;
  target_monthly_expenses: string;
  target_age: number | null;
  buckets: { name: string; target_pct: string; description: string }[];
  // Null + a preview/count when rationale_locked is true (Free tier).
  ai_rationale?: string | null;
  rationale_preview?: string;
  rationale_locked?: boolean;
  theories_applied?: string[] | null;
  theories_applied_count?: number;
};

export type FiGoal = {
  id: string;
  name: string;
  kind: string;
  target_amount: string;
  /** Money actually behind this goal — the live balance of the accounts
   *  earmarked to it, apportioned by priority. Not a number anyone types. */
  current_amount: string;
  /** What the user earmarked. A gap to `current_amount` means the accounts
   *  backing this goal do not hold what has been claimed against them. */
  allocated_amount: string;
  shortfall: string;
  progress: number;
  target_date: string | null;
  /** 1 high … 3 low. Decides who stays funded when one account backs several
   *  goals and cannot cover them all. */
  priority: number;
};

export type GoalAllocation = {
  goal_id: string;
  account_id: string;
  allocated_amount: string;
};

export type AdvisorRecommendation = {
  id: string;
  title: string;
  category: string;
  priority: number;
  locked: boolean;
  // Absent on locked stubs — the server drops these fields entirely rather
  // than nulling them.
  status?: string;
  rationale?: string;
};

export type AdvisorReport = {
  id: string;
  summary: string;
  fire_tier_assessment: string;
  recommendations: AdvisorRecommendation[];
  recommendations_locked_count: number;
};

export function useFiScore() {
  return useQuery({
    queryKey: ["fi-score"],
    queryFn: async () => {
      const { data } = await getScoreFiScoreGet({ throwOnError: true });
      return data as unknown as FiScore;
    },
  });
}

export function useFiProjections() {
  return useQuery({
    queryKey: ["fi-projections"],
    queryFn: async () => {
      const { data } = await getProjectionsFiProjectionsGet({ throwOnError: true });
      return data as unknown as FiProjections;
    },
  });
}

export function useFiSurplus() {
  return useQuery({
    queryKey: ["fi-surplus"],
    queryFn: async () => {
      const { data } = await getSurplusBreakdownFiSurplusGet({ throwOnError: true });
      return data as unknown as FiSurplus;
    },
  });
}

/** Deliberately NOT metered — pure deterministic engine math, no quota check. */
export function useSimulatePurchase() {
  return useMutation({
    mutationFn: async (body: PurchaseQuery) => {
      const { data } = await simulatePurchaseFiSimulatePurchasePost({ body, throwOnError: true });
      return data as unknown as PurchaseImpact;
    },
  });
}

export function useFiStrategy() {
  return useQuery({
    queryKey: ["fi-strategy"],
    queryFn: async () => {
      const { data } = await getStrategyFiStrategyGet({ throwOnError: true });
      return data as unknown as FiStrategy | null;
    },
  });
}

export function useGenerateStrategy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await generateStrategyFiStrategyGeneratePost({ throwOnError: true });
      return data as unknown as FiStrategy;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fi-strategy"] }),
  });
}

export function useFiGoals() {
  return useQuery({
    queryKey: ["fi-goals"],
    queryFn: async () => {
      const { data } = await listGoalsFiGoalsGet({ throwOnError: true });
      return (data as unknown as { goals: FiGoal[] }).goals;
    },
  });
}

export function useFiGoalMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["fi-goals"] });

  const createGoal = useMutation({
    mutationFn: async (input: { name: string; target_amount: number; target_date?: string }) => {
      await createGoalFiGoalsPost({
        body: { name: input.name, kind: "custom", target_amount: input.target_amount, target_date: input.target_date },
        throwOnError: true,
      });
    },
    onSuccess: invalidate,
  });

  // The backend has had PATCH /fi/goals/{id} all along; nothing ever called it,
  // so changing a goal meant deleting and recreating it and losing its history.
  const updateGoal = useMutation({
    mutationFn: async (input: {
      id: string;
      name?: string;
      target_amount?: number;
      target_date?: string | null;
      priority?: number;
    }) => {
      const { id, ...body } = input;
      await updateGoalFiGoalsGoalIdPatch({ path: { goal_id: id }, body, throwOnError: true });
    },
    onSuccess: invalidate,
  });

  const deleteGoal = useMutation({
    mutationFn: async (goalId: string) => {
      await deleteGoalFiGoalsGoalIdDelete({ path: { goal_id: goalId }, throwOnError: true });
    },
    onSuccess: invalidate,
  });

  const setAllocation = useMutation({
    mutationFn: async (input: {
      goalId: string;
      account_id: string;
      allocated_amount: number;
    }) => {
      await setGoalAllocationFiGoalsGoalIdAllocationsPut({
        path: { goal_id: input.goalId },
        body: { account_id: input.account_id, allocated_amount: input.allocated_amount },
        throwOnError: true,
      });
    },
    onSuccess: () => {
      invalidate();
      // Earmarking changes the goals component of the Freedom Score.
      qc.invalidateQueries({ queryKey: ["fi-score"] });
      qc.invalidateQueries({ queryKey: ["fi-allocations"] });
    },
  });

  return { createGoal, updateGoal, deleteGoal, setAllocation };
}

/** Which accounts are earmarked for one goal, and how much of each. */
export function useGoalAllocations(goalId: string | null) {
  return useQuery({
    queryKey: ["fi-allocations", goalId],
    enabled: !!goalId,
    queryFn: async () => {
      const { data } = await listGoalAllocationsFiGoalsGoalIdAllocationsGet({
        path: { goal_id: goalId as string },
        throwOnError: true,
      });
      return (data as unknown as { allocations: GoalAllocation[] }).allocations;
    },
  });
}

export function useLatestAdvisorReport() {
  return useQuery({
    queryKey: ["advisor-report-latest"],
    queryFn: async () => {
      const { data } = await latestReportAdvisorReportsLatestGet({ throwOnError: true });
      // Returns {} (not null) when no report exists yet.
      const report = data as unknown as AdvisorReport;
      return report && "id" in report ? report : null;
    },
  });
}

export function useRunAdvisor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      try {
        const { data } = await runAdvisorAdvisorRunPost({ throwOnError: true });
        return data as unknown as AdvisorReport;
      } catch (err) {
        // Monthly advisor-run quota spent → normalize to a typed error so the
        // screen shows the QuotaBanner + Upgrade CTA instead of a generic failure.
        if (isQuotaLikeError(err)) throw new QuotaError("advisor_runs");
        throw err;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["advisor-report-latest"] }),
  });
}
