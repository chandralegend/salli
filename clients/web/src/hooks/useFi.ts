"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch";

export type FiComponent = { key: string; label: string; score: string; weight: string; detail: string };

/**
 * UNITS — the API mixes two scales on this one object, so read carefully:
 *   • `overall_score` and `components[].score` are 0..100.
 *   • every other ratio (`savings_rate`, `progress_to_fi`, `debt_to_asset`,
 *     `swr`) is a 0..1 FRACTION.
 * Render fractions with `formatPct()` / `pctValue()` from `@/lib/format` — never
 * with a bare `%` suffix, which is what once displayed a 50% savings rate as
 * "0.5%".
 */
export type FiScore = {
  overall_score: string; // 0..100
  grade: string;
  monthly_income: string;
  monthly_expenses: string;
  monthly_surplus: string;
  savings_rate: string; // 0..1
  swr: string; // 0..1 — the rate fi_number was derived from
  annual_expenses: string;
  fi_number: string;
  net_worth: string; // all assets − liabilities
  fi_asset_base: string; // investable assets net of debt — what progress measures
  progress_to_fi: string; // 0..1, unclamped (can exceed 1)
  emergency_fund_months: string;
  debt_to_asset: string; // 0..1
  projected_fi_date: string | null;
  currency: string;
  components: FiComponent[];
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
  emergency_months_before: string; // months of expenses covered
  emergency_months_after_cash: string; // can be negative — do not clamp
  emergency_fund_target_months: number;
  options: PurchaseOption[];
  cheapest_option_key: string | null;
  data_as_of: string | null; // ISO date of the newest ledger entry
  is_stale: boolean; // true → show no verdict, ask for an update first
  stale_after_days: number;
  real_return_used: string; // 0..1
  swr: string; // 0..1
};

export type Goal = {
  id: string;
  name: string;
  kind: string;
  target_amount: string;
  /** Money actually behind this goal — the live balance of the accounts
   *  earmarked to it, apportioned by priority. Not a number anyone types. */
  current_amount: string;
  /** What the user earmarked. A gap to `current_amount` means those accounts
   *  do not currently hold what has been claimed against them. */
  allocated_amount: string;
  shortfall: string;
  target_date: string | null;
  /** 1 high … 3 low. Decides who stays funded when one account backs several
   *  goals and cannot cover them all. */
  priority: number;
  progress: number;
};

export type GoalAllocation = {
  goal_id: string;
  account_id: string;
  allocated_amount: string;
};

export type Recommendation = {
  id: string;
  title: string;
  category: string;
  priority: number;
  locked: boolean;
  // Absent on locked stubs — the server drops these fields entirely, it
  // doesn't just null them.
  rationale?: string;
  bucket_key?: string | null;
  action_type?: "none" | "reminder";
  action_params?: { label?: string; due_in_days?: number | null };
  status?: "pending" | "applied" | "dismissed";
};

export type AdvisoryReport = {
  id: string;
  trigger: string;
  summary: string;
  fire_tier_assessment?: string;
  recommendations: Recommendation[];
  recommendations_locked_count: number;
  created_at: string;
};

// ── Score ─────────────────────────────────────────────────────────────────────

export function useFiScore() {
  return useQuery({
    queryKey: ["fi", "score"],
    queryFn: () => apiFetch<FiScore>("GET", "/fi/score"),
    staleTime: 60_000,
  });
}

export function useRecomputeScore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<FiScore>("POST", "/fi/score/recompute"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fi", "score"] }),
  });
}

// ── Goals ─────────────────────────────────────────────────────────────────────

