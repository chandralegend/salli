import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createGoalFiGoalsPost,
  deleteGoalFiGoalsGoalIdDelete,
  generateStrategyFiStrategyGeneratePost,
  getProjectionsFiProjectionsGet,
  getScoreFiScoreGet,
  getStrategyFiStrategyGet,
  latestReportAdvisorReportsLatestGet,
  listGoalsFiGoalsGet,
  runAdvisorAdvisorRunPost,
} from "@/lib/api/sdk.gen";
import type { FiScore } from "./useDashboard";

export type FiProjections = {
  fi_number: string;
  fire_year_conservative: number | string;
  fire_year_base: number | string;
  fire_year_growth: number | string;
  current_portfolio: string;
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
  ai_rationale?: string;
};

export type FiGoal = {
  id: string;
  name: string;
  kind: string;
  target_amount: string;
  current_amount: string;
  progress: number;
  target_date: string | null;
};

export type AdvisorRecommendation = {
  id: string;
  title: string;
  category: string;
  status: string;
  rationale: string;
  priority: number;
};

export type AdvisorReport = {
  id: string;
  summary: string;
  fire_tier_assessment: string;
  recommendations: AdvisorRecommendation[];
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

  const deleteGoal = useMutation({
    mutationFn: async (goalId: string) => {
      await deleteGoalFiGoalsGoalIdDelete({ path: { goal_id: goalId }, throwOnError: true });
    },
    onSuccess: invalidate,
  });

  return { createGoal, deleteGoal };
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
      const { data } = await runAdvisorAdvisorRunPost({ throwOnError: true });
      return data as unknown as AdvisorReport;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["advisor-report-latest"] }),
  });
}
