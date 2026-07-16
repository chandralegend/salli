import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch";

/** Mirrors clients/web/src/hooks/useReports.ts */

export type BalanceSheetLine = { account_id: string; code: string; name: string; balance: string };

export type BalanceSheet = {
  assets: BalanceSheetLine[];
  liabilities: BalanceSheetLine[];
  equity: BalanceSheetLine[];
  total_assets: string;
  total_liabilities: string;
  total_equity: string;
  net_worth: string;
};

export type NetWorthTrendPoint = { date: string | null; net_worth: string };

export type NetWorthStatement = {
  current_net_worth: string | null;
  as_of: string | null;
  trend: NetWorthTrendPoint[];
};

export type Goal = {
  id: string;
  name: string;
  kind: string;
  target_amount: string;
  current_amount: string;
  target_date: string | null;
  progress: number;
};

export type GoalProgressReport = {
  goals: Goal[];
  completed_count: number;
  in_progress_count: number;
};

export function useBalanceSheet() {
  return useQuery({
    queryKey: ["reports", "balance-sheet"],
    queryFn: () => apiFetch<BalanceSheet>("GET", "/reports/balance-sheet"),
    staleTime: 30_000,
  });
}

export function useNetWorthStatement() {
  return useQuery({
    queryKey: ["reports", "net-worth"],
    queryFn: () => apiFetch<NetWorthStatement>("GET", "/reports/net-worth"),
    staleTime: 30_000,
  });
}

export function useGoalProgressReport() {
  return useQuery({
    queryKey: ["reports", "goal-progress"],
    queryFn: () => apiFetch<GoalProgressReport>("GET", "/reports/goal-progress"),
    staleTime: 30_000,
  });
}
