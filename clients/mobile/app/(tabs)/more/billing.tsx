import { Check } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, Linking, Pressable, Text, View } from "react-native";

import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { ScreenHeader } from "@/components/ui/screen-header";
import { getPlansBillingPlansGet } from "@/lib/api/sdk.gen";
import { useBillingPortal, useEntitlements } from "@/hooks/useSettings";
import { useThemeColors } from "@/lib/theme";
import { useToast } from "@/lib/toast";
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
  const isPaid = currentPlan !== "free";

  const portal = useBillingPortal();

  const handleManage = async () => {
    if (portal.isPending) return;
    try {
      const url = await portal.mutateAsync();
      await Linking.openURL(url);
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
                  <View className="items-center rounded-pill border border-foreground/10 bg-foreground/[0.06] py-2.5">
                    <Text className="text-[13px] font-sans-semibold text-foreground/40">
                      Manage your plan at salli.lk
                    </Text>
                  </View>
                )}
              </Card>
            );
          })}
        </View>
      </View>
    </PageShell>
  );
}
