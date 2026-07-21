"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { History } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney, formatCompact } from "@/lib/format";
import { StatCard } from "@/components/shared/StatCard";
import { StatusChip } from "@/components/shared/StatusChip";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { useTaxHistory, type TaxPack, type TaxResult } from "@/hooks/useTax";
import { dueDateLabel, effectiveRate } from "@/components/tax/taxDates";

type Row = { pack: TaxPack; result: TaxResult };

function num(v: string): number {
  return Number(v.replace(/,/g, "")) || 0;
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { label: string; value: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 shadow-sm">
      <p className="text-xs font-semibold mb-1">AY {p.label}</p>
      <p className="money text-xs">LKR {formatMoney(String(p.value))}</p>
    </div>
  );
}

/** Multi-year tax history — only years with a real pack/computation appear. */
export function HistoryTab() {
  const history = useTaxHistory();

  if (history.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  const rows = (history.data ?? []).filter((r): r is Row => r.result != null);

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No assessment years yet"
        body="Once you compute tax for a year of assessment, it appears here."
      />
    );
  }

  const total = rows.reduce((acc, r) => acc + num(r.result.tax_payable), 0);
  // Oldest → newest for the bar chart.
  const chartRows = [...rows].reverse();
  const chartData = chartRows.map((r, i) => ({
    label: r.pack.year,
    value: num(r.result.tax_payable),
    current: i === chartRows.length - 1,
  }));

  const yoy = (() => {
    if (chartRows.length < 2) return null;
    const prev = num(chartRows[chartRows.length - 2].result.tax_payable);
    const curr = num(chartRows[chartRows.length - 1].result.tax_payable);
    if (!(prev > 0)) return null;
    return (curr - prev) / prev;
  })();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
        <StatCard
          label={rows.length > 1 ? `Tax · ${rows.length}-Year Total` : "Tax · Estimated"}
          value={formatMoney(String(total))}
          caption="Across all assessed years"
          emphasis
          badge={
            yoy != null ? (
              <StatusChip tone={yoy >= 0 ? "warning" : "success"}>
                {yoy >= 0 ? "↑" : "↓"} {Math.abs(yoy * 100).toFixed(0)}% YoY
              </StatusChip>
            ) : undefined
          }
        />

        {chartRows.length >= 2 ? (
          <div className="sm:col-span-2 rounded-lg border bg-card p-5">
            <div className="mb-3">
              <h3 className="text-[15px] font-semibold">Net tax payable by year</h3>
              <p className="text-xs text-muted-foreground">IRD estimate · not filed</p>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="label"
                  tickFormatter={(v) => `AY ${v}`}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--border)" }}
                />
                <YAxis
                  tickFormatter={(v) => formatCompact(v)}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={64}>
                  {chartData.map((d) => (
                    <Cell key={d.label} fill={d.current ? "var(--chart-2)" : "var(--chart-1)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="sm:col-span-2 rounded-lg border bg-card p-5 flex items-center text-sm text-muted-foreground">
            Compute tax for more than one assessment year to see the year-over-year trend.
          </div>
        )}
      </div>

      <section className="space-y-2.5">
        <p className="eyebrow">Assessment Years</p>
        <div className="space-y-2.5">
          {rows.map((r, i) => {
            const isCurrent = i === 0;
            return (
              <div
                key={r.pack.year}
                className={cn(
                  "flex items-center gap-3.5 rounded-lg border bg-card p-4",
                  isCurrent && "border-l-[3px] border-l-[var(--status-success-text)]",
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-semibold">AY {r.pack.year}</p>
                    <StatusChip tone={isCurrent ? "success" : "neutral"}>
                      {isCurrent ? "Current" : "Computed"}
                    </StatusChip>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Est. · {dueDateLabel(r.pack, r.pack.year)} · Eff. {(effectiveRate(r.result) * 100).toFixed(2)}%
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="money text-sm font-semibold">{formatMoney(r.result.tax_payable)}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Not filed</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
