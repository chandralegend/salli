import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  billingPortalBillingPortalPost,
  deleteMyAccountOnboardingAccountDelete,
  exportMyDataOnboardingExportGet,
  getDailyBriefingAdvisorDailyBriefingGet,
  getSubscriptionBillingSubscriptionGet,
  setDailyBriefingAdvisorDailyBriefingPut,
} from "@/lib/api/sdk.gen";

export type Usage = { metric: string; used: number; limit: number; remaining: number; resets_at: string };
export type Entitlements = {
  plan: string;
  plan_name: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  usage: Usage[];
  /** True when the user supplied their own LLM key, so metering is lifted. The
   *  `limit` values in `usage` then reflect a safety ceiling rather than an
   *  allowance, and shouldn't be presented as one. Hand-typed because
   *  /billing/subscription returns an untyped dict, so codegen can't see it. */
  byok: boolean;
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

// ── Daily briefing (scheduled advisor run) ───────────────────────────────────
//
// Available on every plan but off by default: the run spends the user's own
// advisor_runs allowance, so it has to be something they asked for rather than
// something that quietly drains their month.

export function useDailyBriefing() {
  return useQuery({
    queryKey: ["daily-briefing"],
    queryFn: async () => {
      const { data } = await getDailyBriefingAdvisorDailyBriefingGet({ throwOnError: true });
      return (data as unknown as { enabled: boolean }).enabled;
    },
  });
}

export function useSetDailyBriefing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      await setDailyBriefingAdvisorDailyBriefingPut({ body: { enabled }, throwOnError: true });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daily-briefing"] }),
  });
}
