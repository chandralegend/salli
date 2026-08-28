"use client";

import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ProjectionPoint } from "@/hooks/useFi";
import { formatCompact } from "@/lib/format";

const SERIES = [
  { key: "conservative" as const, label: "Conservative", color: "var(--chart-1)" },
  { key: "base" as const, label: "Base", color: "var(--chart-2)" },
  { key: "growth" as const, label: "Growth", color: "var(--chart-3)" },
];

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string }>;
  label?: number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 shadow-sm">
      <p className="text-xs font-semibold mb-1">Year {label}</p>
      {payload.map((p) => {
        const s = SERIES.find((s) => s.key === p.dataKey);
        return (
          <div key={p.dataKey} className="flex items-center gap-2 text-xs py-0.5">
            <span className="size-2 rounded-full shrink-0" style={{ background: p.color }} />
            <span className="text-muted-foreground w-24">{s?.label ?? p.dataKey}</span>
            <span className="money font-medium ml-auto">LKR {formatCompact(p.value)}</span>
          </div>
        );
      })}
    </div>
  );
}

/** 15-year portfolio projection: up to 3 scenario lines + dashed FIRE-target rule.
 * Scenarios in `lockedScenarios` are nulled server-side (never sent), so they're
 * simply left out of the chart/legend rather than blurred client-side. */
export function ProjectionChart({
  points,
  fiNumber,
  lockedScenarios = [],
}: {
  points: ProjectionPoint[];
  fiNumber: string;
  lockedScenarios?: string[];
}) {
  const visibleSeries = SERIES.filter((s) => !lockedScenarios.includes(s.key));
  const data = points.map((p) => ({
    year: p.year,
    conservative: p.conservative != null ? Number(p.conservative) : undefined,
    base: Number(p.base),
    growth: p.growth != null ? Number(p.growth) : undefined,
  }));
  const target = Number(fiNumber);

  return (
    <div>
      {/* Legend — identity is never color-alone; labels sit right here */}
      <div className="flex items-center gap-4 justify-end mb-2">
        {visibleSeries.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-3 h-0.5 rounded-full inline-block" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      {lockedScenarios.length > 0 && (
        <div className="mb-2 flex items-center gap-2 rounded-md bg-[var(--status-warning-bg)] px-3 py-2 text-[13px] text-[var(--status-warning-text)]">
          <TriangleAlert className="size-4 shrink-0" />
          <span>
            {SERIES.filter((s) => lockedScenarios.includes(s.key))
              .map((s) => s.label)
              .join(" & ")}{" "}
            scenario{lockedScenarios.length > 1 ? "s" : ""} locked ·{" "}
            <Link href="/settings?upgrade=plus" className="font-semibold underline underline-offset-2">
              Unlock on Pro
            </Link>
          </span>
        </div>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="0" />
          <XAxis
            dataKey="year"
            tickFormatter={(v) => `Yr ${v}`}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={(v) => formatCompact(v)}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            width={52}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }} />
          {target > 0 && (
            <ReferenceLine
              y={target}
              stroke="var(--chart-3)"
              strokeDasharray="6 4"
              label={{
                value: `Freedom target LKR ${formatCompact(target)}`,
                position: "insideBottomRight",
                fontSize: 11,
                fill: "var(--muted-foreground)",
              }}
            />
          )}
          {visibleSeries.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
