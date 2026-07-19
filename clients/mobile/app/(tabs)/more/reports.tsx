import { ArrowDownRight, ArrowUpRight, Download } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { ScreenHeader } from "@/components/ui/screen-header";
import { useBalanceSheet, useIncomeStatement, useNetWorthStatement } from "@/hooks/useReports";
import { formatLKR, formatLKRAbbrev } from "@/lib/format";
import { useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

const TABS = ["Balance Sheet", "Income Stmt", "Net Worth"] as const;
const PERIODS = ["Jul 2026", "Jun 2026", "YTD", "AY 25/26"] as const;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function currentMonthLabel() {
  const d = new Date();
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Maps a period pill to an income-statement date range + a display label. */
function periodRange(period: string): { from: string; to: string; label: string } {
  const now = new Date();
  const y = now.getFullYear();
  if (period === "YTD") return { from: `${y}-01-01`, to: iso(now), label: `${y} YTD` };
  if (period === "AY 25/26") return { from: "2025-04-01", to: "2026-03-31", label: "AY 2025/26" };
  if (period === "Jun 2026" || /^[A-Za-z]{3} \d{4}$/.test(period)) {
    // A specific month pill, e.g. "Jun 2026".
    const [mon, yr] = period.split(" ");
    const m = MONTHS.indexOf(mon);
    if (m >= 0) {
      const yn = Number(yr);
      return { from: iso(new Date(yn, m, 1)), to: iso(new Date(yn, m + 1, 0)), label: period };
    }
  }
  // Default: current month.
  return {
    from: iso(new Date(y, now.getMonth(), 1)),
    to: iso(new Date(y, now.getMonth() + 1, 0)),
    label: currentMonthLabel(),
  };
}

export default function ReportsScreen() {
  const colors = useThemeColors();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Balance Sheet");
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>("Jul 2026");
  const range = periodRange(period);
  const balanceSheet = useBalanceSheet();
  const netWorth = useNetWorthStatement();
  const income = useIncomeStatement(range);

  const trend = netWorth.data?.trend ?? [];
  const nwDelta =
    trend.length >= 2 ? Number(trend[trend.length - 1].net_worth) - Number(trend[trend.length - 2].net_worth) : null;
  const prevLabel = trend.length >= 2 ? MONTHS[new Date(trend[trend.length - 2].date).getMonth()] : "";

  const incomeTotal = income.data ? Object.values(income.data.income).reduce((s, v) => s + Number(v), 0) : 0;
  const expenseTotal = income.data ? Object.values(income.data.expenses).reduce((s, v) => s + Number(v), 0) : 0;
  const saved = income.data ? Number(income.data.net_income) : 0;
  const expensePct = incomeTotal > 0 ? Math.min(100, (expenseTotal / incomeTotal) * 100) : 0;

  return (
    <PageShell>
      <ScreenHeader
        title="Reports"
        back
        trailing={
          <Pressable className="flex-row items-center gap-1.5 rounded-pill border border-foreground/10 bg-foreground/[0.06] px-3.5 py-1.5">
            <Download size={13} color={colors.mutedForeground} strokeWidth={2} />
            <Text className="font-sans-medium text-[12px] text-foreground/50">Export</Text>
          </Pressable>
        }
      />

      <View className="mt-2.5 flex-row gap-1.5 px-4">
        {PERIODS.map((p) => (
          <Pressable
            key={p}
            onPress={() => setPeriod(p)}
            className={cn(
              "rounded-pill px-3.5 py-1",
              period === p ? "bg-salli-accent" : "border border-foreground/[0.08] bg-card",
            )}
          >
            <Text
              className={cn(
                "text-[12px]",
                period === p ? "font-sans-semibold text-white" : "font-sans-medium text-foreground/40",
              )}
            >
              {p}
            </Text>
          </Pressable>
        ))}
      </View>

      <View className="mx-4 mt-1.5 flex-row border-b border-foreground/[0.08]">
        {TABS.map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} className={cn("px-3.5 py-2", tab === t && "border-b-2 border-salli-accent")}>
            <Text className={cn("text-[13px]", tab === t ? "font-sans-semibold text-foreground" : "font-sans-medium text-foreground/35")}>
              {t}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === "Balance Sheet" ? (
        <View className="px-4 pt-2.5">
          <Card className="bg-salli-navy-card p-[18px]">
            <Text className="mb-1.5 text-[11px] font-sans-medium uppercase tracking-wide text-white/50">
              Net Worth Snapshot
            </Text>
            <View className="mb-1 flex-row items-baseline gap-1">
              <Text className="font-sans-semibold text-[18px] text-white/40">Rs.</Text>
              <Text className="font-sans-extrabold text-[40px] leading-none tracking-tighter text-white">
                {balanceSheet.data ? formatLKRAbbrev(balanceSheet.data.net_worth) : "—"}
              </Text>
            </View>
            {nwDelta !== null ? (
              <View className="mb-3.5 flex-row">
                <View
                  className={cn(
                    "flex-row items-center gap-1 rounded-pill border px-2.5 py-0.5",
                    nwDelta >= 0
                      ? "border-salli-accent/20 bg-salli-accent/15"
                      : "border-destructive/20 bg-destructive/10",
                  )}
                >
                  {nwDelta >= 0 ? (
                    <ArrowUpRight size={9} color="#2563EB" strokeWidth={2.5} />
                  ) : (
                    <ArrowDownRight size={9} color="#EF4444" strokeWidth={2.5} />
                  )}
                  <Text className={cn("text-[11px] font-sans-semibold", nwDelta >= 0 ? "text-salli-accent" : "text-destructive")}>
                    {nwDelta >= 0 ? "+" : "−"}Rs. {formatLKRAbbrev(Math.abs(nwDelta))} vs {prevLabel}
                  </Text>
                </View>
              </View>
            ) : (
              <View className="mb-3.5" />
            )}
            <View className="flex-row gap-1.5">
              <View className="flex-1 rounded-control bg-white/[0.06] p-2.5">
                <Text className="mb-1 text-[10px] text-white/35">Assets</Text>
                <Text className="font-sans-bold text-[13px] leading-none text-white">
                  Rs. {balanceSheet.data ? formatLKRAbbrev(balanceSheet.data.total_assets) : "—"}
                </Text>
              </View>
              <View className="flex-1 rounded-control bg-white/[0.06] p-2.5">
                <Text className="mb-1 text-[10px] text-white/35">Liabilities</Text>
                <Text className="font-sans-bold text-[13px] leading-none text-white/60">
                  Rs. {balanceSheet.data ? formatLKRAbbrev(balanceSheet.data.total_liabilities) : "—"}
                </Text>
              </View>
              <View className="flex-1 rounded-control bg-white/[0.06] p-2.5">
                <Text className="mb-1 text-[10px] text-white/35">Equity</Text>
                <Text className="font-sans-bold text-[13px] leading-none text-white/50">
                  Rs. {balanceSheet.data ? formatLKRAbbrev(balanceSheet.data.total_equity) : "—"}
                </Text>
              </View>
            </View>
          </Card>

          <Card className="mt-2.5 p-4">
            <Text className="mb-3 font-sans-semibold text-[13px] text-foreground">
              Income vs Expense · {range.label}
            </Text>
            <View className="gap-2.5">
              <View>
                <View className="mb-1.5 flex-row justify-between">
                  <Text className="text-[12px] text-foreground/50">Income</Text>
                  <Text className="font-sans-semibold text-[12px] text-foreground">Rs. {formatLKRAbbrev(incomeTotal)}</Text>
                </View>
                <View className="h-1.5 overflow-hidden rounded-pill bg-foreground/[0.06]">
                  <View className="h-full rounded-pill bg-salli-accent" style={{ width: incomeTotal > 0 ? "100%" : "0%" }} />
                </View>
              </View>
              <View>
                <View className="mb-1.5 flex-row justify-between">
                  <Text className="text-[12px] text-foreground/50">Expenses</Text>
                  <Text className="font-sans-semibold text-[12px] text-foreground/60">Rs. {formatLKRAbbrev(expenseTotal)}</Text>
                </View>
                <View className="h-1.5 overflow-hidden rounded-pill bg-foreground/[0.06]">
                  <View className="h-full rounded-pill bg-foreground/35" style={{ width: `${expensePct}%` }} />
                </View>
              </View>
              <View className="flex-row justify-between border-t border-foreground/[0.07] pt-2">
                <Text className="text-[12px] font-sans-medium text-foreground/40">Saved this month</Text>
                <Text className="font-sans-bold text-[13px] text-foreground">Rs. {formatLKR(saved, 0)}</Text>
              </View>
            </View>
          </Card>

          {(["assets", "liabilities", "equity"] as const).map((section) => {
            const lines = balanceSheet.data?.[section] ?? [];
            if (lines.length === 0) return null;
            const total =
              section === "assets"
                ? balanceSheet.data?.total_assets
                : section === "liabilities"
                  ? balanceSheet.data?.total_liabilities
                  : balanceSheet.data?.total_equity;
            return (
              <Card key={section} className="mt-2.5 overflow-hidden p-0">
                <View className="border-b border-foreground/[0.06] px-4 py-3">
                  <Text className="font-sans-semibold text-[13px] capitalize text-foreground">{section}</Text>
                </View>
                <View className="px-4">
                  {lines.map((line, i) => (
                    <View key={i} className="flex-row items-center gap-2.5 border-b border-foreground/[0.05] py-2.5">
                      <View className={cn("h-[30px] w-[3px] rounded-pill", i === 0 ? "bg-salli-accent" : "bg-foreground/15")} />
                      <Text className="flex-1 text-[12px] text-foreground/55">
                        {line.code} · {line.name}
                      </Text>
                      <Text className="font-sans-medium text-[12px] text-foreground">
                        Rs. {formatLKR(line.balance, 0)}
                      </Text>
                    </View>
                  ))}
                  {total ? (
                    <View className="flex-row justify-between bg-foreground/[0.02] py-2.5">
                      <Text className="font-sans-semibold text-[12px] capitalize text-foreground/40">Total {section}</Text>
                      <Text className="font-sans-bold text-[13px] text-foreground">Rs. {formatLKR(total, 0)}</Text>
                    </View>
                  ) : null}
                </View>
              </Card>
            );
          })}
        </View>
      ) : tab === "Income Stmt" ? (
        <View className="px-4 pt-2.5">
          <Card className="bg-salli-navy-card p-[18px]">
            <Text className="mb-1.5 text-[11px] font-sans-medium uppercase tracking-wide text-white/50">
              Net Income · {range.label}
            </Text>
            <View className="flex-row items-baseline gap-1">
              <Text className="font-sans-semibold text-[18px] text-white/40">Rs.</Text>
              <Text className="font-sans-extrabold text-[40px] leading-none tracking-tighter text-white">
                {income.data ? formatLKRAbbrev(saved) : "—"}
              </Text>
            </View>
          </Card>

          {(["income", "expenses"] as const).map((section) => {
            const entries = income.data ? Object.entries(income.data[section]) : [];
            if (entries.length === 0) return null;
            const total = section === "income" ? incomeTotal : expenseTotal;
            return (
              <Card key={section} className="mt-2.5 overflow-hidden p-0">
                <View className="border-b border-foreground/[0.06] px-4 py-3">
                  <Text className="font-sans-semibold text-[13px] capitalize text-foreground">{section}</Text>
                </View>
                <View className="px-4">
                  {entries.map(([name, amount], i) => (
                    <View key={i} className="flex-row items-center gap-2.5 border-b border-foreground/[0.05] py-2.5">
                      <View className={cn("h-[30px] w-[3px] rounded-pill", section === "income" ? "bg-salli-accent" : "bg-foreground/15")} />
                      <Text className="flex-1 text-[12px] text-foreground/55">{name}</Text>
                      <Text className="font-sans-medium text-[12px] text-foreground">Rs. {formatLKR(amount, 0)}</Text>
                    </View>
                  ))}
                  <View className="flex-row justify-between bg-foreground/[0.02] py-2.5">
                    <Text className="font-sans-semibold text-[12px] capitalize text-foreground/40">Total {section}</Text>
                    <Text className="font-sans-bold text-[13px] text-foreground">Rs. {formatLKR(total, 0)}</Text>
                  </View>
                </View>
              </Card>
            );
          })}

          {income.data && Object.keys(income.data.income).length === 0 && Object.keys(income.data.expenses).length === 0 ? (
            <Card className="mt-2.5 items-center p-6">
              <Text className="text-[13px] text-foreground/35">No income or expenses this period.</Text>
            </Card>
          ) : null}
        </View>
      ) : (
        <View className="px-4 pt-2.5">
          <Card className="bg-salli-navy-card p-[18px]">
            <Text className="mb-1.5 text-[11px] font-sans-medium uppercase tracking-wide text-white/50">
              Current Net Worth
            </Text>
            <View className="mb-1 flex-row items-baseline gap-1">
              <Text className="font-sans-semibold text-[18px] text-white/40">Rs.</Text>
              <Text className="font-sans-extrabold text-[40px] leading-none tracking-tighter text-white">
                {netWorth.data ? formatLKRAbbrev(netWorth.data.current_net_worth) : "—"}
              </Text>
            </View>
            <Text className="text-[11px] text-white/30">As of {netWorth.data?.as_of ?? "—"}</Text>
          </Card>
          {trend.length === 0 ? (
            <Card className="mt-2.5 items-center p-6">
              <Text className="text-[13px] text-foreground/35">No history yet.</Text>
            </Card>
          ) : (
            <Card className="mt-2.5 overflow-hidden p-0">
              {trend.slice(-12).map((point, i) => (
                <View key={i} className="flex-row justify-between border-b border-foreground/[0.05] px-4 py-2.5">
                  <Text className="text-[12px] text-foreground/50">{point.date}</Text>
                  <Text className="font-sans-medium text-[12px] text-foreground">Rs. {formatLKR(point.net_worth, 0)}</Text>
                </View>
              ))}
            </Card>
          )}
        </View>
      )}
    </PageShell>
  );
}
