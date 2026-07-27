"use client";

import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";
import type { AllocationBucket } from "@/hooks/useFi";

const BUCKET_COLORS = ["var(--chart-3)", "var(--chart-2)", "var(--chart-1)", "var(--chart-4)", "var(--chart-5)"];

function BucketTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { name: string; value: number; description: string; color: string } }>;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="max-w-56 rounded-md border bg-popover px-3 py-2 shadow-sm">
      <div className="flex items-center gap-2 text-xs">
        <span className="size-2 rounded-full shrink-0" style={{ background: p.color }} />
        <span className="font-semibold">{p.name}</span>
        <span className="money text-muted-foreground">{p.value}%</span>
      </div>
      {p.description && (
        <p className="text-xs text-muted-foreground mt-1 leading-snug">{p.description}</p>
      )}
    </div>
  );
}

/** Allocation donut with hover-highlighted slices + a legend list. Replaces a
 * flat card grid so relative bucket weight reads visually at a glance — the
 * web equivalent of the mobile app's tap-to-highlight donut (hover instead
 * of tap, since desktop has no touch target to tap). */
export function AllocationDonut({ buckets }: { buckets: AllocationBucket[] }) {
  const [active, setActive] = useState<number | null>(null);

  // `target_pct` arrives as a 0..1 fraction; scale once here so every label
  // (tooltip, donut hole, legend) reads a real percentage. Recharts derives
  // slice angles from the *sum* of `value`, so scaling leaves geometry
  // untouched — which is why the mislabelled version looked fine and shipped.
  const data = buckets.map((b, i) => ({
    name: b.name,
    // Rounded to 1dp at the source so labels don't show float artefacts like
    // "10.000000000000002%"; proportions are preserved.
    value: Math.round(Number(b.target_pct) * 1000) / 10,
    description: b.description,
    color: BUCKET_COLORS[i % BUCKET_COLORS.length],
  }));

  return (
    <div className="grid md:grid-cols-2 gap-5 items-center rounded-lg border bg-card p-5">
      <div className="relative h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={68}
              outerRadius={96}
              paddingAngle={2}
              stroke="var(--card)"
              strokeWidth={2}
              onMouseEnter={(_, i) => setActive(i)}
              onMouseLeave={() => setActive(null)}
            >
              {data.map((d, i) => (
                <Cell key={d.name} fill={d.color} opacity={active === null || active === i ? 1 : 0.35} />
              ))}
            </Pie>
            <Tooltip content={<BucketTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-6 text-center">
          {active !== null ? (
            <>
              <p className="money text-2xl font-semibold">{data[active].value}%</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[140px]">{data[active].name}</p>
            </>
          ) : (
            <>
              <p className="money text-2xl font-semibold">{buckets.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">buckets</p>
            </>
          )}
        </div>
      </div>

      <div className="space-y-2.5">
        {data.map((d, i) => (
          <div
            key={d.name}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            className={cn(
              "flex items-start gap-2.5 rounded-md p-2 -mx-2 transition-colors cursor-default",
              active === i && "bg-muted"
            )}
          >
            <span className="size-2.5 rounded-full shrink-0 mt-1" style={{ background: d.color }} />
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <p className="text-sm font-semibold">{d.name}</p>
                <p className="money text-sm font-semibold text-muted-foreground">{d.value}%</p>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{d.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
