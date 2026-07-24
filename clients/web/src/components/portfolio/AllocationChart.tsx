"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatCompact } from "@/lib/format";
import type { AllocationSlice } from "@/hooks/usePortfolio";

/** Distinct-but-on-brand neutrals for allocation slices — shared by the donut,
 * legend, per-asset-class cards and holding accent bars so everything reads as
 * one system. Kept off the red-orange primary/accent so data slices never look
 * like CTAs. Assigned by the summary's allocation order. */
export const SLICE_COLORS = [
  "#16130f",
  "#b7b1a5",
  "#4b463d",
  "#e4e0d6",
  "#6b6459",
  "#2c2822",
  "#8c877c",
];

export function colorForClass(allocation: AllocationSlice[]): Record<string, string> {
  const map: Record<string, string> = {};
  allocation.forEach((a, i) => {
    map[a.asset_class] = SLICE_COLORS[i % SLICE_COLORS.length];
  });
  return map;
}

const titleCase = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { name: string; value: number; pct: number; color: string } }>;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 shadow-sm">
      <div className="flex items-center gap-2 text-xs">
        <span className="size-2 rounded-full shrink-0" style={{ background: p.color }} />
        <span className="font-semibold">{titleCase(p.name)}</span>
      </div>
      <p className="money text-xs text-muted-foreground mt-1">
        LKR {formatCompact(p.value)} · {(p.pct * 100).toFixed(1)}%
      </p>
    </div>
  );
}

/** Allocation donut. `totalLabel` renders centred inside the ring. */
export function AllocationChart({
  allocation,
  colors,
  totalLabel,
}: {
  allocation: AllocationSlice[];
  colors: Record<string, string>;
  totalLabel: string;
}) {
  const data = allocation.map((a) => ({
    name: a.asset_class,
    value: Number(a.current_value),
    pct: Number(a.pct_of_portfolio),
    color: colors[a.asset_class] ?? SLICE_COLORS[0],
  }));

  return (
    <div className="relative h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={2}
            stroke="var(--card)"
            strokeWidth={2}
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <p className="money text-xl font-semibold">{totalLabel}</p>
        <p className="text-[11px] text-muted-foreground">total value</p>
      </div>
    </div>
  );
}
