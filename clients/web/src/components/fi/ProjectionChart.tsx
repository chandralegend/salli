"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { ProjectionsData } from "@/hooks/useFi";

function fmt(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toFixed(0);
}

type Props = { data: ProjectionsData };

export function ProjectionChart({ data }: Props) {
  const chartData = data.points.map((p) => ({
    year: p.year,
    Conservative: Number(p.conservative),
    Base: Number(p.base),
    Growth: Number(p.growth),
  }));

  const fiNumber = Number(data.fi_number);

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: { name: string; value: number; color: string }[];
    label?: number;
  }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-xl px-3 py-2.5 shadow-lg text-[12px]">
        <p className="text-muted-foreground mb-1.5 font-medium">Year {label}</p>
        {payload.map((p) => (
          <div key={p.name} className="flex items-center justify-between gap-4">
            <span style={{ color: p.color }}>{p.name}</span>
            <span className="font-ledger">LKR {fmt(p.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={chartData} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="gradConservative" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gradBase" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gradGrowth" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
        <XAxis
          dataKey="year"
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `Yr ${v}`}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={fmt}
          width={52}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          iconType="circle"
          iconSize={8}
        />
        {fiNumber > 0 && (
          <ReferenceLine
            y={fiNumber}
            stroke="#10b981"
            strokeDasharray="6 3"
            strokeWidth={1.5}
            label={{
              value: `FIRE target LKR ${fmt(fiNumber)}`,
              position: "insideTopRight",
              fontSize: 10,
              fill: "#10b981",
            }}
          />
        )}
        <Area
          type="monotone"
          dataKey="Conservative"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#gradConservative)"
          dot={false}
        />
        <Area
          type="monotone"
          dataKey="Base"
          stroke="#10b981"
          strokeWidth={2.5}
          fill="url(#gradBase)"
          dot={false}
        />
        <Area
          type="monotone"
          dataKey="Growth"
          stroke="#f59e0b"
          strokeWidth={2}
          fill="url(#gradGrowth)"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
