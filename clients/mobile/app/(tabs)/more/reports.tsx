import { Download } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import Svg, { Polygon, Polyline } from "react-native-svg";

import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { Hero, Meter, Rule, SectionLabel, Strong } from "@/components/ui/blocks";
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

/**
 * Three tabs, kept — unlike the tabs removed from Tax, Debt and Portfolio.
 *
 * Those repeated each other's figures. These are three different statements of
 * account: what you own and owe at a moment, what came in and went out over a
 * period, and how the first has moved over time. None is derivable from
 * another on screen.
 */
const TABS = ["Balance sheet", "Income", "Net worth"] as const;

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
  if (period === "YTD") return { from: `${y}-01-01`, to: iso(now), label: `${y} so far` };
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

/** Net-worth trend line + area fill. */
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
      <Polyline
        points={line}
        fill="none"
        stroke={colors.accent}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * A statement's line items: one row per line, then its total under a heavier
 * rule. Replaces the per-row 3px accent spine, which coloured the first row of
 * every section for no reason anyone could read off it.
 */
function LineTable({
  lines,
  totalLabel,
  total,
}: {
  lines: { label: string; amount: string | number }[];
  totalLabel: string;
  total: string | number | undefined;
}) {
  return (
    <Card className="overflow-hidden p-0">
      {lines.map((l, i) => (
        <View
          key={i}
          className="flex-row items-baseline justify-between gap-3 border-b border-foreground/15 px-3.5 py-2.5"
        >
          <Text numberOfLines={1} className="min-w-0 flex-1 text-[15px] text-foreground">
            {l.label}
          </Text>
          <Text className="shrink-0 text-[15px] text-foreground">Rs. {formatLKR(l.amount, 0)}</Text>
        </View>
      ))}
      {total !== undefined ? (
        <View className="flex-row items-baseline justify-between gap-3 border-t-2 border-foreground px-3.5 py-2.5">
          <Text className="min-w-0 flex-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            {totalLabel}
          </Text>
          <Text className="shrink-0 font-sans-extrabold text-[16px] text-foreground">
            Rs. {formatLKR(total, 0)}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

export default function ReportsScreen() {
  const colors = useThemeColors();
  const showToast = useToast();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Balance sheet");
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>(PERIODS[0]);
  const [exporting, setExporting] = useState(false);
  const range = periodRange(period);
  const balanceSheet = useBalanceSheet();
  const netWorth = useNetWorthStatement();
  const income = useIncomeStatement(range);

  const trend = netWorth.data?.trend ?? [];
  const nwDelta =
    trend.length >= 2
      ? Number(trend[trend.length - 1].net_worth) - Number(trend[trend.length - 2].net_worth)
      : null;
  const prevLabel = trend.length >= 2 ? MONTHS[new Date(trend[trend.length - 2].date).getMonth()] : "";

  const incomeTotal = income.data ? Object.values(income.data.income).reduce((s, v) => s + Number(v), 0) : 0;
  const expenseTotal = income.data
    ? Object.values(income.data.expenses).reduce((s, v) => s + Number(v), 0)
    : 0;
  const saved = income.data ? Number(income.data.net_income) : 0;

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

  // Which server-side CSV report the current tab maps to. The income statement
  // has none, so the control is absent on that tab rather than present at 40%
  // opacity with nothing to say about why.
  const exportType: ExportableReport | null =
    tab === "Balance sheet" ? "balance-sheet" : tab === "Net worth" ? "net-worth" : null;

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
        <>
          <ScreenHeader
            title="Reports"
            back
            trailing={
              exportType ? (
                <AnimatedPressable
                  onPress={handleExport}
                  disabled={exporting}
                  accessibilityRole="button"
                  accessibilityLabel="Export as CSV"
                  className="h-11 w-11 items-center justify-center rounded-[11px] border-2 border-foreground bg-card"
                >
                  {exporting ? (
                    <ActivityIndicator size="small" color={colors.foreground} />
                  ) : (
                    <Download size={18} color={colors.foreground} strokeWidth={2} />
                  )}
                </AnimatedPressable>
              ) : undefined
            }
          />
          <Tabs items={TABS} value={tab} onChange={setTab} className="mt-3" />
        </>
      }
    >
      {tab === "Balance sheet" ? (
        <View>
          <View className="px-5">
            <Hero>
              Your net worth is{" "}
              <Strong>
                Rs. {balanceSheet.data ? formatLKRAbbrev(balanceSheet.data.net_worth) : "—"}
              </Strong>
              .
            </Hero>
            {/* Stated as signed component figures rather than as "X owned less
                Y owed". This ledger reports total_liabilities NEGATIVE, so the
                sentence form rendered "less Rs. -2.9L owed" — a double negative
                asserting arithmetic that did not reconcile with the net worth
                above it. The signed figures are what the balance sheet says. */}
            <Text className="mt-2 text-[16px] leading-[23px] text-muted-foreground">
              Assets Rs. {balanceSheet.data ? formatLKRAbbrev(balanceSheet.data.total_assets) : "—"}
              , liabilities Rs.{" "}
              {balanceSheet.data ? formatLKRAbbrev(balanceSheet.data.total_liabilities) : "—"}.
              {/* A zero delta is not movement. "Up Rs. 0 since Sep" read as a
                  rise of nothing. */}
              {nwDelta !== null
                ? nwDelta === 0
                  ? ` Unchanged since ${prevLabel}.`
                  : ` ${nwDelta > 0 ? "Up" : "Down"} Rs. ${formatLKRAbbrev(Math.abs(nwDelta))} since ${prevLabel}.`
                : ""}
            </Text>
          </View>

          {/* The "Income vs Expense" card that used to sit here belonged to the
              income statement, which has its own tab. Having it on this tab was
              also why the period pills appeared to apply to a balance sheet —
              a balance sheet is a moment, not a period. */}
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
              <View key={section}>
                <Rule />
                <SectionLabel>{section}</SectionLabel>
                <View className="mt-3 px-5">
                  <LineTable
                    lines={lines.map((l) => ({ label: `${l.code} · ${l.name}`, amount: l.balance }))}
                    totalLabel={`Total ${section}`}
                    total={total}
                  />
                </View>
              </View>
            );
          })}
          <View className="h-7" />
        </View>
      ) : tab === "Income" ? (
        <View>
          {/* The period pills live on this tab only. They were rendered above
              all three, but only the income statement takes a date range —
              tapping them on the other two changed nothing. */}
          <View className="flex-row flex-wrap gap-1.5 px-5">
            {PERIODS.map((p) => (
              <FilterChip key={p} label={p} active={period === p} onPress={() => setPeriod(p)} />
            ))}
          </View>

          <View className="mt-4 px-5">
            {/* A negative surplus is not something you "kept". The sentence
                flips rather than printing "You kept Rs. -5.0L". */}
            <Hero>
              {saved < 0 ? (
                <>
                  You spent <Strong>Rs. {formatLKRAbbrev(Math.abs(saved))}</Strong> more than you
                  earned in {range.label}.
                </>
              ) : (
                <>
                  You kept <Strong>Rs. {income.data ? formatLKRAbbrev(saved) : "—"}</Strong> in{" "}
                  {range.label}.
                </>
              )}
            </Hero>
            <Text className="mt-2 text-[16px] leading-[23px] text-muted-foreground">
              Rs. {formatLKRAbbrev(incomeTotal)} in, Rs. {formatLKRAbbrev(expenseTotal)} out.
            </Text>
            {incomeTotal > 0 ? (
              <Meter
                className="mt-4"
                value={expenseTotal / incomeTotal}
                over={expenseTotal > incomeTotal}
              />
            ) : null}
          </View>

          {(["income", "expenses"] as const).map((section) => {
            const entries = income.data ? Object.entries(income.data[section]) : [];
            if (entries.length === 0) return null;
            return (
              <View key={section}>
                <Rule />
                <SectionLabel>{section}</SectionLabel>
                <View className="mt-3 px-5">
                  <LineTable
                    lines={entries.map(([name, amount]) => ({ label: name, amount }))}
                    totalLabel={`Total ${section}`}
                    total={section === "income" ? incomeTotal : expenseTotal}
                  />
                </View>
              </View>
            );
          })}

          {income.data &&
          Object.keys(income.data.income).length === 0 &&
          Object.keys(income.data.expenses).length === 0 ? (
            <View className="mt-4 px-5">
              <Text className="text-[15px] leading-[21px] text-muted-foreground">
                Nothing came in or went out in {range.label}.
              </Text>
            </View>
          ) : null}
          <View className="h-7" />
        </View>
      ) : (
        <View>
          <View className="px-5">
            <Hero>
              <Strong>
                Rs. {netWorth.data ? formatLKRAbbrev(netWorth.data.current_net_worth) : "—"}
              </Strong>{" "}
              as of {netWorth.data?.as_of ? monthLabel(netWorth.data.as_of) : "—"}.
            </Hero>
            {yoyPct !== null ? (
              <Text
                className={`mt-2 text-[16px] leading-[23px] ${
                  yoyPct >= 0 ? "font-sans-semibold text-salli-accent" : "font-sans-semibold text-destructive"
                }`}
              >
                {yoyPct >= 0 ? "Up" : "Down"} {Math.abs(yoyPct).toFixed(0)}% on a year ago.
              </Text>
            ) : (
              <Text className="mt-2 text-[16px] leading-[23px] text-muted-foreground">
                Not yet a year of history to compare against.
              </Text>
            )}
          </View>

          {trendValues.length >= 2 ? (
            <View className="mt-4 px-5">
              <Card className="px-3.5 pb-2.5 pt-3.5">
                <TrendChart values={trendValues} />
                <View className="mt-1.5 flex-row justify-between">
                  <Text className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                    {monthLabel(trendChron[0].date)}
                  </Text>
                  <Text className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                    {monthLabel(trendChron[trendChron.length - 1].date)}
                  </Text>
                </View>
              </Card>
            </View>
          ) : null}

          {trend.length === 0 ? (
            <View className="mt-4 px-5">
              <Text className="text-[15px] leading-[21px] text-muted-foreground">
                No history yet. It builds up as you post entries.
              </Text>
            </View>
          ) : (
            <>
              <Rule />
              <SectionLabel>Month by month</SectionLabel>
              <View className="mt-3 gap-[9px] px-5">
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
                    <Card key={i} flat className="flex-row items-center gap-3 px-3.5 py-3">
                      <View className="min-w-0 flex-1">
                        <Text className="font-sans-bold text-[16px] text-foreground">
                          {monthLabel(point.date)}
                        </Text>
                        {delta !== null ? (
                          <Text className="mt-0.5 text-[13.5px] text-muted-foreground">
                            {delta >= 0 ? "+" : "−"}Rs. {formatLKRAbbrev(Math.abs(delta))} that month
                          </Text>
                        ) : null}
                      </View>
                      <View className="shrink-0 items-end">
                        <Text className="font-sans-extrabold text-[15px] text-foreground">
                          Rs. {formatLKRAbbrev(value)}
                        </Text>
                        {pct !== null ? (
                          <Text
                            className={`mt-0.5 text-[13px] ${
                              pct >= 0 ? "text-muted-foreground" : "text-destructive"
                            }`}
                          >
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
          <View className="h-7" />
        </View>
      )}
    </PageShell>
  );
}
