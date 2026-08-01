import { useMutation, useQuery } from "@tanstack/react-query";

import {
  billingPortalBillingPortalPost,
  changePlanBillingSubscriptionChangePost,
  createCheckoutBillingCheckoutPost,
  previewPlanChangeBillingSubscriptionPreviewPost,
  deleteMyAccountOnboardingAccountDelete,
  exportMyDataOnboardingExportGet,
  getSubscriptionBillingSubscriptionGet,
} from "@/lib/api/sdk.gen";

export type Usage = { metric: string; used: number; limit: number; remaining: number; resets_at: string };
export type Entitlements = {
  plan: string;
  plan_name: string;
  /** What the user is actually charged on. Null on free plans, and on paid rows
   *  bought before the cycle was recorded — render nothing rather than a guess. */
  billing_cycle: BillingCycle | null;
  /** How a plan change must be routed. "in_place" patches the live subscription via
   *  the API (no browser needed), "checkout" needs the web Paddle overlay, "blocked"
   *  means the subscription isn't in a changeable state. Hand-written because
   *  /billing/subscription has no response_model, so codegen can't see these. */
  change_mode: ChangeMode;
  change_blocked_reason: string | null;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  usage: Usage[];
};

export function useEntitlements() {
  return useQuery({
    queryKey: ["entitlements"],
    queryFn: async () => {
      const { data } = await getSubscriptionBillingSubscriptionGet({ throwOnError: true });
      return data as unknown as Entitlements;
    },
  });
}

export function useExportData() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await exportMyDataOnboardingExportGet({ throwOnError: true });
      return data as unknown;
    },
  });
}

// The /billing/checkout endpoint returns Paddle.js overlay data (price_id,
// custom_data, …), not a hosted URL — the Paddle overlay only runs on web. On
// mobile we therefore call the endpoint (which also provisions the Paddle
// customer) and then open the web checkout page in the system browser. If a
// future backend ever returns a `url`, we honour it directly.
export type CheckoutData = { url?: string } & Record<string, unknown>;

export type BillingCycle = "month" | "year";

export type ChangeMode = "in_place" | "checkout" | "blocked";

/** What a plan change would cost. Amounts are integer minor units in `currency` —
 *  format with formatMinor, never divide by 100 (JPY and KRW have no minor unit). */
export type PlanChangePreview = {
  plan: string;
  cycle: BillingCycle;
  currency: string;
  immediate_charge_minor: number;
  credit_applied_minor: number;
  /** "credit" means the money becomes Paddle account balance, not a card refund. */
  result: "charge" | "credit" | "none";
  result_amount_minor: number;
  recurring_amount_minor: number;
  recurring_currency: string;
  next_billed_at: string | null;
};

export function usePlanChangePreview() {
  return useMutation({
    mutationFn: async ({ plan, cycle }: { plan: string; cycle: BillingCycle }) => {
      const { data } = await previewPlanChangeBillingSubscriptionPreviewPost({
        // The endpoint's plan is a Literal in the schema, so codegen narrowed it to
        // "plus" | "pro". Plan keys reach us as strings from /billing/plans, and the
        // server re-validates, so narrow here rather than pushing the union to callers.
        body: { plan: plan as "plus" | "pro", cycle },
        throwOnError: true,
      });
      return data as unknown as PlanChangePreview;
    },
  });
}

export function useChangePlan() {
  return useMutation({
    mutationFn: async ({ plan, cycle }: { plan: string; cycle: BillingCycle }) => {
      const { data } = await changePlanBillingSubscriptionChangePost({
        // The endpoint's plan is a Literal in the schema, so codegen narrowed it to
        // "plus" | "pro". Plan keys reach us as strings from /billing/plans, and the
        // server re-validates, so narrow here rather than pushing the union to callers.
        body: { plan: plan as "plus" | "pro", cycle },
        throwOnError: true,
      });
      return data as unknown as Entitlements;
    },
  });
}

export function useCreateCheckout() {
  return useMutation({
    mutationFn: async ({ plan, cycle = "month" }: { plan: string; cycle?: BillingCycle }) => {
      const { data } = await createCheckoutBillingCheckoutPost({
        // The endpoint's plan is a Literal in the schema, so codegen narrowed it to
        // "plus" | "pro". Plan keys reach us as strings from /billing/plans, and the
        // server re-validates, so narrow here rather than pushing the union to callers.
        body: { plan: plan as "plus" | "pro", cycle },
        throwOnError: true,
      });
      return data as unknown as CheckoutData;
    },
  });
}

export function useBillingPortal() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await billingPortalBillingPortalPost({ throwOnError: true });
      return (data as unknown as { url: string }).url;
    },
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: async (confirmEmail: string) => {
      await deleteMyAccountOnboardingAccountDelete({ body: { confirm_email: confirmEmail }, throwOnError: true });
    },
  });
}
