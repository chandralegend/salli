import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  billingPortalBillingPortalPost,
  deleteMyAccountOnboardingAccountDelete,
  exportMyDataOnboardingExportGet,
  getDailyBriefingAdvisorDailyBriefingGet,
  getSubscriptionBillingSubscriptionGet,
  listModelsAiModelsGet,
  setModelAiModelsSelectionPut,
  setDailyBriefingAdvisorDailyBriefingPut,
} from "@/lib/api/sdk.gen";

export type Usage = { metric: string; used: number; limit: number; remaining: number; resets_at: string };

/** The credit balance, split into the half that resets and the half that does not. */
export type CreditBalance = {
  allowance_remaining: number;
  allowance_used: number;
  allowance_total: number;
  /** Bought, never expires, and only drawn on once the allowance is gone. */
  purchased_remaining: number;
  /** What can actually be spent right now. */
  total: number;
  resets_at: string;
};

export type AiModel = {
  id: string;
  name: string;
  blurb: string;
  credit_multiplier: number;
  credits_per_message: number;
  is_default: boolean;
};
export type Entitlements = {
  plan: string;
  plan_name: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  usage: Usage[];
  /** The number the UI shows. `usage` covers only the resetting allowance, so a
   *  user who has topped up would read as empty while holding purchased credits. */
  credits: CreditBalance;
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

export function useAiModels() {
  return useQuery({
    queryKey: ["ai-models"],
    queryFn: async () => {
      const { data } = await listModelsAiModelsGet({ throwOnError: true });
      return data as unknown as { selected: string; default: string; models: AiModel[] };
    },
    staleTime: 5 * 60_000,
  });
}

export function useSetAiModel() {
  const qc = useQueryClient();
  return useMutation({
    // null means "back to the default" — the server clears the preference
    // rather than storing the default's id, so the user follows the default if
    // it ever changes.
    mutationFn: async (modelId: string | null) => {
      await setModelAiModelsSelectionPut({ body: { model_id: modelId }, throwOnError: true });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-models"] });
      // A message costs a different number of credits now.
      qc.invalidateQueries({ queryKey: ["entitlements"] });
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