export function useGoals() {
  return useQuery({
    queryKey: ["fi", "goals"],
    queryFn: () => apiFetch<{ goals: Goal[] }>("GET", "/fi/goals").then((d) => d.goals),
    staleTime: 30_000,
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch("POST", "/fi/goals", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fi"] }),
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch("PATCH", `/fi/goals/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fi"] }),
  });
}

/** Which accounts are earmarked for one goal, and how much of each. */
export function useGoalAllocations(goalId: string | null) {
  return useQuery({
    queryKey: ["fi", "allocations", goalId],
    enabled: !!goalId,
    queryFn: () =>
      apiFetch<{ allocations: GoalAllocation[] }>("GET", `/fi/goals/${goalId}/allocations`).then(
        (r) => r.allocations,
      ),
  });
}

export function useSetGoalAllocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      goalId,
      account_id,
      allocated_amount,
    }: {
      goalId: string;
      account_id: string;
      allocated_amount: number;
    }) => apiFetch("PUT", `/fi/goals/${goalId}/allocations`, { account_id, allocated_amount }),
    // Earmarking changes the goals component of the Freedom Score too.
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fi"] }),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch("DELETE", `/fi/goals/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fi"] }),
  });
}

// ── FIRE Strategy ─────────────────────────────────────────────────────────────

export type AllocationBucket = {
  key: string;
  name: string;
  target_pct: number;
  description: string;
  color: string;
};

export type FireStrategy = {
  version: number;
  fire_style: "lean" | "standard" | "fat" | "coast";
  swr: number;
  return_conservative: number;
  return_base: number;
  return_growth: number;
  target_monthly_expenses: number | null;
  target_age: number | null;
  buckets: AllocationBucket[];
  // Null + a preview/count when rationale_locked is true (Free tier).
  ai_rationale: string | null;
  rationale_preview?: string;
  rationale_locked: boolean;
  theories_applied: string[] | null;
  theories_applied_count?: number;
  created_at: string;
  is_initial: boolean;
};

export type ProjectionPoint = {
  year: number;
  conservative: string | null;
  base: string;
  growth: string | null;
};

export type ScenarioAccess = {
  visible: string[];
  locked: string[];
  requires_plan: string | null;
};

export type ProjectionsData = {
  points: ProjectionPoint[];
  fi_number: string; // identical to FiScore.fi_number — one formula, one figure
  swr: string; // 0..1
  /** Years from now (not calendar years); null = unreachable within the horizon. */
  fire_year_conservative: number | null;
  fire_year_base: number | null;
  fire_year_growth: number | null;
  current_portfolio: string; // the FI asset base the projection starts from
  /** REAL (inflation-adjusted) rates actually projected, as 0..1 fractions. */
  real_returns?: { conservative: string; base: string; growth: string };
  expected_inflation?: string; // 0..1
  scenario_access: ScenarioAccess;
};

export type SurplusBreakdown = {
  income_by_source: Record<string, string>;
  /** Category tag — or the account name where spending is untagged. */
  expense_by_category: Record<string, string>;
  /** Need tag slug → monthly average. Empty until spending carries `need`
   *  tags, which means "not classified yet" rather than "spent nothing". */
  expense_by_need: Record<string, string>;
  gross_monthly_income: string;
  gross_monthly_expenses: string;
  monthly_surplus: string;
  savings_rate: string;
};

export function useFireStrategy() {
  return useQuery({
    queryKey: ["fi", "strategy"],
    queryFn: () =>
      apiFetch<FireStrategy>("GET", "/fi/strategy").catch((e) => {
        if (e?.message?.includes("404") || String(e).includes("404")) return null;
        throw e;
      }),
    staleTime: 60_000,
    retry: false,
  });
}

export function useFireStrategyHistory() {
  return useQuery({
    queryKey: ["fi", "strategy", "history"],
    queryFn: () =>
      apiFetch<{ history: unknown[] }>("GET", "/fi/strategy/history").then((d) => d.history),
    staleTime: 60_000,
  });
}

export function useFireProjections() {
  return useQuery({
    queryKey: ["fi", "projections"],
    queryFn: () => apiFetch<ProjectionsData>("GET", "/fi/projections"),
    staleTime: 120_000,
  });
}

export function useFireSurplus() {
  return useQuery({
    queryKey: ["fi", "surplus"],
    queryFn: () => apiFetch<SurplusBreakdown>("GET", "/fi/surplus"),
    staleTime: 120_000,
  });
}

// ── "Can I afford this?" ──────────────────────────────────────────────────────

export type PurchaseQuery = {
  /** Decimal STRING, never a number — a float in the money path is a bug. */
  amount: string;
  term_months?: number | null;
  /** Fraction, not a percentage: 0.18 for 18%. */
  annual_interest_rate?: string;
};

export function useSimulatePurchase() {
  return useMutation({
    mutationFn: (body: PurchaseQuery) =>
      apiFetch<PurchaseImpact>("POST", "/fi/simulate-purchase", body),
  });
}

// ── Advisor ───────────────────────────────────────────────────────────────────

export function useLatestAdvisory() {
  return useQuery({
    queryKey: ["fi", "advisory"],
    queryFn: () => apiFetch<AdvisoryReport>("GET", "/advisor/reports/latest"),
    staleTime: 30_000,
  });
}

export function useRunAdvisor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<AdvisoryReport>("POST", "/advisor/run"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fi", "advisory"] });
      qc.invalidateQueries({ queryKey: ["billing"] });
    },
  });
}

export function useApplyRecommendation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, recId }: { reportId: string; recId: string }) =>
      apiFetch("POST", `/advisor/reports/${reportId}/recommendations/${recId}/apply`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fi", "advisory"] });
      qc.invalidateQueries({ queryKey: ["reminders"] });
    },
  });
}

export function useDismissRecommendation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, recId }: { reportId: string; recId: string }) =>
      apiFetch("POST", `/advisor/reports/${reportId}/recommendations/${recId}/dismiss`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fi", "advisory"] }),
  });
}
