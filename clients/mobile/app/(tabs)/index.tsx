import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  ChevronLeft,
  ChevronRight,
  PiggyBank,
  Plus,
  Settings,
  Upload,
} from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AvatarMoreButton } from "@/components/layout/AvatarMoreButton";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { StatTile } from "@/components/ui/stat-tile";
import { useDashboard } from "@/hooks/useDashboard";
import { formatLKR, formatLKRAbbrev, formatPct } from "@/lib/format";
import { useThemeColors } from "@/lib/theme";
import { useSalliStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function DashboardScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { netWorth, fiScore, tax, accounts, entries, budgetSummary, balances, incomeYtd, expensesYtd } =
    useDashboard();
  const requestQuickAddEntry = useSalliStore((s) => s.requestQuickAddEntry);

  const topAccount = accounts.find((a) => a.type === "asset");
  const topAccountBalance = topAccount ? balances[topAccount.id] : undefined;

  const trend = netWorth?.trend ?? [];
  const prevNetWorth = trend.length >= 2 ? Number(trend[trend.length - 2].net_worth) : null;
  const curNetWorth = trend.length >= 1 ? Number(trend[trend.length - 1].net_worth) : null;
  const momChange =
    prevNetWorth && prevNetWorth !== 0 && curNetWorth != null
      ? (curNetWorth - prevNetWorth) / prevNetWorth
      : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient
        colors={["#0B20E0", "#0912B0", "#060A6A", "#020518", "#000000"]}
        locations={[0, 0.28, 0.52, 0.78, 1]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 400 }}
      />
      <PageShell transparent contentContainerStyle={{ paddingTop: insets.top }}>
        <View className="flex-row items-center px-4 pt-2">
          <AvatarMoreButton initial="D" />
          <View className="flex-1 flex-row items-center justify-center gap-2.5">
            <ChevronLeft size={14} color="rgba(255,255,255,0.4)" strokeWidth={2} />
            <Text className="font-sans-semibold text-[14px] text-white">Jul 2026</Text>
            <ChevronRight size={14} color="rgba(255,255,255,0.4)" strokeWidth={2} />
          </View>
          <View className="flex-row gap-2">
            <Pressable className="h-9 w-9 items-center justify-center rounded-full bg-white/10">
              <Bell size={16} color="#FFFFFF" strokeWidth={2} />
            </Pressable>
            <Pressable
              onPress={() => router.push("/(tabs)/more/settings")}
              className="h-9 w-9 items-center justify-center rounded-full bg-white/10"
            >
              <Settings size={16} color="#FFFFFF" strokeWidth={2} />
            </Pressable>
          </View>
        </View>

        <View className="items-center px-6 pb-5 pt-4">
          <Text className="mb-1.5 text-[12px] font-sans-medium uppercase tracking-wide text-white/45">
            Net Worth
          </Text>
          <View className="flex-row items-baseline gap-1">
            <Text className="font-sans-bold text-[24px] tracking-tight text-white/45">Rs.</Text>
            <Text className="font-sans-extrabold text-[52px] tracking-tighter text-white">
              {netWorth ? formatLKRAbbrev(netWorth.current_net_worth) : "—"}
            </Text>
          </View>
          {momChange != null ? (
            <View className="mt-2.5 flex-row items-center gap-1.5 rounded-pill border border-white/10 bg-white/[0.08] px-3 py-1">
              <ArrowUpRight size={9} color="rgba(255,255,255,0.7)" strokeWidth={2.5} />
              <Text className="font-sans-semibold text-[11px] text-white/70">
                {momChange >= 0 ? "+" : ""}
                {formatPct(momChange)} vs last mo
              </Text>
            </View>
          ) : null}
        </View>

        <View className="flex-row gap-1.5 px-3.5 pb-3.5">
          <StatTile
            onDark
            label="Income"
            value={incomeYtd != null ? formatLKRAbbrev(incomeYtd) : "—"}
            hint="YTD"
            className="flex-1"
          />
          <StatTile
            onDark
            label="Expenses"
            value={expensesYtd != null ? formatLKRAbbrev(expensesYtd) : "—"}
            hint="YTD"
            valueClassName="text-white/70"
            className="flex-1"
          />
          <StatTile
            onDark
            label="Tax"
            value={tax ? formatLKRAbbrev(tax.tax_payable) : "—"}
            hint="AY 25/26"
            className="flex-1"
          />
          <StatTile
            onDark
            label="FI Score"
            value={
              fiScore ? (
                <Text className="font-sans-bold text-[14px] text-white">
                  {Number(fiScore.overall_score).toFixed(0)}
                  <Text className="font-sans text-[10px] text-white/30">/100</Text>
                </Text>
              ) : (
                "—"
              )
            }
            hint={fiScore ? `Grade ${fiScore.grade}` : undefined}
            className="flex-1"
          />
        </View>

        <View className="flex-row gap-2 px-4 pb-3.5">
          <Pressable className="h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-control border border-white/10 bg-white/[0.08]">
            <Upload size={13} color="rgba(255,255,255,0.6)" strokeWidth={2} />
            <Text className="font-sans-medium text-[11px] text-white/60">Upload</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              requestQuickAddEntry();
              router.push("/(tabs)/ledger");
            }}
            className="h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-control border border-white/10 bg-white/[0.08]"
          >
            <Plus size={13} color="rgba(255,255,255,0.6)" strokeWidth={2.5} />
            <Text className="font-sans-medium text-[11px] text-white/60">New Entry</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/(tabs)/agent")}
            className="h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-control bg-salli-accent"
          >
            <PiggyBank size={13} color="rgba(255,255,255,0.8)" strokeWidth={1.8} />
            <Text className="font-sans-semibold text-[11px] text-white">Ask Scrooge</Text>
          </Pressable>
        </View>

        {budgetSummary ? (
          <Card className="mx-4 mb-3.5 p-3.5">
            <View className="mb-2.5 flex-row items-center justify-between">
              <Text className="font-sans-semibold text-[14px] text-foreground">Monthly Budget</Text>
              <Text className="text-[12px] text-foreground/30">Jul 2026</Text>
            </View>
            <View className="flex-row overflow-hidden rounded-[12px] bg-foreground/[0.06]" style={{ gap: 1 }}>
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
        ) : null}

        <View className="px-4 pb-3">
          <View className="mb-2.5 flex-row items-center justify-between">
            <Text className="font-sans-semibold text-[15px] text-foreground">Accounts</Text>
            <Pressable onPress={() => router.push("/(tabs)/ledger")}>
              <Text className="font-sans-medium text-[13px] text-salli-accent">See all</Text>
            </Pressable>
          </View>
          {topAccount ? (
            <Card className="flex-row items-center gap-3 rounded-[16px] border-foreground/[0.08] p-3.5">
              <View className="h-10 w-10 items-center justify-center rounded-[12px] bg-salli-accent">
                <Text className="font-sans-bold text-[16px] text-white">{topAccount.name.charAt(0)}</Text>
              </View>
              <View className="flex-1">
                <Text className="font-sans-semibold text-[14px] text-foreground">{topAccount.name}</Text>
                <Text className="text-[12px] capitalize text-foreground/35">
                  {topAccount.type} · {topAccount.currency}
                </Text>
              </View>
              {topAccountBalance != null ? (
                <Text className="font-sans-semibold text-[14px] text-foreground">
                  Rs. {formatLKRAbbrev(topAccountBalance)}
                </Text>
              ) : null}
            </Card>
          ) : (
            <Card className="items-center p-5">
              <Text className="text-[13px] text-foreground/35">No accounts yet.</Text>
            </Card>
          )}
        </View>

        <View className="px-4">
          <View className="mb-2.5 flex-row items-center justify-between">
            <Text className="font-sans-semibold text-[15px] text-foreground">Recent Entries</Text>
            <Pressable onPress={() => router.push("/(tabs)/ledger")}>
              <Text className="font-sans-medium text-[13px] text-salli-accent">See all</Text>
            </Pressable>
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
                  <Card
                    key={entry.id}
                    className="flex-row items-center gap-2.5 rounded-[16px] border-foreground/[0.08] p-3"
                  >
                    <View className="h-[38px] w-[38px] items-center justify-center rounded-[12px] bg-foreground/[0.06]">
                      <EntryIcon
                        size={17}
                        color={isIncome ? "#FFFFFF" : "rgba(255,255,255,0.5)"}
                        strokeWidth={2}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="font-sans-semibold text-[13px] text-foreground">{entry.description}</Text>
                      <Text className="text-[11px] text-foreground/30">
                        {isIncome ? "Income" : "Expense"} · {entry.entry_date}
                      </Text>
                    </View>
                    <Text className={cn("font-sans-bold text-[14px]", isIncome ? "text-foreground" : "text-foreground/50")}>
                      {isIncome ? "+" : "−"}Rs. {formatLKR(debit?.amount ?? "0", 0)}
                    </Text>
                  </Card>
                );
              })}
            </View>
          )}
        </View>
      </PageShell>
    </View>
  );
}
