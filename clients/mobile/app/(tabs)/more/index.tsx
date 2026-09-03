import { useRouter } from "expo-router";
import {
  Bell,
  Book,
  Coins,
  FileText,
  Landmark,
  Receipt,
  RefreshCw,
  Settings,
  Shield,
  ShieldCheck,
  TrendingUp,
  Upload,
  Wallet,
} from "lucide-react-native";
import { Text, View } from "react-native";

import { AffordabilityCard } from "@/components/AffordabilityCard";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { Card } from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";
import { PageShell } from "@/components/ui/page-shell";
import { useMore } from "@/hooks/useMore";
import { useEntitlements } from "@/hooks/useSettings";
import { useTaxPacks } from "@/hooks/useTax";
import { formatLKRAbbrev, formatPct } from "@/lib/format";
import { dueDateShort } from "@/lib/taxDates";
import { useHardShadow, useThemeColors } from "@/lib/theme";

/**
 * More — a grid of tiles, each carrying its own number.
 *
 * This screen used to say everything twice. Four "quick stat" cards showed
 * Budget, Portfolio, Debt and Tax with live figures, and then a list of eleven
 * rows showed the same four destinations again with static descriptions — the
 * same taps, in two different visual languages, on one screen.
 *
 * One tile per destination now. A tile shows a real figure when the feature has
 * one and its description when it does not, so the four that mattered keep
 * their numbers without needing a parallel row each.
 */
type Tile = {
  key: string;
  title: string;
  icon: typeof Bell;
  href: string;
};

/**
 * Ordered by how often you would reach for it, not alphabetically.
 *
 * Billing leads because this menu is its ONLY entry point — before it was
 * added here it was reachable only from a quota banner, i.e. only once you had
 * already run out of credits.
 */
const TILES: Tile[] = [
  { key: "billing", title: "Billing", icon: Coins, href: "/(tabs)/more/billing" },
  { key: "budget", title: "Budget", icon: Wallet, href: "/(tabs)/more/budget" },
  { key: "tax", title: "Tax", icon: Receipt, href: "/(tabs)/more/tax" },
  { key: "debt", title: "Debt", icon: Landmark, href: "/(tabs)/more/debt" },
  { key: "portfolio", title: "Portfolio", icon: TrendingUp, href: "/(tabs)/more/portfolio" },
  { key: "reminders", title: "Reminders", icon: Bell, href: "/(tabs)/more/reminders" },
  { key: "statements", title: "Statements", icon: Upload, href: "/(tabs)/more/statements" },
  { key: "subscriptions", title: "Subscriptions", icon: RefreshCw, href: "/(tabs)/more/subscriptions" },
  { key: "insurance", title: "Insurance", icon: Shield, href: "/(tabs)/more/insurance" },
  { key: "reports", title: "Reports", icon: FileText, href: "/(tabs)/more/reports" },
  { key: "documents", title: "Documents", icon: Book, href: "/(tabs)/more/documents" },
  { key: "audit-log", title: "Audit log", icon: ShieldCheck, href: "/(tabs)/more/audit-log" },
];

