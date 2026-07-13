import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { Check, Sparkles } from "lucide-react-native";
import { ScreenShell, CardContainer, SectionTitle } from "@/components/ui/page-shell";
import { PillButton } from "@/components/ui/pill-button";
import { useSubscription, useCheckout, usePlans, metricLabel, type Plan, type UsageMetric } from "@/hooks/useBilling";
import { useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** Where mobile sends users to finish checkout — the web app runs the real Paddle.js overlay. */
const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL ?? "https://salli.leafmonkey.org";

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

function fmtReset(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

const STATUS_COLORS: Record<string, string> = {
  active: "#16A34A",
  trialing: "#2563EB",
  past_due: "#DC2626",
  canceled: "#7DA6A9",
};

function SubscriptionCard() {
  const { data: sub, isLoading } = useSubscription();

  return (
    <CardContainer>
      <SectionTitle>Subscription</SectionTitle>
      {isLoading || !sub ? (
        <Text className="text-muted-foreground text-[13px]">Loading…</Text>
      ) : (
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-foreground text-[22px]" style={{ fontFamily: "DMSans_900Black", letterSpacing: -0.5 }}>
              {sub.plan_name}
            </Text>
            <Text className="text-muted-foreground text-[12px] mt-0.5">
              {sub.cancel_at_period_end ? "Access until" : "Renews"} {fmtDate(sub.current_period_end)}
            </Text>
          </View>
          <View
            className="rounded-full px-2.5 py-1"
            style={{ backgroundColor: `${STATUS_COLORS[sub.status] ?? "#7DA6A9"}1A` }}
          >
            <Text
              className="text-[11px]"
              style={{ fontFamily: "DMSans_700Bold", color: STATUS_COLORS[sub.status] ?? "#7DA6A9" }}
            >
              {sub.cancel_at_period_end ? "Cancels soon" : sub.status}
            </Text>
          </View>
        </View>
      )}
    </CardContainer>
  );
}

function UsageMeter({ usage }: { usage: UsageMetric }) {
  const pct = usage.limit > 0 ? Math.min(100, Math.round((usage.used / usage.limit) * 100)) : 0;
  const near = pct >= 80;
  const full = usage.remaining <= 0;
  const barColor = full ? "#F43F5E" : near ? "#F59E0B" : undefined; // rose-500 / amber-500, else bg-primary
  const width = Math.max(pct, usage.used > 0 ? 4 : 0);

  return (
    <View className="gap-1.5">
      <View className="flex-row items-baseline justify-between gap-2">
        <Text className="text-foreground text-[13px]">{metricLabel(usage.metric)}</Text>
        <Text className="text-muted-foreground text-[12px]">
          <Text style={{ color: full ? "#F43F5E" : near ? "#D97706" : undefined }}>
            {usage.used.toLocaleString()}
          </Text>
          {" / "}
          {usage.limit.toLocaleString()}
        </Text>
      </View>
      <View className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <View
          className={cn("h-full rounded-full", !barColor && "bg-primary")}
          style={{ width: `${width}%`, ...(barColor ? { backgroundColor: barColor } : {}) }}
        />
      </View>
      <Text className="text-muted-foreground text-[11px]">
        {full
          ? `Limit reached · resets ${fmtReset(usage.resets_at)}`
          : `${usage.remaining.toLocaleString()} left · resets ${fmtReset(usage.resets_at)}`}
      </Text>
    </View>
  );
}

function UsageCard() {
  const { data: sub, isLoading } = useSubscription();

  return (
    <CardContainer>
      <SectionTitle>Usage · Resets 1st of month</SectionTitle>
      {isLoading || !sub ? (
        <Text className="text-muted-foreground text-[13px]">Loading…</Text>
      ) : (
        <View className="gap-4">
          {sub.usage.map((u) => (
            <UsageMeter key={u.metric} usage={u} />
          ))}
        </View>
      )}
    </CardContainer>
  );
}

function PlanCard({
  plan,
  current,
  busy,
  onChoose,
}: {
  plan: Plan;
  current: boolean;
  busy: boolean;
  onChoose: (key: string) => void;
}) {
  return (
    <View
      className={cn(
        "rounded-2xl border p-4 bg-card",
        current ? "border-primary" : "border-border",
      )}
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-foreground text-[14px]" style={{ fontFamily: "DMSans_700Bold" }}>
          {plan.name}
        </Text>
        {current && (
          <Text className="text-primary text-[10px]" style={{ fontFamily: "DMSans_700Bold", letterSpacing: 0.5 }}>
            CURRENT
          </Text>
        )}
      </View>

      <View className="flex-row items-baseline mt-1.5">
        {plan.monthly_price_usd === 0 ? (
          <Text className="text-foreground text-[20px]" style={{ fontFamily: "DMSans_900Black" }}>
            Free
          </Text>
        ) : (
          <>
            <Text className="text-muted-foreground text-[12px] mr-0.5">$</Text>
            <Text className="text-foreground text-[20px]" style={{ fontFamily: "DMSans_900Black" }}>
              {plan.monthly_price_usd}
            </Text>
            <Text className="text-muted-foreground text-[11px]"> /mo</Text>
          </>
        )}
      </View>

      <Text className="text-muted-foreground text-[11px] mt-1 mb-3">{plan.description}</Text>

      <View className="gap-1.5 mb-1">
        {plan.features.map((f) => (
          <View key={f} className="flex-row items-start gap-1.5">
            <Check size={12} color="#16A34A" style={{ marginTop: 2 }} />
            <Text className="text-foreground text-[12px] flex-1" style={{ opacity: 0.8 }}>
              {f}
            </Text>
          </View>
        ))}
      </View>

      {plan.paid && !current && (
        <PillButton
          variant="primary"
          className="mt-3 py-2.5"
          loading={busy}
          onPress={() => onChoose(plan.key)}
        >
          {`Upgrade to ${plan.name}`}
        </PillButton>
      )}
      {current && (
        <PillButton variant="secondary" className="mt-3 py-2.5" disabled>
          Your plan
        </PillButton>
      )}
    </View>
  );
}

function PlansCard() {
  const { data: sub } = useSubscription();
  const { data: plans } = usePlans();
  const checkout = useCheckout();
  const theme = useThemeColors();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentPlan = sub?.plan ?? "free";

  async function choose(planKey: string) {
    setErrorMessage(null);
    setBusyKey(planKey);
    try {
      await checkout.mutateAsync(planKey);
      // No hosted checkout URL is returned by the API (it only hands back Paddle.js
      // overlay params for the web app). Hand off to the web app's Settings page,
      // which runs Paddle.js and can complete the upgrade there.
      await WebBrowser.openBrowserAsync(`${SITE_URL}/settings`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Checkout unavailable";
      setErrorMessage(
        msg.includes("503") || msg.toLowerCase().includes("not configured")
          ? "Billing isn't configured yet."
          : `Couldn't start checkout: ${msg}`,
      );
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <CardContainer>
      <View className="flex-row items-center gap-2 mb-1">
        <Sparkles size={15} color={theme.foreground} />
        <SectionTitle>Choose your plan</SectionTitle>
      </View>
      <Text className="text-muted-foreground text-[12px] mb-4">
        Upgrade for a larger monthly allowance of AI messages and statement uploads. Billing is
        handled securely by Paddle; cancel anytime.
      </Text>

      <View className="gap-3">
        {(plans ?? []).map((p) => (
          <PlanCard
            key={p.key}
            plan={p}
            current={p.key === currentPlan}
            busy={busyKey === p.key}
            onChoose={choose}
          />
        ))}
      </View>

      {errorMessage && (
        <Text className="text-destructive text-[12px] mt-3 text-center">{errorMessage}</Text>
      )}
    </CardContainer>
  );
}

export default function BillingScreen() {
  return (
    <ScreenShell edges={["left", "right"]}>
      <View className="gap-3">
        <SubscriptionCard />
        <UsageCard />
        <PlansCard />
      </View>
    </ScreenShell>
  );
}
