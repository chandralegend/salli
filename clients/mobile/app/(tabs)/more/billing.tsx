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
import { TopUpCard } from "@/components/settings/TopUpCard";

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
  // Not `plan !== "free"`. A comped or manually granted subscription is paid by
  // that measure but has no Paddle customer behind it, so opening the portal
  // fails with a toast the user can do nothing about. `change_mode` is the
  // server's own answer to "is there a live provider subscription here", and
  // only "in_place" means yes.
  const isPaid = entitlements.data?.change_mode === "in_place";

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
    <PageShell header={<ScreenHeader title="Billing" back />}>
      <View className="px-4 pt-3">
        <View className="overflow-hidden rounded-card border border-foreground/10">
          <View className="bg-salli-hero px-4 pb-4 pt-3.5">
            <Text className="mb-3 text-[14px] font-sans-medium uppercase tracking-wide text-white/50 capitalize">
              {entitlements.data?.plan_name ?? "Free"} Plan
            </Text>
            {(() => {
              const c = entitlements.data?.credits;
              if (!c) return null;
              const pct =
                c.allowance_total > 0
                  ? Math.min(100, (c.allowance_remaining / c.allowance_total) * 100)
                  : 0;
              const low = pct <= 20;
              return (
                <View className="gap-3">
                  <View className="flex-row items-baseline gap-2">
                    <Text className="font-sans-semibold text-2xl text-white">
                      {c.total.toLocaleString()}
                    </Text>
                    <Text className="text-[15px] text-white/50">credits left</Text>
                  </View>
                  <View className="h-1.5 overflow-hidden rounded-pill bg-white/10">
                    <View
                      className={cn("h-full rounded-pill", low ? "bg-destructive" : "bg-white")}
                      style={{ width: `${pct}%` }}
                    />
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-[14px] text-white/50">Monthly allowance</Text>
                    <Text className="font-sans-semibold text-[14px] text-white">
                      {c.allowance_remaining.toLocaleString()} / {c.allowance_total.toLocaleString()}
                    </Text>
                  </View>
                  {c.purchased_remaining > 0 && (
                    <View className="flex-row justify-between">
                      {/* Said plainly because it is the reassurance someone
                          wants before buying another pack. */}
                      <Text className="text-[14px] text-white/50">Purchased · never expires</Text>
                      <Text className="font-sans-semibold text-[14px] text-white">
                        {c.purchased_remaining.toLocaleString()}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })()}
          </View>
        </View>

        <View className="mt-4">
          <TopUpCard />
        </View>

        <Text className="mb-2 mt-4 pl-0.5 text-[14px] font-sans-semibold uppercase tracking-wide text-foreground/30">
          Plans
        </Text>
        <View className="gap-2.5">
          {(plans.data ?? []).map((plan) => {
            const isCurrent = plan.key === currentPlan;
            return (
              <Card key={plan.key} className={cn("p-4", isCurrent && "border-salli-accent/40")}>
                <View className="mb-1.5 flex-row items-center justify-between">
                  <Text className="font-sans-bold text-[18px] text-foreground">{plan.name}</Text>
                  <Text className="font-sans-bold text-[18px] text-foreground">
                    {plan.monthly_price_usd === 0 ? "Free" : `$${plan.monthly_price_usd}/mo`}
                  </Text>
                </View>
                <Text className="mb-2.5 text-[15px] text-foreground/40">{plan.description}</Text>
                <View className="mb-3 gap-1.5">
                  {plan.features.map((f, i) => (
                    <View key={i} className="flex-row items-start gap-2">
                      <Check size={15} color={colors.accent} strokeWidth={2.5} />
                      <Text className="flex-1 text-[15px] leading-5 text-foreground/60">{f}</Text>
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
                        <Text className="text-[15px] font-sans-semibold text-foreground/70">Manage subscription</Text>
                      )}
                    </Pressable>
                  ) : (
                    <View className="items-center rounded-pill border border-foreground/10 bg-foreground/[0.06] py-2.5">
                      <Text className="text-[15px] font-sans-semibold text-foreground/40">Current Plan</Text>
                    </View>
                  )
                ) : null}
                {/* Deliberately no call to action on a plan the user is not on.
                    App Store rule 3.1.1 forbids directing customers to a
                    purchasing mechanism other than in-app purchase, and that
                    applies everywhere except the US, EU and South Korea — which
                    is to say, everywhere Salli actually has users. Naming
                    the website here, as this did, was a call to action.

                    Listing what the plan includes is not steering; offering a
                    way to buy it outside the app is. When mobile purchasing
                    exists, a real buy button belongs here. */}
              </Card>
            );
          })}
        </View>
      </View>
    </PageShell>
  );
}
