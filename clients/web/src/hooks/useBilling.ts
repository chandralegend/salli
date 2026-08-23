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
  paid: boolean;
  /** What the user is actually charged on. Null on free plans, and on paid rows
   *  bought before the cycle was recorded — render nothing rather than a guess. */
  billing_cycle: BillingCycle | null;
  /** How a plan change must be routed. "in_place" patches the live subscription,
   *  "checkout" opens Paddle's overlay for a first purchase, "blocked" means the
   *  subscription isn't in a changeable state. Server-owned — never re-derive it
   *  from `status`, which reports "free" for a past_due subscriber. */
  change_mode: ChangeMode;
  change_blocked_reason: string | null;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  usage: UsageMetric[];
  /** True when the user supplied their own LLM key, so metering is lifted. The
   *  `limit` values in `usage` then reflect a safety ceiling rather than an
   *  allowance, and shouldn't be presented as one. Hand-typed because
   *  /billing/subscription returns an untyped dict, so codegen can't see it. */
  byok: boolean;
};

export type Plan = {
  key: string;
  name: string;
  description: string;
  monthly_price_usd: number;
  yearly_price_usd: number;
  limits: Record<string, number>;
  features: string[];
  paid: boolean;
};

export type BillingCycle = "month" | "year";

export type ChangeMode = "in_place" | "checkout" | "blocked";

/** What a plan change would cost, straight from Paddle. All amounts are integer
 *  minor units in `currency` — format with formatMinor, never divide by 100. */
export type PlanChangePreview = {
  plan: string;
  cycle: BillingCycle;
  currency: string;
  /** Charged to the card today, after any credit. Zero when the net is a credit. */
  immediate_charge_minor: number;
  credit_applied_minor: number;
  /** "credit" means the money becomes Paddle account balance, NOT a card refund —
   *  the UI has to say so before the user consents. */
  result: "charge" | "credit" | "none";
  result_amount_minor: number;
  /** The steady-state price from the next cycle onward. */
  recurring_amount_minor: number;
  recurring_currency: string;
  next_billed_at: string | null;
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
    mutationFn: ({ plan, cycle = "month" }: { plan: string; cycle?: BillingCycle }) =>
      apiFetch<Record<string, unknown>>("POST", "/billing/checkout", { plan, cycle }),
  });
}

export function usePlanChangePreview() {
  return useMutation({
    mutationFn: ({ plan, cycle }: { plan: string; cycle: BillingCycle }) =>
      apiFetch<PlanChangePreview>("POST", "/billing/subscription/preview", { plan, cycle }),
  });
}

export function useChangePlan() {
  return useMutation({
    mutationFn: ({ plan, cycle }: { plan: string; cycle: BillingCycle }) =>
      apiFetch<Subscription>("POST", "/billing/subscription/change", { plan, cycle }),
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
