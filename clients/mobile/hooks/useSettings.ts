import { useMutation, useQuery } from "@tanstack/react-query";

import {
  billingPortalBillingPortalPost,
  createCheckoutBillingCheckoutPost,
  deleteMyAccountOnboardingAccountDelete,
  exportMyDataOnboardingExportGet,
  getSubscriptionBillingSubscriptionGet,
} from "@/lib/api/sdk.gen";

export type Usage = { metric: string; used: number; limit: number; remaining: number; resets_at: string };
export type Entitlements = {
  plan: string;
  plan_name: string;
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

export function useCreateCheckout() {
  return useMutation({
    mutationFn: async ({ plan, cycle = "month" }: { plan: string; cycle?: BillingCycle }) => {
      const { data } = await createCheckoutBillingCheckoutPost({
        body: { plan, cycle },
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
