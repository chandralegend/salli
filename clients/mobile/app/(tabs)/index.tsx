import { useRouter } from "expo-router";
import { BarChart3, ChevronRight, LayoutGrid, Layers, Plus, Settings } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { VoiceCaptureSheet } from "@/components/VoiceCaptureSheet";
import { TourTarget } from "@/components/tour/TourTarget";
import { AvatarMoreButton } from "@/components/layout/AvatarMoreButton";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { NavSalli } from "@/components/ui/nav-icons";
import { IconButton } from "@/components/ui/icon-button";
import { PageShell } from "@/components/ui/page-shell";
import { useThemedRefreshControl } from "@/components/ui/themed-refresh-control";
import { useDashboard } from "@/hooks/useDashboard";
import { useModeSwitch } from "@/hooks/useModeSwitch";
import { formatLKRAbbrev, formatPct } from "@/lib/format";
import { useSalliStore } from "@/lib/store";
import { useHardShadow, useThemeColors } from "@/lib/theme";

/**
 * Home — a five-block summary, not a dashboard of widgets.
 *
 * This screen used to stack seven things: a net-worth hero, a 2x2 stat grid,
 * an upload/ask row, the affordability card, a monthly-budget card, an accounts
 * list and a recent-entries list. Every one of them was a label above a number,
 * and none of them was the thing you opened the app to find out.
 *
 * It now answers four questions in sentences — what am I worth, what can I
 * still spend, where is my money, how am I doing — and sends everything else to
 * More. The removed sections are not deleted: accounts live in Ledger, recent
 * entries are Ledger's Journal tab, and affordability sits behind More actions.
 * A summary that fits on one screen without scrolling is the point.
 */

/**
 * The most recent net-worth point from a month BEFORE the current one.
 *
 * Not `trend[length - 2]`: the trend can carry several points inside one month,
 * so the previous *point* is usually the same month as today. Comparing against
 * it and then labelling the result "from September" while it is September is
 * both wrong and visibly silly — which is exactly what it did on real data.
 */
function priorMonthPoint(trend: { date: string; net_worth: string }[]) {
  const now = new Date();
  const currentMonth = now.getFullYear() * 12 + now.getMonth();
  for (let i = trend.length - 1; i >= 0; i--) {
    const d = new Date(trend[i].date);
    if (Number.isNaN(d.getTime())) continue;
    if (d.getFullYear() * 12 + d.getMonth() < currentMonth) {
      return { value: Number(trend[i].net_worth), label: d.toLocaleDateString("en-US", { month: "long" }) };
    }
  }
  return null;
}

