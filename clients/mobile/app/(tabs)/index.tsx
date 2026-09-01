import { useRouter } from "expo-router";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  ChevronRight,
  Settings,
  Sparkles,
  Upload,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { AccountDetailModal } from "@/components/AccountDetailModal";
import { AffordabilityCard } from "@/components/AffordabilityCard";
import { EntryDetailSheet } from "@/components/EntryDetailSheet";
import { TourTarget } from "@/components/tour/TourTarget";
import { AvatarMoreButton } from "@/components/layout/AvatarMoreButton";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { Card } from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";
import { PageShell } from "@/components/ui/page-shell";
import { useThemedRefreshControl } from "@/components/ui/themed-refresh-control";
import type { JournalEntry } from "@/hooks/useDashboard";
import { useDashboard } from "@/hooks/useDashboard";
import { useLedgerMutations } from "@/hooks/useLedger";
import { useModeSwitch } from "@/hooks/useModeSwitch";
import { formatLKR, formatLKRAbbrev, formatPct } from "@/lib/format";
import { useSalliStore } from "@/lib/store";
import { useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

export default function DashboardScreen() {
  const router = useRouter();
  const { enterBuddy } = useModeSwitch();
  const colors = useThemeColors();
  const { netWorth, fiScore, tax, accounts, entries, budgetSummary, balances, incomeYtd, expensesYtd, refetch } =
    useDashboard();
  const { reverseEntry } = useLedgerMutations();

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };
  const refreshControl = useThemedRefreshControl(refreshing, onRefresh);

  // Today's month/year — a static label matching web's dashboard subtitle
  // (there's no historical month picker on either platform yet: every figure
  // here is "latest", not queryable by an arbitrary past period).
  const currentPeriodLabel = new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" });

  // Auto-start the guided tour once per user, the first time they land here —
  // the direct mobile equivalent of web's first-/dashboard-visit trigger.
  // `tourComplete` defaults to `true` until AsyncStorage resolves (see
  // lib/store.ts), so this only fires once the real stored value comes back
  // false; a short delay lets this screen's cards register their rects first.
  const tourComplete = useSalliStore((s) => s.tourComplete);
  const tourActive = useSalliStore((s) => s.tourActive);
  const startTour = useSalliStore((s) => s.startTour);
  useEffect(() => {
    if (tourComplete || tourActive) return;
    const timer = setTimeout(() => startTour(), 500);
    return () => clearTimeout(timer);
  }, [tourComplete, tourActive, startTour]);

  // Dashboard "Accounts" = your real-world money accounts (assets), the biggest
  // balances first. Non-money ledger accounts (income/expense/equity) are excluded.
  const topAccounts = accounts
    .filter((a) => a.type === "asset")
    .sort((a, b) => Number(balances[b.id] ?? 0) - Number(balances[a.id] ?? 0))
    .slice(0, 4);

  const trend = netWorth?.trend ?? [];
  const prevNetWorth = trend.length >= 2 ? Number(trend[trend.length - 2].net_worth) : null;
  const curNetWorth = trend.length >= 1 ? Number(trend[trend.length - 1].net_worth) : null;
  const momChange =
    prevNetWorth && prevNetWorth !== 0 && curNetWorth != null
      ? (curNetWorth - prevNetWorth) / prevNetWorth
      : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <PageShell
        transparent
        refreshControl={refreshControl}
        header={
          <View className="flex-row items-center px-4 pt-1">
            {/* Fixed-width gutters (matching the icon group's width) so the
                centered date is centered on the whole row, not just the
                leftover space next to the single avatar button. */}
            <View style={{ width: 80 }} className="items-start">
              {/* The TourTarget rides along with the button it spotlights — the
                  tour measures this element's on-screen position. */}
              <TourTarget id="dashboard-avatar">
                <AvatarMoreButton initial="D" />
              </TourTarget>
            </View>
            <View className="flex-1 flex-row items-center justify-center gap-2.5">
              <Text className="font-sans-semibold text-[14px] text-foreground">{currentPeriodLabel}</Text>
            </View>
            <View className="flex-row gap-2">
              <IconButton
                icon={Bell}
                onPress={() => router.push("/(tabs)/more/reminders")}
                accessibilityLabel="Reminders"
              />
              <IconButton
                icon={Settings}
                onPress={() => router.push("/(tabs)/more/settings")}
                accessibilityLabel="Settings"
              />
            </View>
          </View>
        }
      >
        <View className="items-center px-6 pb-5 pt-4">
          <Text className="mb-1.5 text-[12px] font-sans-medium uppercase tracking-wide text-foreground/45">
            Net Worth
          </Text>
          <View className="flex-row items-baseline gap-1">
            <Text className="font-sans-bold text-[24px] tracking-tight text-foreground/45">Rs.</Text>
            <Text className="font-sans-extrabold text-[52px] tracking-tighter text-foreground">
              {netWorth ? formatLKRAbbrev(netWorth.current_net_worth) : "—"}
            </Text>
          </View>
          {momChange != null ? (
            <View className="mt-2.5 flex-row items-center gap-1.5 rounded-pill border border-foreground/10 bg-foreground/[0.08] px-3 py-1">
              <ArrowUpRight size={9} color={colors.foreground} strokeWidth={2.5} />
              <Text className="font-sans-semibold text-[11px] text-foreground/70">
                {momChange >= 0 ? "+" : ""}
                {formatPct(momChange)} vs last mo
              </Text>
            </View>
          ) : null}
        </View>

        {/* One coherent 2x2 section (not four unrelated widgets) — same
            waffle-grid technique as the Monthly Budget card below: an outer
            hairline-background container with 1px gaps between flat cells,
            rather than four individually-bordered tiles. */}
        <View className="px-4 pb-3.5">
          <View className="overflow-hidden rounded-[10px] bg-foreground/[0.06]" style={{ gap: 1 }}>
            <View className="flex-row" style={{ gap: 1 }}>
              <View className="flex-1 bg-card p-4">
                <Text className="mb-1 text-[10px] font-sans-medium uppercase tracking-wide text-foreground/40">
                  Income
                </Text>
                <Text className="text-[24px] font-sans-bold tracking-tight text-foreground">
                  {incomeYtd != null ? formatLKRAbbrev(incomeYtd) : "—"}
                </Text>
                <Text className="mt-0.5 text-[10px] font-sans text-foreground/20">YTD</Text>
              </View>
              <View className="flex-1 bg-card p-4">
                <Text className="mb-1 text-[10px] font-sans-medium uppercase tracking-wide text-foreground/40">
                  Expenses
                </Text>
                <Text className="text-[24px] font-sans-bold tracking-tight text-foreground/70">
                  {expensesYtd != null ? formatLKRAbbrev(expensesYtd) : "—"}
                </Text>
                <Text className="mt-0.5 text-[10px] font-sans text-foreground/20">YTD</Text>
              </View>
            </View>
            <View className="flex-row" style={{ gap: 1 }}>
              <TourTarget id="dashboard-tax-tile" className="flex-1">
                <View className="bg-card p-4">
                  <Text className="mb-1 text-[10px] font-sans-medium uppercase tracking-wide text-foreground/40">
                    Tax
                  </Text>
                  <Text className="text-[24px] font-sans-bold tracking-tight text-foreground">
                    {tax ? formatLKRAbbrev(tax.tax_payable) : "—"}
                  </Text>
                  <Text className="mt-0.5 text-[10px] font-sans text-foreground/20">AY 25/26</Text>
                </View>
              </TourTarget>
              <TourTarget id="dashboard-freedom-tile" className="flex-1">
                <View className="bg-card p-4">
                  <Text className="mb-1 text-[10px] font-sans-medium uppercase tracking-wide text-foreground/40">
                    Freedom Score
                  </Text>
                  {fiScore ? (
                    <Text className="text-[24px] font-sans-bold tracking-tight text-foreground">
                      {Number(fiScore.overall_score).toFixed(0)}
                      <Text className="font-sans text-[12px] text-foreground/30">/100</Text>
                    </Text>
                  ) : (
                    <Text className="text-[24px] font-sans-bold tracking-tight text-foreground">—</Text>
                  )}
                  <Text className="mt-0.5 text-[10px] font-sans text-foreground/20">
                    {fiScore ? `Grade ${fiScore.grade}` : ""}
                  </Text>
                </View>
              </TourTarget>
            </View>
          </View>
        </View>

        <View className="flex-row gap-2 px-4 pb-3.5">
          <AnimatedPressable
            onPress={() => router.push("/(tabs)/more/statements")}
            className="h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-control border border-foreground/10 bg-card"
          >
            <Upload size={13} color={colors.mutedForeground} strokeWidth={2} />
            <Text className="font-sans-medium text-[11px] text-foreground/70">Upload</Text>
          </AnimatedPressable>
          <AnimatedPressable
            onPress={enterBuddy}
            haptic="light"
            className="h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-control bg-salli-accent"
          >
            <Sparkles size={13} color="rgba(255,255,255,0.8)" strokeWidth={1.8} />
            <Text className="font-sans-semibold text-[11px] text-white">Ask Salli AI</Text>
          </AnimatedPressable>
        </View>

        <AffordabilityCard />

        {budgetSummary ? (
          <AnimatedPressable onPress={() => router.push("/(tabs)/more/budget")}>
            <Card className="mx-4 mb-3.5 p-3.5">
              <View className="mb-2.5 flex-row items-center justify-between">
                <Text className="font-sans-semibold text-[14px] text-foreground">Monthly Budget</Text>
                <View className="flex-row items-center gap-1">
                  <Text className="text-[12px] text-foreground/30">Jul 2026</Text>
                  <ChevronRight size={14} color={colors.mutedForeground} strokeWidth={2} />
                </View>
              </View>
            <View className="flex-row overflow-hidden rounded-[8px] bg-foreground/[0.06]" style={{ gap: 1 }}>
              <View className="flex-1 bg-muted px-3 py-2.5">
                <Text className="mb-1 text-[10px] font-sans-medium tracking-wide text-foreground/35">SPENT</Text>
                <Text className="font-sans-bold text-[15px] tracking-tight text-foreground">
                  Rs. {formatLKRAbbrev(budgetSummary.total_actual)}
                </Text>
              </View>
              <View className="flex-1 bg-muted px-3 py-2.5">
                <Text className="mb-1 text-[10px] font-sans-medium tracking-wide text-foreground/35">LEFT</Text>
                <Text className="font-sans-bold text-[15px] tracking-tight text-foreground">
                  Rs.{" "}
                  {formatLKRAbbrev(Number(budgetSummary.total_limit) - Number(budgetSummary.total_actual))}
                </Text>
              </View>
              <View className="flex-1 bg-muted px-3 py-2.5">
                <Text className="mb-1 text-[10px] font-sans-medium tracking-wide text-foreground/35">LIMIT</Text>
                <Text className="font-sans-bold text-[15px] tracking-tight text-foreground/40">
                  Rs. {formatLKRAbbrev(budgetSummary.total_limit)}
                </Text>
              </View>
            </View>
            </Card>
          </AnimatedPressable>
        ) : null}

        <View className="px-4 pb-3">
          <View className="mb-2.5 flex-row items-center justify-between">
            <Text className="font-sans-semibold text-[15px] text-foreground">Accounts</Text>
            <AnimatedPressable onPress={() => router.push("/(tabs)/ledger")} hitSlop={8}>
              <Text className="font-sans-medium text-[13px] text-salli-accent">See all</Text>
            </AnimatedPressable>
          </View>
          {topAccounts.length > 0 ? (
            <View className="gap-2">
              {topAccounts.map((acc) => (
                <AnimatedPressable key={acc.id} onPress={() => setSelectedAccountId(acc.id)}>
                  <Card className="flex-row items-center gap-3 rounded-[10px] border-foreground/[0.08] p-3.5">
                    <View className="h-10 w-10 items-center justify-center rounded-[8px] bg-salli-accent">
                      <Text className="font-sans-bold text-[16px] text-white">{acc.name.charAt(0)}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="font-sans-semibold text-[14px] text-foreground">{acc.name}</Text>
                      <Text className="text-[12px] capitalize text-foreground/35">
                        {acc.type} · {acc.currency}
                      </Text>
                    </View>
                    {balances[acc.id] != null ? (
                      <Text className="font-sans-semibold text-[14px] text-foreground">
                        Rs. {formatLKRAbbrev(balances[acc.id])}
                      </Text>
                    ) : null}
                    <ChevronRight size={16} color={colors.mutedForeground} strokeWidth={2} />
                  </Card>
                </AnimatedPressable>
              ))}
            </View>
          ) : (
            <Card className="items-center p-5">
              <Text className="text-[13px] text-foreground/35">No accounts yet.</Text>
            </Card>
          )}
        </View>

        <View className="px-4">
          <View className="mb-2.5 flex-row items-center justify-between">
            <Text className="font-sans-semibold text-[15px] text-foreground">Recent Entries</Text>
            <AnimatedPressable onPress={() => router.push("/(tabs)/ledger")} hitSlop={8}>
              <Text className="font-sans-medium text-[13px] text-salli-accent">See all</Text>
            </AnimatedPressable>
          </View>
          {entries.length === 0 ? (
            <Card className="items-center p-5">
              <Text className="text-[13px] text-foreground/35">
                No transactions yet — upload a statement to get started.
              </Text>
            </Card>
          ) : (
            <View className="gap-2">
              {entries.map((entry) => {
                const debit = entry.postings.find((p) => p.direction === 1);
                const credit = entry.postings.find((p) => p.direction === -1);
                const debitAcc = accounts.find((a) => a.id === debit?.account_id);
                const creditAcc = accounts.find((a) => a.id === credit?.account_id);
                const isIncome = debitAcc?.type === "asset" && creditAcc?.type === "income";
                const EntryIcon = isIncome ? ArrowDownLeft : ArrowUpRight;
                return (
                  <AnimatedPressable key={entry.id} onPress={() => setSelectedEntry(entry)}>
                  <Card
                    className="flex-row items-center gap-2.5 rounded-[10px] border-foreground/[0.08] p-3"
                  >
                    <View className="h-[38px] w-[38px] items-center justify-center rounded-[8px] bg-foreground/[0.06]">
                      <EntryIcon
                        size={17}
                        color={isIncome ? colors.accent : colors.mutedForeground}
                        strokeWidth={2}
                      />
                    </View>
                    <View className="flex-1">
                      <Text numberOfLines={1} className="font-sans-semibold text-[13px] text-foreground">
                        {entry.description}
                      </Text>
                      <Text numberOfLines={1} className="text-[11px] text-foreground/30">
                        {isIncome ? "Income" : "Expense"} · {entry.entry_date}
                      </Text>
                    </View>
                    <Text className={cn("font-sans-bold text-[14px]", isIncome ? "text-foreground" : "text-foreground/50")}>
                      {isIncome ? "+" : "−"}Rs. {formatLKR(debit?.amount ?? "0", 0)}
                    </Text>
                  </Card>
                  </AnimatedPressable>
                );
              })}
            </View>
          )}
        </View>
      </PageShell>

      <AccountDetailModal
        visible={selectedAccountId !== null}
        accountId={selectedAccountId}
        onClose={() => setSelectedAccountId(null)}
      />
      <EntryDetailSheet
        entry={selectedEntry}
        accounts={accounts}
        onReverse={(id) => reverseEntry(id)}
        onClose={() => setSelectedEntry(null)}
      />
    </View>
  );
}
