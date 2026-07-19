import * as WebBrowser from "expo-web-browser";
import { Check } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { Pressable, Text, View } from "react-native";

import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { ScreenHeader } from "@/components/ui/screen-header";
import { getPlansBillingPlansGet } from "@/lib/api/sdk.gen";
import { useEntitlements } from "@/hooks/useSettings";
import { cn } from "@/lib/utils";

type Plan = {
  key: string;
  name: string;
  description: string;
  monthly_price_usd: number;
  features: string[];
  paid: boolean;
};

export default function BillingScreen() {
  const entitlements = useEntitlements();
  const plans = useQuery({
    queryKey: ["billing-plans"],
    queryFn: async () => {
      const { data } = await getPlansBillingPlansGet({ throwOnError: true });
      return (data as unknown as { plans: Plan[] }).plans;
    },
  });

  const currentPlan = entitlements.data?.plan ?? "free";
  const siteUrl = process.env.EXPO_PUBLIC_SITE_URL ?? "https://salli.lk";

  const handleUpgrade = () => {
    // No native Paddle SDK — checkout runs on web, matching the brief's mobile behavior.
    WebBrowser.openBrowserAsync(`${siteUrl}/settings?upgrade=1`);
  };

  return (
    <PageShell>
      <ScreenHeader title="Billing" back />

      <View className="px-4 pt-3">
        <View className="overflow-hidden rounded-card border border-foreground/10">
          <View className="bg-salli-navy-card px-4 pb-4 pt-3.5">
            <Text className="mb-2.5 text-[12px] text-white/60 capitalize">
              {entitlements.data?.plan_name ?? "Free"} Plan
            </Text>
            <View className="flex-row flex-wrap gap-1.5">
              {(entitlements.data?.usage ?? []).map((u) => (
                <View key={u.metric} className="flex-row items-center gap-1.5 rounded-pill bg-white/10 px-3 py-1.5">
                  <Text className="text-[11px] capitalize text-white/50">{u.metric.replace(/_/g, " ")}</Text>
                  <Text className="font-sans-bold text-[11px] text-white">
                    {u.used}/{u.limit}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <Text className="mb-2 mt-4 pl-0.5 text-[11px] font-sans-semibold uppercase tracking-wide text-foreground/30">
          Plans
        </Text>
        <View className="gap-2.5">
          {(plans.data ?? []).map((plan) => {
            const isCurrent = plan.key === currentPlan;
            return (
              <Card key={plan.key} className={cn("p-4", isCurrent && "border-salli-accent/40")}>
                <View className="mb-1.5 flex-row items-center justify-between">
                  <Text className="font-sans-bold text-[16px] text-foreground">{plan.name}</Text>
                  <Text className="font-sans-bold text-[16px] text-foreground">
                    {plan.monthly_price_usd === 0 ? "Free" : `$${plan.monthly_price_usd}/mo`}
                  </Text>
                </View>
                <Text className="mb-2.5 text-[12px] text-foreground/40">{plan.description}</Text>
                <View className="mb-3 gap-1.5">
                  {plan.features.map((f, i) => (
                    <View key={i} className="flex-row items-start gap-2">
                      <Check size={13} color="#2563EB" strokeWidth={2.5} />
                      <Text className="flex-1 text-[12px] leading-4 text-foreground/60">{f}</Text>
                    </View>
                  ))}
                </View>
                {isCurrent ? (
                  <View className="items-center rounded-pill border border-foreground/10 bg-foreground/[0.06] py-2.5">
                    <Text className="text-[13px] font-sans-semibold text-foreground/40">Current Plan</Text>
                  </View>
                ) : (
                  <Pressable onPress={handleUpgrade} className="items-center rounded-pill bg-primary py-2.5">
                    <Text className="text-[13px] font-sans-semibold text-primary-foreground">Upgrade to {plan.name}</Text>
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
