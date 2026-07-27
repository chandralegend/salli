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
  useCreateCheckout,
  useEntitlements,
  type BillingCycle,
} from "@/hooks/useSettings";
import { cn } from "@/lib/utils";

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
  const entitlements = useEntitlements();
  const plans = useQuery({
    queryKey: ["billing-plans"],
    queryFn: async () => {
      const { data } = await getPlansBillingPlansGet({ throwOnError: true });
      return (data as unknown as { plans: Plan[] }).plans;
    },
  });

  const currentPlan = entitlements.data?.plan ?? "free";
  const isPaid = currentPlan !== "free";
  const siteUrl = process.env.EXPO_PUBLIC_SITE_URL ?? "https://salli.lk";

  const checkout = useCreateCheckout();
  const portal = useBillingPortal();
  const queryClient = useQueryClient();
  const [cycle, setCycle] = useState<BillingCycle>("month");

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

  const handleUpgrade = async (planKey: string) => {
    if (checkout.isPending) return;
    try {
      const data = await checkout.mutateAsync({ plan: planKey, cycle });
      // The Paddle overlay only runs on web, so open the hosted web checkout
      // page (honouring a returned url if the backend provides one).
      const url =
        data.url ?? `${siteUrl}/settings?upgrade=${encodeURIComponent(planKey)}&cycle=${cycle}`;
      // Resolves when the in-app browser tab is dismissed → refresh entitlements.
      await WebBrowser.openBrowserAsync(url);
      refreshBilling();
    } catch {
      Alert.alert("Checkout unavailable", "We couldn't start checkout right now. Please try again.");
    }
  };

  const handleManage = async () => {
    if (portal.isPending) return;
    try {
      const url = await portal.mutateAsync();
      await WebBrowser.openBrowserAsync(url);
      refreshBilling();
    } catch {
      Alert.alert("Portal unavailable", "We couldn't open the billing portal right now. Please try again.");
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
            </Text>
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
              onPress={() => setCycle(c)}
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
            const isCurrent = plan.key === currentPlan;
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
                ) : (
                  <Pressable
                    onPress={() => handleUpgrade(plan.key)}
                    disabled={checkout.isPending}
                    className="h-[42px] flex-row items-center justify-center rounded-pill bg-primary"
                  >
                    {checkout.isPending && checkout.variables?.plan === plan.key ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text className="text-[13px] font-sans-semibold text-primary-foreground">
                        Upgrade to {plan.name}
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
