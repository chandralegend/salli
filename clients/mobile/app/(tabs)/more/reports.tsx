import { ArrowDownRight, ArrowUpRight, Download } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import Svg, { Polygon, Polyline } from "react-native-svg";

import { Card } from "@/components/ui/card";
import { FilterChip } from "@/components/ui/filter-chip";
import { PageShell } from "@/components/ui/page-shell";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Tabs } from "@/components/ui/tabs";
import {
  exportReportCsv,
  type ExportableReport,
  useBalanceSheet,
  useIncomeStatement,
  useNetWorthStatement,
} from "@/hooks/useReports";
import { formatLKR, formatLKRAbbrev } from "@/lib/format";
import { useThemeColors } from "@/lib/theme";
import { useToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const TABS = ["Balance Sheet", "Income Stmt", "Net Worth"] as const;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthYearLabel(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function currentMonthLabel(): string {
  return monthYearLabel(new Date());
}

function lastMonthLabel(): string {
  const d = new Date();
  return monthYearLabel(new Date(d.getFullYear(), d.getMonth() - 1, 1));
}

// Computed once at module load — the first two pills are always the real
// current/previous month, never a stale hardcoded date.
const PERIODS = [currentMonthLabel(), lastMonthLabel(), "YTD", "AY 25/26"] as const;

/** "2026-07-15T…" → "Jul 2026". Falls back to the raw string if unparseable. */
function monthLabel(isoDate: string): string {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return monthYearLabel(d);
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Maps a period pill to an income-statement date range + a display label. */
function periodRange(period: string): { from: string; to: string; label: string } {
  const now = new Date();
  const y = now.getFullYear();
  if (period === "YTD") return { from: `${y}-01-01`, to: iso(now), label: `${y} YTD` };
  if (period === "AY 25/26") return { from: "2025-04-01", to: "2026-03-31", label: "AY 2025/26" };
  if (/^[A-Za-z]{3} \d{4}$/.test(period)) {
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

/** Net-worth trend line + area fill (mockup's Net Worth hero chart). */
function TrendChart({ values }: { values: number[] }) {
  const colors = useThemeColors();
  const W = 320;
  const H = 70;
  const pad = 8;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const n = values.length;
  const x = (i: number) => (n <= 1 ? W : (i / (n - 1)) * W);
  const y = (v: number) => H - pad - ((v - min) / span) * (H - pad * 2);
  const line = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} ${W},${H} 0,${H}`;
  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <Polygon points={area} fill={`${colors.accent}1F`} stroke="none" />
      <Polyline points={line} fill="none" stroke={colors.accent} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function ReportsScreen() {
  const colors = useThemeColors();
  const showToast = useToast();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Balance Sheet");
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>(PERIODS[0]);
  const [exporting, setExporting] = useState(false);
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

  // Net-worth trend, chronological, capped to the last 12 months for the chart/list.
  const trendChron = trend.slice(-12);
  const trendValues = trendChron.map((p) => Number(p.net_worth));
  // Year-over-year: latest vs the earliest point that is ≥ ~1 year older.
  const latestPoint = trend.length > 0 ? trend[trend.length - 1] : null;
  let yoyPct: number | null = null;
  if (latestPoint) {
    const latestVal = Number(latestPoint.net_worth);
    const latestTime = new Date(latestPoint.date).getTime();
    const yearAgo = trend.find((p) => latestTime - new Date(p.date).getTime() >= 330 * 864e5);
    if (yearAgo && Number(yearAgo.net_worth) !== 0) {
      yoyPct = ((latestVal - Number(yearAgo.net_worth)) / Math.abs(Number(yearAgo.net_worth))) * 100;
    }
  }

  // Which server-side CSV report the current tab maps to (Income Stmt has none).
  const exportType: ExportableReport | null =
    tab === "Balance Sheet" ? "balance-sheet" : tab === "Net Worth" ? "net-worth" : null;

  async function handleExport() {
    if (!exportType || exporting) return;
    setExporting(true);
    try {
      await exportReportCsv(exportType);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Could not export this report.", "error");
    } finally {
      setExporting(false);
    }
  }

  return (
    <PageShell
      animateOn={tab}
      header={
        <ScreenHeader
          title="Reports"
          back
          trailing={
            <Pressable
              onPress={handleExport}
              disabled={!exportType || exporting}
              className={cn(
                "flex-row items-center gap-1.5 rounded-pill border border-foreground/10 bg-foreground/[0.06] px-3.5 py-1.5",
                !exportType && "opacity-40",
              )}
            >
              {exporting ? (
                <ActivityIndicator size="small" color={colors.mutedForeground} />
              ) : (
                <Download size={15} color={colors.mutedForeground} strokeWidth={2} />
              )}
              <Text className="font-sans-medium text-[15px] text-foreground/50">Export</Text>
            </Pressable>
          }
        />
      }
    >
      <View className="mt-2.5 flex-row gap-1.5 px-4">
        {PERIODS.map((p) => (
          <FilterChip key={p} label={p} active={period === p} onPress={() => setPeriod(p)} />
        ))}
      </View>

      <Tabs items={TABS} value={tab} onChange={setTab} className="mt-1.5" />

      {tab === "Balance Sheet" ? (
        <View className="px-4 pt-2.5">
          <Card className="bg-salli-hero p-[18px]">
            <Text className="mb-1.5 text-[11px] font-mono uppercase tracking-widest text-white/50">
              Net Worth Snapshot
            </Text>
            <View className="mb-1 flex-row items-baseline gap-1">
              <Text className="font-sans-semibold text-[20px] text-white/40">Rs.</Text>
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
                    <ArrowUpRight size={9} color={colors.accent} strokeWidth={2.5} />
                  ) : (
                    <ArrowDownRight size={9} color="#EF4444" strokeWidth={2.5} />
                  )}
                  <Text className={cn("text-[14px] font-sans-semibold", nwDelta >= 0 ? "text-salli-accent" : "text-destructive")}>
                    {nwDelta >= 0 ? "+" : "−"}Rs. {formatLKRAbbrev(Math.abs(nwDelta))} vs {prevLabel}
                  </Text>
                </View>
              </View>
            ) : (
              <View className="mb-3.5" />
            )}
            <View className="flex-row gap-1.5">
              <View className="flex-1 rounded-card bg-white/[0.06] p-2.5">
                <Text className="mb-1 text-[13px] text-white/35">Assets</Text>
                <Text className="font-sans-bold text-[15px] leading-none text-white">
                  Rs. {balanceSheet.data ? formatLKRAbbrev(balanceSheet.data.total_assets) : "—"}
                </Text>
              </View>
              <View className="flex-1 rounded-card bg-white/[0.06] p-2.5">
                <Text className="mb-1 text-[13px] text-white/35">Liabilities</Text>
                <Text className="font-sans-bold text-[15px] leading-none text-white/60">
                  Rs. {balanceSheet.data ? formatLKRAbbrev(balanceSheet.data.total_liabilities) : "—"}
                </Text>
              </View>
              <View className="flex-1 rounded-card bg-white/[0.06] p-2.5">
                <Text className="mb-1 text-[13px] text-white/35">Equity</Text>
                <Text className="font-sans-bold text-[15px] leading-none text-white/50">
                  Rs. {balanceSheet.data ? formatLKRAbbrev(balanceSheet.data.total_equity) : "—"}
                </Text>
              </View>
            </View>
          </Card>

          <Card className="mt-2.5 p-4">
            <Text className="mb-3 font-sans-semibold text-[15px] text-foreground">
              Income vs Expense · {range.label}
            </Text>
            <View className="gap-2.5">
              <View>
                <View className="mb-1.5 flex-row justify-between">
                  <Text className="text-[15px] text-foreground/50">Income</Text>
                  <Text className="font-sans-semibold text-[15px] text-foreground">Rs. {formatLKRAbbrev(incomeTotal)}</Text>
                </View>
                <View className="h-1.5 overflow-hidden rounded-pill bg-foreground/[0.06]">
                  <View className="h-full rounded-pill bg-salli-accent" style={{ width: incomeTotal > 0 ? "100%" : "0%" }} />
                </View>
              </View>
              <View>
                <View className="mb-1.5 flex-row justify-between">
                  <Text className="text-[15px] text-foreground/50">Expenses</Text>
                  <Text className="font-sans-semibold text-[15px] text-foreground/60">Rs. {formatLKRAbbrev(expenseTotal)}</Text>
                </View>
                <View className="h-1.5 overflow-hidden rounded-pill bg-foreground/[0.06]">
                  <View className="h-full rounded-pill bg-foreground/35" style={{ width: `${expensePct}%` }} />
                </View>
              </View>
              <View className="flex-row justify-between border-t border-foreground/[0.07] pt-2">
                <Text className="text-[15px] font-sans-medium text-muted-foreground">Saved this month</Text>
                <Text className="font-sans-bold text-[15px] text-foreground">Rs. {formatLKR(saved, 0)}</Text>
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
                  <Text className="font-sans-semibold text-[15px] capitalize text-foreground">{section}</Text>
                </View>
                <View className="px-4">
                  {lines.map((line, i) => (
                    <View key={i} className="flex-row items-center gap-2.5 border-b border-foreground/[0.05] py-2.5">
                      <View className={cn("h-[30px] w-[3px] rounded-pill", i === 0 ? "bg-salli-accent" : "bg-foreground/15")} />
                      <Text className="flex-1 text-[15px] text-foreground/55">
                        {line.code} · {line.name}
                      </Text>
                      <Text className="font-sans-medium text-[15px] text-foreground">
                        Rs. {formatLKR(line.balance, 0)}
                      </Text>
                    </View>
                  ))}
                  {total ? (
                    <View className="flex-row justify-between bg-foreground/[0.02] py-2.5">
                      <Text className="font-sans-semibold text-[15px] capitalize text-muted-foreground">Total {section}</Text>
                      <Text className="font-sans-bold text-[15px] text-foreground">Rs. {formatLKR(total, 0)}</Text>
                    </View>
                  ) : null}
                </View>
              </Card>
            );
          })}
        </View>
      ) : tab === "Income Stmt" ? (
        <View className="px-4 pt-2.5">
          <Card className="bg-salli-hero p-[18px]">
            <Text className="mb-1.5 text-[11px] font-mono uppercase tracking-widest text-white/50">
              Net Income · {range.label}
            </Text>
            <View className="mb-2.5 flex-row items-baseline gap-1">
              <Text className="font-sans-semibold text-[20px] text-white/40">Rs.</Text>
              <Text className="font-sans-extrabold text-[40px] leading-none tracking-tighter text-white">
                {income.data ? formatLKRAbbrev(saved) : "—"}
              </Text>
            </View>
            <View className="flex-row gap-1.5">
              <View className="flex-1 rounded-card bg-white/[0.06] p-2.5">
                <Text className="mb-1 text-[13px] text-white/35">Total Income</Text>
                <Text className="font-sans-bold text-[15px] leading-none text-white">
                  Rs. {income.data ? formatLKRAbbrev(incomeTotal) : "—"}
                </Text>
              </View>
              <View className="flex-1 rounded-card bg-white/[0.06] p-2.5">
                <Text className="mb-1 text-[13px] text-white/35">Total Expenses</Text>
                <Text className="font-sans-bold text-[15px] leading-none text-white/60">
                  Rs. {income.data ? formatLKRAbbrev(expenseTotal) : "—"}
                </Text>
              </View>
            </View>
          </Card>

          {(["income", "expenses"] as const).map((section) => {
            const entries = income.data ? Object.entries(income.data[section]) : [];
            if (entries.length === 0) return null;
            const total = section === "income" ? incomeTotal : expenseTotal;
            return (
              <Card key={section} className="mt-2.5 overflow-hidden p-0">
                <View className="border-b border-foreground/[0.06] px-4 py-3">
                  <Text className="font-sans-semibold text-[15px] capitalize text-foreground">{section}</Text>
                </View>
                <View className="px-4">
                  {entries.map(([name, amount], i) => (
                    <View key={i} className="flex-row items-center gap-2.5 border-b border-foreground/[0.05] py-2.5">
                      <View className={cn("h-[30px] w-[3px] rounded-pill", section === "income" ? "bg-salli-accent" : "bg-foreground/15")} />
                      <Text className="flex-1 text-[15px] text-foreground/55">{name}</Text>
                      <Text className="font-sans-medium text-[15px] text-foreground">Rs. {formatLKR(amount, 0)}</Text>
                    </View>
                  ))}
                  <View className="flex-row justify-between bg-foreground/[0.02] py-2.5">
                    <Text className="font-sans-semibold text-[15px] capitalize text-muted-foreground">Total {section}</Text>
                    <Text className="font-sans-bold text-[15px] text-foreground">Rs. {formatLKR(total, 0)}</Text>
                  </View>
                </View>
              </Card>
            );
          })}

          {income.data && Object.keys(income.data.income).length === 0 && Object.keys(income.data.expenses).length === 0 ? (
            <Card className="mt-2.5 items-center p-6">
              <Text className="text-[15px] text-muted-foreground">No income or expenses this period.</Text>
            </Card>
          ) : income.data ? (
            <View className="mt-2.5 flex-row items-center justify-between rounded-card border border-salli-accent/20 bg-salli-accent/[0.08] px-4 py-3.5">
              <Text className="font-sans-bold text-[16px] text-foreground">Net Income</Text>
              <Text className="font-sans-extrabold text-[22px] tracking-tight text-salli-accent">Rs. {formatLKR(saved, 0)}</Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View className="px-4 pt-2.5">
          <Card className="bg-salli-hero p-[18px]">
            <View className="mb-3.5 flex-row items-start justify-between">
              <View className="flex-1">
                <Text className="mb-1.5 text-[11px] font-mono uppercase tracking-widest text-white/50">
                  Current Net Worth
                </Text>
                <View className="flex-row items-baseline gap-1">
                  <Text className="font-sans-semibold text-[22px] text-white/40">Rs.</Text>
                  <Text className="font-sans-extrabold text-[42px] leading-none tracking-tighter text-white">
                    {netWorth.data ? formatLKRAbbrev(netWorth.data.current_net_worth) : "—"}
                  </Text>
                </View>
                <Text className="mt-1 text-[14px] text-white/30">
                  As of {netWorth.data?.as_of ? monthLabel(netWorth.data.as_of) : "—"}
                </Text>
              </View>
              {yoyPct !== null ? (
                <View className="mt-1 rounded-card border border-salli-accent/30 bg-salli-accent/20 px-2.5 py-1">
                  <Text className="font-sans-semibold text-[14px] text-salli-accent">
                    {yoyPct >= 0 ? "↑" : "↓"} {Math.abs(yoyPct).toFixed(0)}% YoY
                  </Text>
                </View>
              ) : null}
            </View>
            {trendValues.length >= 2 ? (
              <>
                <TrendChart values={trendValues} />
                <View className="mt-1 flex-row justify-between">
                  <Text className="text-[13px] text-white/30">{monthLabel(trendChron[0].date)}</Text>
                  <Text className="text-[13px] text-white/30">{monthLabel(trendChron[trendChron.length - 1].date)}</Text>
                </View>
              </>
            ) : null}
          </Card>

          {trend.length === 0 ? (
            <Card className="mt-2.5 items-center p-6">
              <Text className="text-[15px] text-muted-foreground">No history yet.</Text>
            </Card>
          ) : (
            <>
              <Text className="px-0.5 pb-1.5 pt-3.5 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                Monthly Trend
              </Text>
              <View className="gap-1.5">
                {trendChron
                  .map((point, i) => {
                    const value = Number(point.net_worth);
                    const prev = i > 0 ? Number(trendChron[i - 1].net_worth) : null;
                    const delta = prev !== null ? value - prev : null;
                    const pct = prev !== null && prev !== 0 ? (delta! / Math.abs(prev)) * 100 : null;
                    return { point, value, delta, pct };
                  })
                  .reverse()
                  .map(({ point, value, delta, pct }, i) => (
                    <Card key={i} className="flex-row items-center justify-between p-3.5">
                      <View>
                        <Text className="font-sans-semibold text-[15px] text-foreground">{monthLabel(point.date)}</Text>
                        {delta !== null ? (
                          <Text className="mt-0.5 text-[14px] text-muted-foreground">
                            {delta >= 0 ? "+" : "−"}Rs. {formatLKRAbbrev(Math.abs(delta))} this month
                          </Text>
                        ) : null}
                      </View>
                      <View className="items-end">
                        <Text className="font-sans-bold text-[16px] text-foreground">Rs. {formatLKRAbbrev(value)}</Text>
                        {pct !== null ? (
                          <Text className={cn("text-[14px] font-sans-medium", pct >= 0 ? "text-salli-accent" : "text-destructive")}>
                            {pct >= 0 ? "+" : "−"}
                            {Math.abs(pct).toFixed(1)}%
                          </Text>
                        ) : null}
                      </View>
                    </Card>
                  ))}
              </View>
            </>
          )}
        </View>
      )}
    </PageShell>
  );
}
