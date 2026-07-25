"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch";

export type FiComponent = { key: string; label: string; score: string; weight: string; detail: string };

export type FiScore = {
  overall_score: string;
  grade: string;
  monthly_income: string;
  monthly_expenses: string;
  monthly_surplus: string;
  savings_rate: string;
  annual_expenses: string;
  fi_number: string;
  net_worth: string;
  progress_to_fi: string;
  emergency_fund_months: string;
  debt_to_asset: string;
  projected_fi_date: string | null;
  currency: string;
  components: FiComponent[];
};

export type Goal = {
  id: string;
  name: string;
  kind: string;
  target_amount: string;
  current_amount: string;
  target_date: string | null;
  priority: number;
  progress: number;
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
  fi_number: string;
  fire_year_conservative: number | null;
  fire_year_base: number | null;
  fire_year_growth: number | null;
  current_portfolio: string;
  scenario_access: ScenarioAccess;
};

export type SurplusBreakdown = {
  income_by_source: Record<string, string>;
  expense_by_category: Record<string, string>;
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
