import { useRouter } from "expo-router";
import {
  Bell,
  Book,
  ChevronRight,
  Coins,
  CreditCard,
  FileText,
  Landmark,
  Receipt,
  RefreshCw,
  Settings,
  Shield,
  ShieldCheck,
  TrendingUp,
  Upload,
} from "lucide-react-native";
import { Text, View } from "react-native";

import { AffordabilityCard } from "@/components/AffordabilityCard";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { formatLKRAbbrev, formatPct } from "@/lib/format";
import { useThemeColors } from "@/lib/theme";
import { useEntitlements } from "@/hooks/useSettings";
import { useMore } from "@/hooks/useMore";
import { useTaxPacks } from "@/hooks/useTax";
import { dueDateShort } from "@/lib/taxDates";

const FEATURES: {
  key: string;
  title: string;
  detail: string;
  icon: typeof Bell;
  href: string;
  badge?: string;
}[] = [
  // Billing is listed here because this menu is its ONLY entry point. It was
  // previously reachable only from a quota banner, i.e. only once you had
  // already run out of credits — so the balance and the top-up buttons were
  // invisible to everyone who had not yet hit the wall.
  { key: "billing", title: "Billing", detail: "AI credits, plan & top-ups", icon: Coins, href: "/(tabs)/more/billing" },
  { key: "budget", title: "Budget", detail: "Monthly & category limits", icon: CreditCard, href: "/(tabs)/more/budget" },
  { key: "debt", title: "Debt", detail: "Loans & payoff planning", icon: Landmark, href: "/(tabs)/more/debt" },
  { key: "portfolio", title: "Portfolio", detail: "Holdings & allocation", icon: TrendingUp, href: "/(tabs)/more/portfolio" },
  { key: "insurance", title: "Insurance", detail: "Policies & coverage gaps", icon: Shield, href: "/(tabs)/more/insurance" },
  { key: "reports", title: "Reports", detail: "Balance sheet, net worth", icon: FileText, href: "/(tabs)/more/reports" },
  { key: "statements", title: "Statements", detail: "Import bank transactions", icon: Upload, href: "/(tabs)/more/statements" },
  { key: "subscriptions", title: "Subscriptions", detail: "Recurring bills & renewals", icon: RefreshCw, href: "/(tabs)/more/subscriptions" },
  { key: "tax", title: "Tax", detail: "AY 2025/26 · IRD computation", icon: Receipt, href: "/(tabs)/more/tax", badge: "AY 25/26" },
  { key: "reminders", title: "Reminders", detail: "Filing deadlines & alerts", icon: Bell, href: "/(tabs)/more/reminders" },
  { key: "documents", title: "Documents", detail: "AI-saved notes & memories", icon: Book, href: "/(tabs)/more/documents" },
  { key: "audit-log", title: "Audit Log", detail: "AI write action history", icon: ShieldCheck, href: "/(tabs)/more/audit-log" },
];

function QuickStatCard({ label, value, hint, onPress }: { label: string; value: string; hint: string; onPress: () => void }) {
  const colors = useThemeColors();
  return (
    <AnimatedPressable onPress={onPress} className="w-[48%] rounded-card border-2 border-foreground bg-card p-3.5">
      <View className="mb-1.5 flex-row items-center justify-between">
        <Text className="text-[14px] font-sans-medium text-muted-foreground">{label}</Text>
        <ChevronRight size={14} color={colors.mutedForeground} strokeWidth={2} />
      </View>
      <Text className="mb-0.5 font-sans-bold text-[18px] text-foreground">{value}</Text>
      <Text className="text-[13px] text-muted-foreground">{hint}</Text>
    </AnimatedPressable>
  );
}

