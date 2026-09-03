import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react-native";
import { ActivityIndicator, Linking, Text, View } from "react-native";

import { TopUpCard } from "@/components/settings/TopUpCard";
import { ActionButton } from "@/components/ui/action-button";
import { Chip, Hero, Meter, Rule, SectionLabel, Strong } from "@/components/ui/blocks";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { ScreenHeader } from "@/components/ui/screen-header";
import { useBillingPortal, useEntitlements } from "@/hooks/useSettings";
import { getPlansBillingPlansGet } from "@/lib/api/sdk.gen";
import { formatDate } from "@/lib/format";
import { useThemeColors } from "@/lib/theme";
import { useToast } from "@/lib/toast";

type Plan = {
  key: string;
  name: string;
  description: string;
  monthly_price_usd: number;
  features: string[];
  paid: boolean;
};

/**
 * Credits, top-ups and plans.
 *
 * Reached from Settings rather than from the More grid. The credit figure the
 * ink-and-navy block used to carry appears three ways in one screen before this
 * change — as a headline, as a progress bar, and as an "allowance x / y" row —
 * plus a fourth time in Settings' own free-plan usage panel. It is one sentence
 * and one meter now, and Settings links here instead of restating it.
 */
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

  const c = entitlements.data?.credits;
  const resetsAt = formatDate(c?.resets_at ?? entitlements.data?.current_period_end);
  const allowanceFrac = c && c.allowance_total > 0 ? c.allowance_remaining / c.allowance_total : 0;
  const low = allowanceFrac <= 0.2;

  return (
    <PageShell
      header={
        <ScreenHeader
          title="Billing"
          back
          trailing={<Chip>{entitlements.data?.plan_name ?? "Free"}</Chip>}
        />
      }
    >
      <View className="px-5">
        {c ? (
          <>
            <Hero>
              You have <Strong>{c.total.toLocaleString()}</Strong> credits.
            </Hero>
            <Text
              className={`mt-2 text-[16px] leading-[23px] ${
                low ? "font-sans-semibold text-salli-accent" : "text-muted-foreground"
              }`}
            >
              {/* With no purchased credits, `total` IS `allowance_remaining`,
                  so spelling both out printed the same figure twice in two
                  consecutive sentences. The allowance form is only used when
                  the two genuinely differ. */}
              {c.purchased_remaining > 0
                ? `${c.allowance_remaining.toLocaleString()} of your ${c.allowance_total.toLocaleString()} monthly allowance left${
                    resetsAt !== "—" ? `, renewing ${resetsAt}` : ""
                  }, plus ${c.purchased_remaining.toLocaleString()} purchased that never expire.`
                : `Out of a monthly allowance of ${c.allowance_total.toLocaleString()}${
                    resetsAt !== "—" ? `, renewing ${resetsAt}` : ""
                  }.`}
            </Text>
            {/* The meter tracks the ALLOWANCE, not the total: purchased credits
                have no denominator to fill, so including them would make the
                bar creep back up after a top-up and never reach either end. */}
            <Meter className="mt-4" value={allowanceFrac} over={low} />
          </>
        ) : (
          <Hero>Loading your balance&hellip;</Hero>
        )}
      </View>

      <TopUpCard />

      <Rule />
      <SectionLabel>Plans</SectionLabel>
      <View className="mt-3 gap-[13px] px-5">
        {(plans.data ?? []).map((plan) => {
          const isCurrent = plan.key === currentPlan;
          return (
            <Card key={plan.key} className={`p-[15px] ${isCurrent ? "border-salli-accent" : ""}`}>
              <View className="flex-row items-baseline justify-between gap-2.5">
                <Text className="min-w-0 flex-1 font-sans-extrabold text-[18px] text-foreground">
                  {plan.name}
                </Text>
                <Text className="shrink-0 font-sans-extrabold text-[18px] text-foreground">
                  {plan.monthly_price_usd === 0 ? "Free" : `$${plan.monthly_price_usd}/mo`}
                </Text>
              </View>
              <Text className="mt-1.5 text-[14px] leading-[20px] text-muted-foreground">
                {plan.description}
              </Text>
              <View className="mt-3 gap-1.5">
                {plan.features.map((f, i) => (
                  <View key={i} className="flex-row items-start gap-2">
                    <Check
                      size={15}
                      color={colors.foreground}
                      strokeWidth={2.5}
                      style={{ marginTop: 3 }}
                    />
                    <Text className="flex-1 text-[14px] leading-[20px] text-foreground">{f}</Text>
                  </View>
                ))}
              </View>
              {isCurrent ? (
                isPaid ? (
                  <ActionButton
                    variant="secondary"
                    className="mt-3.5"
                    loading={portal.isPending}
                    onPress={handleManage}
                  >
                    Manage subscription
                  </ActionButton>
                ) : (
                  <View className="mt-3.5 flex-row">
                    <Chip tone="accent">Current plan</Chip>
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
        {plans.isLoading ? (
          <ActivityIndicator size="small" color={colors.mutedForeground} />
        ) : null}
      </View>
      <View className="h-7" />
    </PageShell>
  );
}
