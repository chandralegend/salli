import { useEffect, useState } from "react";
import { Check } from "lucide-react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ActivityIndicator, Alert, AppState, Pressable, Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";

import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { ScreenHeader } from "@/components/ui/screen-header";
import { getPlansBillingPlansGet } from "@/lib/api/sdk.gen";
import { useThemeColors } from "@/lib/theme";
import {
  useBillingPortal,
  useChangePlan,
  useCreateCheckout,
  useEntitlements,
  usePlanChangePreview,
  type BillingCycle,
  type PlanChangePreview,
} from "@/hooks/useSettings";
import { formatMinor } from "@/lib/format";
import { useToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

// Mirrors the backend's blocked reasons, so a blocked subscription explains itself
// without the user first tapping a button that will 409.
const BLOCKED_COPY: Record<string, string> = {
  past_due: "There's an unpaid invoice. Settle it in the billing portal to change plans.",
  paused: "Your subscription is paused. Resume it in the billing portal to change plans.",
  scheduled_change:
    "Your subscription is already scheduled to cancel. Manage that in the billing portal.",
  unknown_status: "Manage this subscription in the billing portal.",
};

/** Pull the backend's message out of the generated client's thrown error.
 *  Without this every failure reads "We couldn't start checkout", which is wrong for
 *  a blocked subscription and unhelpful for a declined card. */
function detailMessage(err: unknown): string | null {
  const detail = (err as { error?: { detail?: unknown } })?.error?.detail;
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object") {
    const message = (detail as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return null;
}

/** Confirmation text. Branches on `result` because a credit doesn't touch the card
 *  and isn't refunded — the user has to know that before agreeing. */
function confirmBody(preview: PlanChangePreview, cycle: BillingCycle): string {
  const lines: string[] = [];
  if (preview.result === "credit" && preview.result_amount_minor > 0) {
    lines.push(
      `No charge today. ${formatMinor(preview.result_amount_minor, preview.currency)} will be added to your account credit and applied to future invoices — it is not refunded to your card.`,
    );
  } else if (preview.immediate_charge_minor > 0) {
    const credit =
      preview.credit_applied_minor > 0
        ? ` (includes ${formatMinor(preview.credit_applied_minor, preview.currency)} credit for unused time)`
        : "";
    lines.push(`Due today: ${formatMinor(preview.immediate_charge_minor, preview.currency)}${credit}.`);
  } else {
    lines.push("No charge today.");
  }
  if (preview.recurring_amount_minor > 0) {
    lines.push(
      `Then ${formatMinor(preview.recurring_amount_minor, preview.recurring_currency)} / ${cycle === "year" ? "year" : "month"}.`,
    );
  }
  return lines.join("\n\n");
}

type Plan = {
  key: string;
  name: string;
  description: string;
  monthly_price_usd: number;
  yearly_price_usd: number;
  features: string[];
  paid: boolean;
};

export default function BillingScreen() {
  const colors = useThemeColors();
  const showToast = useToast();
  const entitlements = useEntitlements();
  const plans = useQuery({
    queryKey: ["billing-plans"],
    queryFn: async () => {
      const { data } = await getPlansBillingPlansGet({ throwOnError: true });
      return (data as unknown as { plans: Plan[] }).plans;
    },
  });

  const currentPlan = entitlements.data?.plan ?? "free";
  const currentCycle = entitlements.data?.billing_cycle ?? null;
  const isPaid = currentPlan !== "free";
  const siteUrl = process.env.EXPO_PUBLIC_SITE_URL ?? "https://salli.lk";

  const checkout = useCreateCheckout();
  const previewChange = usePlanChangePreview();
  const changePlan = useChangePlan();
  const portal = useBillingPortal();
  const queryClient = useQueryClient();
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  // Default to checkout while entitlements load: it's the branch that can't charge a
  // card without the Paddle overlay in front of it.
  const changeMode = entitlements.data?.change_mode ?? "checkout";
  const blockedReason = entitlements.data?.change_blocked_reason ?? null;
  // An override rather than useState(currentCycle): entitlements are still loading
  // on first render, so a seeded state would stick on the "month" fallback and
  // never reflect what the user actually bought.
  const [cycleOverride, setCycleOverride] = useState<BillingCycle | null>(null);
  const cycle = cycleOverride ?? currentCycle ?? "month";

  // Checkout/portal happen in a web browser (no native Paddle SDK). Re-pull the
  // subscription + plan state whenever we come back so the plan reflects a change.
  const refreshBilling = () => {
    queryClient.invalidateQueries({ queryKey: ["entitlements"] });
    queryClient.invalidateQueries({ queryKey: ["billing-plans"] });
  };

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshBilling();
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCheckout = async (planKey: string) => {
    const data = await checkout.mutateAsync({ plan: planKey, cycle });
    // The Paddle overlay only runs on web, so open the hosted web checkout
    // page (honouring a returned url if the backend provides one).
    const url =
      data.url ?? `${siteUrl}/settings?upgrade=${encodeURIComponent(planKey)}&cycle=${cycle}`;
    // Resolves when the in-app browser tab is dismissed → refresh entitlements.
    await WebBrowser.openBrowserAsync(url);
    refreshBilling();
  };

  const applyChange = async (plan: Plan) => {
    try {
      const updated = await changePlan.mutateAsync({ plan: plan.key, cycle });
      queryClient.setQueryData(["entitlements"], updated);
      refreshBilling();
    } catch (err) {
      showToast(detailMessage(err) ?? "We couldn't change your plan right now. Please try again.", "error");
      // A rejection can mean the subscription moved underneath us (cancelled in the
      // portal), so re-read rather than trusting what's on screen.
      refreshBilling();
    }
  };

  const handleUpgrade = async (plan: Plan) => {
    if (busyPlan) return;
    setBusyPlan(plan.key);
    try {
      // An existing subscriber's change is a plain API call — no Paddle.js, so no
      // browser round-trip. The web handoff is only for a first purchase.
      if (changeMode !== "in_place") {
        await startCheckout(plan.key);
        return;
      }
      const preview = await previewChange.mutateAsync({ plan: plan.key, cycle });
      Alert.alert(
        `Switch to ${plan.name}${cycle === "year" ? " (annual)" : " (monthly)"}?`,
        confirmBody(preview, cycle),
        [
          { text: "Cancel", style: "cancel" },
          {
            text:
              preview.immediate_charge_minor > 0
                ? `Pay ${formatMinor(preview.immediate_charge_minor, preview.currency)}`
                : "Confirm",
            onPress: () => void applyChange(plan),
          },
        ],
      );
    } catch (err) {
      // change_mode may be stale on this device — fall through to checkout rather
      // than dead-ending someone whose subscription lapsed since the screen loaded.
      if ((err as { error?: { detail?: { error?: string } } })?.error?.detail?.error === "checkout_required") {
        try {
          await startCheckout(plan.key);
          return;
        } catch {
          /* fall through to the generic message below */
        }
      }
      showToast(detailMessage(err) ?? "Please try again.", "error");
    } finally {
      setBusyPlan(null);
    }
  };

  const handleManage = async () => {
    if (portal.isPending) return;
    try {
      const url = await portal.mutateAsync();
      await WebBrowser.openBrowserAsync(url);
      refreshBilling();
    } catch {
      showToast("We couldn't open the billing portal right now. Please try again.", "error");
    }
  };

  return (
    <PageShell>
      <ScreenHeader title="Billing" back />

      <View className="px-4 pt-3">
        <View className="overflow-hidden rounded-card border border-foreground/10">
          <View className="bg-salli-navy-card px-4 pb-4 pt-3.5">
            <Text className="mb-3 text-[11px] font-sans-medium uppercase tracking-wide text-white/50 capitalize">
              {entitlements.data?.plan_name ?? "Free"} Plan
              {currentCycle ? (currentCycle === "year" ? " · Annual" : " · Monthly") : ""}
            </Text>
            {/* On the card, not only behind a tap: someone in dunning needs to know
                why before hunting for a button that won't work. */}
            {changeMode === "blocked" && (
              <Text className="mb-3 text-[11px] leading-4 text-white/50">
                {BLOCKED_COPY[blockedReason ?? ""] ?? BLOCKED_COPY.unknown_status}
              </Text>
            )}
            <View className="gap-3">
              {(entitlements.data?.usage ?? []).map((u) => {
                const limit = Number(u.limit);
                const used = Number(u.used);
                const pct = Number.isFinite(limit) && limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
                const near = pct >= 80;
                return (
                  <View key={u.metric}>
                    <View className="mb-1.5 flex-row justify-between">
                      <Text className="text-[11px] capitalize text-white/50">{u.metric.replace(/_/g, " ")}</Text>
                      <Text className="font-sans-semibold text-[11px] text-white">
                        {u.used}/{u.limit}
                      </Text>
                    </View>
                    <View className="h-1.5 overflow-hidden rounded-pill bg-white/10">
                      <View
                        className={cn("h-full rounded-pill", near ? "bg-destructive" : "bg-white")}
                        style={{ width: `${pct}%` }}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        <Text className="mb-2 mt-4 pl-0.5 text-[11px] font-sans-semibold uppercase tracking-wide text-foreground/30">
          Plans
        </Text>

        <View className="mb-2.5 flex-row self-center rounded-pill border border-foreground/10 bg-foreground/[0.05] p-0.5">
          {(["month", "year"] as const).map((c) => (
            <Pressable
              key={c}
              onPress={() => setCycleOverride(c)}
              className={cn(
                "rounded-pill px-4 py-1.5",
                cycle === c && "bg-primary",
              )}
            >
              <Text
                className={cn(
                  "text-[12px] font-sans-semibold",
                  cycle === c ? "text-primary-foreground" : "text-foreground/50",
                )}
              >
                {c === "month" ? "Monthly" : "Annual"}
              </Text>
            </Pressable>
          ))}
        </View>

        <View className="gap-2.5">
          {(plans.data ?? []).map((plan) => {
            const isCurrentPlan = plan.key === currentPlan;
            // Same plan on the other cycle is a real, purchasable change — it must
            // not render as a dead "Current Plan" row with no way to act on it.
            const isCycleSwitch =
              isCurrentPlan && currentCycle !== null && cycle !== currentCycle;
            const isCurrent = isCurrentPlan && !isCycleSwitch;
            // Annual isn't offered for every plan; plans.py documents 0 as "no annual
            // price". Showing the CTA anyway would 503 on an unset price ID.
            const unavailableCycle = cycle === "year" && plan.paid && !plan.yearly_price_usd;
            return (
              <Card key={plan.key} className={cn("p-4", isCurrent && "border-salli-accent/40")}>
                <View className="mb-1.5 flex-row items-center justify-between">
                  <Text className="font-sans-bold text-[16px] text-foreground">{plan.name}</Text>
                  <Text className="font-sans-bold text-[16px] text-foreground">
                    {!plan.paid
                      ? "Free"
                      : cycle === "year"
                        ? `$${plan.yearly_price_usd}/yr`
                        : `$${plan.monthly_price_usd}/mo`}
                  </Text>
                </View>
                <Text className="mb-2.5 text-[12px] text-foreground/40">{plan.description}</Text>
                <View className="mb-3 gap-1.5">
                  {plan.features.map((f, i) => (
                    <View key={i} className="flex-row items-start gap-2">
                      <Check size={13} color={colors.accent} strokeWidth={2.5} />
                      <Text className="flex-1 text-[12px] leading-4 text-foreground/60">{f}</Text>
                    </View>
                  ))}
                </View>
                {isCurrent ? (
                  isPaid ? (
                    <Pressable
                      onPress={handleManage}
                      disabled={portal.isPending}
                      className="h-[42px] flex-row items-center justify-center rounded-pill border border-foreground/10 bg-foreground/[0.06]"
                    >
                      {portal.isPending ? (
                        <ActivityIndicator size="small" color={colors.accent} />
                      ) : (
                        <Text className="text-[13px] font-sans-semibold text-foreground/70">Manage subscription</Text>
                      )}
                    </Pressable>
                  ) : (
                    <View className="items-center rounded-pill border border-foreground/10 bg-foreground/[0.06] py-2.5">
                      <Text className="text-[13px] font-sans-semibold text-foreground/40">Current Plan</Text>
                    </View>
                  )
                ) : unavailableCycle ? (
                  <View className="items-center rounded-pill border border-foreground/10 bg-foreground/[0.06] py-2.5">
                    <Text className="text-[13px] font-sans-semibold text-foreground/40">
                      No annual price
                    </Text>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => handleUpgrade(plan)}
                    disabled={busyPlan !== null || changeMode === "blocked"}
                    className={cn(
                      "h-[42px] flex-row items-center justify-center rounded-pill bg-primary",
                      changeMode === "blocked" && "opacity-40",
                    )}
                  >
                    {busyPlan === plan.key ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text className="text-[13px] font-sans-semibold text-primary-foreground">
                        {isCycleSwitch
                          ? `Switch to ${cycle === "year" ? "annual" : "monthly"}`
                          : changeMode === "in_place"
                            ? // Pro→Starter is a legitimate in-place change, so the
                              // label can't assume the move is upward.
                              `Switch to ${plan.name}`
                            : `Upgrade to ${plan.name}`}
                      </Text>
                    )}
                  </Pressable>
                )}
              </Card>
            );
          })}
        </View>
      </View>
    </PageShell>
  );
}
