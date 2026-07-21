import { TrendingUp, TrendingDown, LineChart as LineChartIcon } from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { MoneyText } from "@/components/shared/MoneyText";
import { StatusChip } from "@/components/shared/StatusChip";
import { Skeleton } from "@/components/ui/skeleton";
import { NetWorthChart } from "@/components/reports/NetWorthChart";
import { formatDate } from "@/lib/format";
import type { NetWorthStatement } from "@/hooks/useReports";

const MS_PER_DAY = 86_400_000;

/** Year-over-year %: latest point vs the earliest point ≥ ~1 year older. */
function yoyPct(trend: NetWorthStatement["trend"]): number | null {
  if (trend.length < 2) return null;
  const latest = trend[trend.length - 1];
  const latestTime = new Date(latest.date).getTime();
  const yearAgo = trend.find((p) => latestTime - new Date(p.date).getTime() >= 330 * MS_PER_DAY);
  const base = yearAgo ? Number(yearAgo.net_worth) : 0;
  if (!yearAgo || base === 0) return null;
  return ((Number(latest.net_worth) - base) / Math.abs(base)) * 100;
}

export function NetWorthTab({
  data,
  loading,
}: {
  data?: NetWorthStatement;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  const trend = data?.trend ?? [];

  if (!data || trend.length === 0) {
    return (
      <div className="rounded-lg border bg-card">
        <EmptyState
          icon={LineChartIcon}
          title="No history yet"
          body="Salli snapshots your net worth over time. Once there are a few months of data, your trend appears here."
        />
      </div>
    );
  }

  const chron = trend.slice(-12);
  const yoy = yoyPct(trend);
  const up = (yoy ?? 0) >= 0;

  // Reverse-chronological list rows with month-over-month deltas.
  const rows = chron
    .map((point, i) => {
      const value = Number(point.net_worth);
      const prev = i > 0 ? Number(chron[i - 1].net_worth) : null;
      const delta = prev !== null ? value - prev : null;
      const pct = prev !== null && prev !== 0 ? (delta! / Math.abs(prev)) * 100 : null;
      return { point, value, delta, pct };
    })
    .reverse();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <StatCard
          label="Current Net Worth"
          value={<MoneyText value={data.current_net_worth} decimals={0} />}
          caption={data.as_of ? `As of ${formatDate(data.as_of)}` : undefined}
          badge={
            yoy !== null ? (
              <StatusChip tone={up ? "success" : "danger"}>
                {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                {up ? "+" : "−"}
                {Math.abs(yoy).toFixed(1)}% YoY
              </StatusChip>
            ) : undefined
          }
          className="border-2 border-foreground"
        />
        <StatCard
          label="Data Points"
          value={String(trend.length)}
          caption={`${formatDate(trend[0].date)} → ${formatDate(trend[trend.length - 1].date)}`}
        />
      </div>

      <div className="rounded-lg border bg-card p-5">
        <div className="mb-3">
          <h3 className="text-[15px] font-semibold">Net Worth Trend</h3>
          <p className="text-xs text-muted-foreground">last {chron.length} months</p>
        </div>
        <NetWorthChart points={chron} />
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="border-b px-5 py-3">
          <h3 className="text-[15px] font-semibold">Monthly Trend</h3>
        </div>
        <div className="px-5">
          {rows.map(({ point, value, delta, pct }) => {
            const positive = (delta ?? 0) >= 0;
            return (
              <div
                key={point.date}
                className="flex items-center justify-between border-b last:border-b-0 py-3"
              >
                <div>
                  <p className="text-[13px] font-medium">{formatDate(point.date)}</p>
                  {delta !== null && (
                    <p className="text-xs text-muted-foreground mt-0.5 money">
                      {positive ? "+" : "−"}LKR {Math.abs(delta).toLocaleString("en-LK", { maximumFractionDigits: 0 })} this month
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <MoneyText value={String(value)} decimals={0} className="text-sm font-semibold" />
                  {pct !== null && (
                    <p
                      className={
                        positive
                          ? "text-xs font-medium text-[var(--status-success-text)] mt-0.5"
                          : "text-xs font-medium text-[var(--status-danger-text)] mt-0.5"
                      }
                    >
                      {positive ? "+" : "−"}
                      {Math.abs(pct).toFixed(1)}%
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