export default function MoreScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const shadow = useHardShadow();
  const { profile, budgetSummary, portfolio, debtPlan, hasDebts, totalDebt, tax, overdueCount } =
    useMore();
  // The filing deadline comes from the tax pack, never from a literal in this
  // file — see lib/taxDates.ts.
  const packs = useTaxPacks();
  // `credits.total` is allowance + purchased, which is what can actually be
  // spent — allowance alone reads as empty for a topped-up user.
  const credits = useEntitlements().data?.credits;
  const currentPack = packs.data?.find((p) => p.year === tax?.pack_year);

  /**
   * What each tile says under its title: a live figure where the feature has
   * one, its description where it does not.
   *
   * `alert` marks the one thing on the tile that needs attention rather than
   * just reporting — it is the only place accent appears in the grid, so it
   * cannot be mistaken for decoration.
   */
  const detail: Record<string, { value?: string; hint: string; alert?: boolean }> = {
    billing: {
      value: credits ? credits.total.toLocaleString() : undefined,
      hint: credits ? "credits available" : "Plan & top-ups",
    },
    budget: {
      value: budgetSummary ? `Rs. ${formatLKRAbbrev(budgetSummary.total_actual)}` : undefined,
      hint: budgetSummary
        ? `of Rs. ${formatLKRAbbrev(budgetSummary.total_limit)} spent`
        : "Monthly & category limits",
    },
    tax: {
      value: tax ? `Rs. ${formatLKRAbbrev(tax.tax_payable)}` : undefined,
      hint: tax ? `due ${dueDateShort(currentPack)}` : "IRD computation",
    },
    debt: {
      value: hasDebts ? `Rs. ${formatLKRAbbrev(totalDebt)}` : undefined,
      hint: hasDebts
        ? debtPlan?.months_to_payoff
          ? `${debtPlan.months_to_payoff} months to clear`
          : "outstanding"
        : "No debts",
    },
    portfolio: {
      value: portfolio ? `Rs. ${formatLKRAbbrev(portfolio.total_value)}` : undefined,
      hint: portfolio ? `${formatPct(portfolio.total_gain_pct)} total gain` : "Holdings & allocation",
    },
    reminders: {
      value: overdueCount > 0 ? String(overdueCount) : undefined,
      hint: overdueCount > 0 ? "overdue" : "Deadlines & alerts",
      alert: overdueCount > 0,
    },
    statements: { hint: "Import transactions" },
    subscriptions: { hint: "Recurring bills" },
    insurance: { hint: "Policies & gaps" },
    reports: { hint: "Balance sheet, net worth" },
    documents: { hint: "AI-saved notes" },
    "audit-log": { hint: "AI write history" },
  };

  return (
    <PageShell
      header={
        <View className="flex-row items-center gap-3 px-4 pt-1">
          <Text
            style={{ letterSpacing: -0.8 }}
            className="flex-1 font-sans-extrabold text-[27px] text-foreground"
          >
            More
          </Text>
          <IconButton
            icon={Settings}
            onPress={() => router.push("/(tabs)/more/settings")}
            accessibilityLabel="Settings"
          />
        </View>
      }
    >
      <AnimatedPressable
        onPress={() => router.push("/(tabs)/more/settings")}
        className="mx-4 mb-3.5"
      >
        <Card className="flex-row items-center gap-3.5 p-[15px]">
          {/* Accent fill with a white initial. It briefly had `bg-card` with
              white text, which in light mode is white on white — invisible. An
              avatar is an identity mark rather than a control, so unlike the
              add buttons it keeps the filled treatment. */}
          <View className="h-11 w-11 items-center justify-center rounded-[11px] border-2 border-foreground bg-salli-accent">
            <Text className="font-sans-extrabold text-[17px] text-white">
              {(profile?.display_name ?? "?").charAt(0).toUpperCase()}
            </Text>
          </View>
          <View className="min-w-0 flex-1">
            <Text numberOfLines={1} className="font-sans-bold text-[17px] text-foreground">
              {profile?.display_name ?? "Set your name"}
            </Text>
            <Text numberOfLines={1} className="mt-0.5 text-[13.5px] text-muted-foreground">
              {profile?.email ?? ""}
            </Text>
          </View>
        </Card>
      </AnimatedPressable>

      <View className="mx-4 mb-3.5">
        <AffordabilityCard />
      </View>

      {/* Two columns. Three fitted the icons but not the figures, and the
          figures are the reason the tiles replaced a list. */}
      <View className="mx-4 flex-row flex-wrap justify-between">
        {TILES.map((t) => {
          const d = detail[t.key];
          return (
            <AnimatedPressable
              key={t.key}
              onPress={() => router.push(t.href as never)}
              press="sink"
              className="mb-3.5 w-[48%] justify-between rounded-card border-2 border-foreground bg-card p-3.5"
              // A floor, not a fixed height: flex-wrap sizes each item to its
              // own content, so a tile with a figure came out taller than one
              // without and the rows sat crooked. The floor is the height of a
              // tile that has a figure, so every tile matches the tallest kind.
              style={[{ minHeight: 126 }, shadow]}
            >
              {/* Icon pinned top, text pinned bottom. With everything packed
                  to the top, a tile without a figure had its dead space
                  trailing underneath and looked short-changed rather than
                  simply quieter. */}
              <t.icon
                size={21}
                color={d.alert ? colors.accent : colors.foreground}
                strokeWidth={2}
              />
              <View>
                <Text className="font-sans-bold text-[16px] text-foreground">{t.title}</Text>
                {d.value ? (
                  <Text
                    numberOfLines={1}
                    className={`mt-1 font-sans-extrabold text-[19px] ${
                      d.alert ? "text-salli-accent" : "text-foreground"
                    }`}
                  >
                    {d.value}
                  </Text>
                ) : null}
                <Text numberOfLines={1} className="mt-0.5 text-[13px] text-muted-foreground">
                  {d.hint}
                </Text>
              </View>
            </AnimatedPressable>
          );
        })}
      </View>
      <View className="h-2" />
    </PageShell>
  );
}
