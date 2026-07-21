"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch";

export type UsageMetric = {
  metric: "agent_messages" | "statement_uploads" | string;
  used: number;
  limit: number;
  remaining: number;
  resets_at: string;
};

export type Subscription = {
  plan: string;
  plan_name: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  usage: UsageMetric[];
};

export type Plan = {
  key: string;
  name: string;
  description: string;
  monthly_price_usd: number;
  limits: Record<string, number>;
  features: string[];
  paid: boolean;
};

export function useSubscription() {
  return useQuery({
    queryKey: ["billing", "subscription"],
    queryFn: () => apiFetch<Subscription>("GET", "/billing/subscription"),
    staleTime: 30_000,
  });
}

export function usePlans() {
  return useQuery({
    queryKey: ["billing", "plans"],
    queryFn: () => apiFetch<{ plans: Plan[] }>("GET", "/billing/plans").then((d) => d.plans),
    staleTime: 5 * 60_000,
  });
}

export function useCheckout() {
  return useMutation({
    mutationFn: (plan: string) =>
      apiFetch<Record<string, unknown>>("POST", "/billing/checkout", { plan }),
  });
}

export function useBillingPortal() {
  return useMutation({
    mutationFn: () => apiFetch<{ url: string }>("POST", "/billing/portal"),
  });
}

const METRIC_LABELS: Record<string, string> = {
  agent_messages: "AI agent messages",
  statement_uploads: "Statement uploads",
};

export function metricLabel(metric: string): string {
  return METRIC_LABELS[metric] ?? metric;
}
