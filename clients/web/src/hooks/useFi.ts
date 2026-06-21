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
  rationale: string;
  category: string;
  priority: number;
  action_type: "none" | "reminder";
  action_params: { label?: string; due_in_days?: number | null };
  status: "pending" | "applied" | "dismissed";
};

export type AdvisoryReport = {
  id: string;
  trigger: string;
  summary: string;
  recommendations: Recommendation[];
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