export default function DashboardScreen() {
  const router = useRouter();
  const { enterBuddy } = useModeSwitch();
  const colors = useThemeColors();
  const shadow = useHardShadow();
  const { netWorth, fiScore, tax, accounts, budgetSummary, balances, refetch } = useDashboard();

  const [captureOpen, setCaptureOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };
  const refreshControl = useThemedRefreshControl(refreshing, onRefresh);

  const requestQuickAddEntry = useSalliStore((s) => s.requestQuickAddEntry);
  /** Tap opens the form, long-press opens voice/free-text capture — the exact
   *  pair the centre "+" tab used to carry, moved here with it. */
  const openNewEntry = (draft?: Parameters<typeof requestQuickAddEntry>[0]) => {
    // The draft goes through the store because the capture sheet produces it
    // asynchronously; the navigation is direct now that new entry is a route
    // rather than a sheet Ledger had to be asked to open.
    requestQuickAddEntry(draft ?? null);
    router.push("/new-entry");
  };

  const currentPeriodLabel = new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" });

  // Auto-start the guided tour once per user, the first time they land here.
  // `tourComplete` defaults to `true` until AsyncStorage resolves (see
  // lib/store.ts), so this only fires once the real stored value comes back
  // false; a short delay lets this screen's targets register their rects first.
  const tourComplete = useSalliStore((s) => s.tourComplete);
  const tourActive = useSalliStore((s) => s.tourActive);
  const startTour = useSalliStore((s) => s.startTour);
  useEffect(() => {
    if (tourComplete || tourActive) return;
    const timer = setTimeout(() => startTour(), 500);
    return () => clearTimeout(timer);
  }, [tourComplete, tourActive, startTour]);

  const prior = priorMonthPoint(netWorth?.trend ?? []);
  const current = netWorth ? Number(netWorth.current_net_worth) : null;
  const momChange =
    prior && prior.value !== 0 && current != null ? (current - prior.value) / prior.value : null;
  // A sentence rather than a signed percentage. "+0.0% vs last mo" was
  // technically accurate and told you nothing. Absent when there is no earlier
  // month to compare against, which is every account's first month — better
  // silent than "No change from last month" on day one.
  const changeSentence =
    momChange == null || !prior
      ? null
      : Math.abs(momChange) < 0.0005
        ? `No change from ${prior.label}.`
        : `${momChange > 0 ? "Up" : "Down"} ${formatPct(Math.abs(momChange))} from ${prior.label}.`;

  // Asset accounts that actually hold something. The unfiltered list counts
  // every seeded asset account — including the zero-balance tax receivables —
  // which on a real chart of accounts read as "Across 11 accounts" for someone
  // with two banks. A count in a sentence has to mean what a person would count.
  const moneyAccounts = accounts.filter(
    (a) => a.type === "asset" && Number(balances[a.id] ?? 0) !== 0,
  );
  const spendLeft = budgetSummary
    ? Number(budgetSummary.total_limit) - Number(budgetSummary.total_actual)
    : null;
  /**
   * Whether the budget being summarised actually covers today.
   *
   * `budgetSummary` is the most recent budget, not necessarily the current
   * month's — the agent, asked about rent, reported "the budget I'm seeing is
   * for August 2026 only" while Home was saying "left to spend this month".
   * Claiming the wrong period is the same failure as the month-over-month
   * figure: a confident sentence about numbers that are not what it says.
   */
  const budgetPeriodLabel = (() => {
    if (!budgetSummary) return null;
    const start = new Date(budgetSummary.period_start);
    const end = new Date(budgetSummary.period_end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    const now = new Date();
    if (now >= start && now <= end) return "this month";
    return `in ${start.toLocaleDateString("en-US", { month: "long" })}`;
  })();

  const spendFraction = budgetSummary
    ? Math.min(1, Number(budgetSummary.total_actual) / Math.max(1, Number(budgetSummary.total_limit)))
    : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <PageShell
        refreshControl={refreshControl}
        header={
          <View className="flex-row items-center gap-3 px-4 pt-1">
            {/* The TourTarget rides along with the button it spotlights — the
                tour measures this element's on-screen position. */}
            <TourTarget id="dashboard-avatar">
              <AvatarMoreButton />
            </TourTarget>
            <View className="flex-1 flex-row items-center justify-center">
              <Text className="font-sans-bold text-[18px] text-foreground">{currentPeriodLabel}</Text>
            </View>
            {/* One trailing control, not two. Reminders moved to the More hub,
                which already lists it with its own overdue badge. */}
            <IconButton
              icon={Settings}
              onPress={() => router.push("/(tabs)/more/settings")}
              accessibilityLabel="Settings"
            />
          </View>
        }
      >
        {/* ── What you're worth ─────────────────────────────────────────── */}
        <View className="px-5 pt-3">
          {/* Two explicit lines, as the mockup renders it. There it comes from
              `text-wrap: balance` over a non-breaking "Rs.&nbsp;84.4L", which
              React Native has no equivalent for — left to itself RN fits the
              whole sentence on one line and the figure stops being the thing
              you see first. Breaking it by hand keeps the number at the start
              of its own line at any width. */}
          <Text className="font-sans text-[29px] leading-[34px] tracking-tight text-foreground">
            You&rsquo;ve built
          </Text>
          <Text className="font-sans text-[29px] leading-[34px] tracking-tight text-foreground">
            <Text className="font-sans-extrabold">
              Rs. {netWorth ? formatLKRAbbrev(netWorth.current_net_worth) : "—"}
            </Text>{" "}
            so far.
          </Text>
          {changeSentence ? (
            <Text className="mt-2 text-[16px] text-muted-foreground">{changeSentence}</Text>
          ) : null}
        </View>

        <View className="mx-5 my-5 h-px bg-foreground/15" />

        {/* ── What you can still spend ──────────────────────────────────── */}
        <View className="px-5">
          {budgetSummary && spendLeft != null ? (
            <AnimatedPressable onPress={() => router.push("/(tabs)/more/budget")}>
              <Text className="font-sans text-[20px] leading-[26px] tracking-tight text-foreground">
                You still have{" "}
                <Text className="font-sans-extrabold">Rs. {formatLKRAbbrev(spendLeft)}</Text> left to
                spend {budgetPeriodLabel ?? "this month"}.
              </Text>
              <View className="mt-4 h-[11px] overflow-hidden rounded-pill bg-foreground/20">
                <View
                  className="h-full rounded-pill bg-salli-accent"
                  style={{ width: `${Math.round(spendFraction * 100)}%` }}
                />
              </View>
              <Text className="mt-2.5 text-[14px] text-muted-foreground">
                <Text className="font-sans-bold text-foreground">
                  Rs. {formatLKRAbbrev(budgetSummary.total_actual)}
                </Text>{" "}
                spent of Rs. {formatLKRAbbrev(budgetSummary.total_limit)}
              </Text>
            </AnimatedPressable>
          ) : (
            <AnimatedPressable onPress={() => router.push("/(tabs)/more/budget")}>
              <Text className="font-sans text-[20px] leading-[26px] tracking-tight text-foreground">
                You haven&rsquo;t set a spending limit yet.
              </Text>
              <Text className="mt-2 text-[16px] text-muted-foreground">
                Set one and this is where it tracks.
              </Text>
            </AnimatedPressable>
          )}
        </View>

        <View className="mx-5 my-5 h-px bg-foreground/15" />

        {/* ── What you can do ───────────────────────────────────────────── */}
        <View className="gap-3 px-5">
          <View className="flex-row gap-3">
            <TourTarget id="dashboard-quickadd" className="flex-1">
              <AnimatedPressable
                onPress={() => openNewEntry()}
                onLongPress={() => setCaptureOpen(true)}
                press="sink"
                haptic="light"
                accessibilityLabel="Add an entry. Long-press to speak or type free-form."
                className="h-[52px] flex-row items-center justify-center gap-2 rounded-card border-2 border-foreground bg-card"
                style={shadow}
              >
                <Plus size={20} color={colors.accent} strokeWidth={2.6} />
                <Text className="font-sans-bold text-[17px] text-foreground">Add</Text>
              </AnimatedPressable>
            </TourTarget>
            <AnimatedPressable
              onPress={enterBuddy}
              press="sink"
              haptic="light"
              className="h-[52px] flex-1 flex-row items-center justify-center gap-2 rounded-card border-2 border-foreground bg-salli-ai"
              style={shadow}
            >
              {/* Black on lavender, not `foreground`: the lavender is
                  theme-invariant, so white text would vanish on it in dark. */}
              <NavSalli size={19} color="#000000" strokeWidth={2} />
              <Text className="font-sans-bold text-[17px]" style={{ color: "#000000" }}>
                Ask Salli
              </Text>
            </AnimatedPressable>
          </View>
          <AnimatedPressable
            onPress={() => router.push("/(tabs)/more")}
            press="sink"
            className="h-[52px] flex-row items-center gap-2.5 rounded-card border-2 border-foreground bg-card px-4"
            style={shadow}
          >
            <LayoutGrid size={19} color={colors.foreground} strokeWidth={2} />
            <Text className="flex-1 font-sans-bold text-[17px] text-foreground">More actions</Text>
            <ChevronRight size={18} color={colors.mutedForeground} strokeWidth={2.2} />
          </AnimatedPressable>
        </View>

        <View className="mx-5 my-5 h-px bg-foreground/15" />

        {/* ── Where it is, and how you're doing ─────────────────────────── */}
        <AnimatedPressable
          onPress={() => router.push("/(tabs)/ledger")}
          className="flex-row items-center gap-3.5 px-5 py-3"
        >
          <Layers size={25} color={colors.foreground} strokeWidth={1.9} />
          <Text className="flex-1 font-sans text-[20px] leading-[26px] tracking-tight text-foreground">
            Across {moneyAccounts.length}{" "}
            {moneyAccounts.length === 1 ? "account" : "accounts"}, you have{" "}
            <Text className="font-sans-extrabold">
              Rs.{" "}
              {formatLKRAbbrev(
                moneyAccounts.reduce((sum, a) => sum + Number(balances[a.id] ?? 0), 0),
              )}
            </Text>
            .
          </Text>
          <ChevronRight size={18} color={colors.mutedForeground} strokeWidth={2.2} />
        </AnimatedPressable>

        <View className="flex-row items-center gap-3.5 px-5 py-3">
          <BarChart3 size={25} color={colors.foreground} strokeWidth={1.9} />
          <View className="flex-1">
            <TourTarget id="dashboard-freedom-tile">
              <AnimatedPressable onPress={() => router.push("/(tabs)/financial-independence")}>
                <Text className="font-sans text-[20px] leading-[26px] tracking-tight text-foreground">
                  Your Freedom score is{" "}
                  <Text className="font-sans-extrabold">
                    {fiScore ? `${Number(fiScore.overall_score).toFixed(0)}/100` : "—"}
                  </Text>
                  .
                </Text>
              </AnimatedPressable>
            </TourTarget>
            {/* The tax figure is its own target and its own tap: the tour has a
                step for it, and it is the one number on this screen people go
                looking for. */}
            <TourTarget id="dashboard-tax-tile">
              <AnimatedPressable
                onPress={() => router.push("/(tabs)/more/tax")}
                className="mt-1 self-start"
              >
                <Text className="text-[14px] text-muted-foreground">
                  Estimated tax is{" "}
                  <Text className="font-sans-bold text-foreground underline">
                    Rs. {tax ? formatLKRAbbrev(tax.tax_payable) : "—"}
                  </Text>
                  .
                </Text>
              </AnimatedPressable>
            </TourTarget>
          </View>
          <ChevronRight size={18} color={colors.mutedForeground} strokeWidth={2.2} />
        </View>

        <View style={{ height: 16 }} />
      </PageShell>

      <VoiceCaptureSheet
        visible={captureOpen}
        onClose={() => setCaptureOpen(false)}
        onDraft={(draft) => {
          setCaptureOpen(false);
          openNewEntry(draft);
        }}
      />
    </View>
  );
}
