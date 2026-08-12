import { useMutation, useQuery } from "@tanstack/react-query";

import {
  billingPortalBillingPortalPost,
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

// Mobile never initiates checkout — the app ships free, and entitlements are
// granted server-side (e.g. via the web app's Paddle checkout). This hook
// only opens the portal so an already-paying user can manage/cancel.
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