export default function MoreScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { profile, budgetSummary, portfolio, debtPlan, hasDebts, totalDebt, tax, overdueCount } =
    useMore();
  // The filing deadline comes from the tax pack, never from a literal in this
  // file — see lib/taxDates.ts.
  const packs = useTaxPacks();
  // Shown as a badge on the Billing row so the balance is legible without
  // navigating. `credits.total` is allowance + purchased, which is what can
  // actually be spent — allowance alone reads as empty for a topped-up user.
  const credits = useEntitlements().data?.credits;
  const currentPack = packs.data?.find((p) => p.year === tax?.pack_year);

  return (
    <PageShell
      header={
        <View className="flex-row items-center px-5 pt-2.5">
          <Text className="flex-1 font-sans-bold text-[26px] text-foreground">More</Text>
          <AnimatedPressable
            onPress={() => router.push("/(tabs)/more/settings")}
            className="h-11 w-11 items-center justify-center rounded-full border border-foreground/[0.08] bg-foreground/[0.07]"
          >
            <Settings size={21} color={colors.foreground} strokeWidth={2} />
          </AnimatedPressable>
        </View>
      }
    >

      <Card className="mx-4 mb-3 flex-row items-center gap-3 rounded-card p-3.5">
        <View className="h-11 w-11 items-center justify-center rounded-full border-2 border-foreground bg-salli-accent">
          <Text className="font-sans-bold text-[19px] text-white">
            {(profile?.display_name ?? "?").charAt(0).toUpperCase()}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="font-sans-semibold text-[16px] text-foreground">
            {profile?.display_name ?? "Set your name"}
          </Text>
          <Text className="mt-0.5 text-[14px] text-muted-foreground">{profile?.email ?? ""}</Text>
        </View>
      </Card>

      <View className="mx-4 mb-3.5 flex-row flex-wrap justify-between gap-2">
        <QuickStatCard
          label="Budget"
          value={budgetSummary ? `Rs. ${formatLKRAbbrev(budgetSummary.total_actual)}` : "—"}
          hint={
            budgetSummary
              ? `of Rs. ${formatLKRAbbrev(budgetSummary.total_limit)} · ${(
                  (Number(budgetSummary.total_actual) / Number(budgetSummary.total_limit || 1)) *
                  100
                ).toFixed(0)}% used`
              : "No budget yet"
          }
          onPress={() => router.push("/(tabs)/more/budget")}
        />
        <QuickStatCard
          label="Portfolio"
          value={portfolio ? `Rs. ${formatLKRAbbrev(portfolio.total_value)}` : "—"}
          hint={portfolio ? `+${formatPct(portfolio.total_gain_pct)} total gain` : "No holdings yet"}
          onPress={() => router.push("/(tabs)/more/portfolio")}
        />
        <QuickStatCard
          label="Debt"
          value={hasDebts ? `Rs. ${formatLKRAbbrev(totalDebt)}` : "—"}
          hint={
            hasDebts
              ? debtPlan?.months_to_payoff
                ? `${debtPlan.months_to_payoff} months to payoff`
                : "Outstanding balance"
              : "No debts"
          }
          onPress={() => router.push("/(tabs)/more/debt")}
        />
        <QuickStatCard
          label="Tax Payable"
          value={tax ? `Rs. ${formatLKRAbbrev(tax.tax_payable)}` : "—"}
          hint={tax ? `${tax.pack_year} · ${dueDateShort(currentPack)}` : "Not computed"}
          onPress={() => router.push("/(tabs)/more/tax")}
        />
      </View>

      {overdueCount > 0 ? (
        <AnimatedPressable
          onPress={() => router.push("/(tabs)/more/reminders")}
          className="mx-4 mb-3 flex-row items-center gap-2.5 rounded-card border-2 border-foreground bg-card px-3.5 py-2.5"
        >
          <View className="h-2 w-2 rounded-full bg-foreground" />
          <Text className="flex-1 font-sans-medium text-[15px] text-foreground">
            {overdueCount} overdue reminder{overdueCount === 1 ? "" : "s"}
          </Text>
          <Text className="text-[15px] text-muted-foreground">Reminders →</Text>
        </AnimatedPressable>
      ) : null}

      {/* Moved off Home with the declutter. Kept as its own block above the
          feature list rather than as a list row, because it opens a drawer
          rather than navigating — and because it is the one thing here people
          come looking for by name. */}
      <View className="mb-3.5">
        <AffordabilityCard />
      </View>

      <View className="px-4">
        <Text className="mb-1 pl-0.5 text-[13px] font-sans-semibold uppercase tracking-wide text-muted-foreground">
          All Features
        </Text>
        <Card className="overflow-hidden rounded-card ">
          {FEATURES.map((f, i) => (
            <AnimatedPressable
              key={f.key}
              onPress={() => router.push(f.href as never)}
              className={`flex-row items-center px-3.5 py-2.5 ${i < FEATURES.length - 1 ? "border-b border-foreground/[0.05]" : ""}`}
            >
              <View className="mr-3 h-[30px] w-[30px] items-center justify-center rounded-card bg-foreground/[0.06]">
                <f.icon size={16} color={colors.mutedForeground} strokeWidth={2} />
              </View>
              <View className="flex-1">
                <Text className="font-sans-medium text-[15px] text-foreground">{f.title}</Text>
                <Text className="text-[14px] text-muted-foreground">{f.detail}</Text>
              </View>
              {f.key === "billing" && credits ? (
                <View className="mr-2 rounded-badge border-[1.5px] border-foreground bg-foreground/[0.07] px-2 py-0.5">
                  <Text className="text-[13px] font-sans-medium text-muted-foreground">
                    {credits.total.toLocaleString()}
                  </Text>
                </View>
              ) : null}
              {f.badge ? (
                <View className="mr-2 rounded-badge border-[1.5px] border-foreground bg-foreground/[0.07] px-2 py-0.5">
                  <Text className="text-[13px] font-sans-medium text-muted-foreground">{f.badge}</Text>
                </View>
              ) : null}
              {f.key === "reminders" && overdueCount > 0 ? (
                <View className="mr-2.5 h-[7px] w-[7px] rounded-full bg-foreground" />
              ) : null}
              <ChevronRight size={15} color={colors.mutedForeground} strokeWidth={2} />
            </AnimatedPressable>
          ))}
        </Card>
      </View>
    </PageShell>
  );
}
