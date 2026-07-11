"use client";

import { useState } from "react";
import type { AllocationBucket, SurplusBreakdown } from "@/hooks/useFi";

// Design palette: position → color scheme
const PALETTE = [
  { bg: "#E8FC85", text: "#010001", sub: "rgba(0,0,0,0.4)", barBg: "rgba(0,0,0,0.12)", bar: "#010001", status: "rgba(0,0,0,0.4)" },
  { bg: "#A5FFB9", text: "#010001", sub: "rgba(0,0,0,0.4)", barBg: "rgba(0,0,0,0.12)", bar: "#010001", status: "rgba(0,0,0,0.4)" },
  { bg: "#D5E9EA", text: "#010001", sub: "rgba(0,0,0,0.4)", barBg: "rgba(0,0,0,0.12)", bar: "#010001", status: "rgba(0,0,0,0.4)" },
  { bg: "#FFFFFF",  text: "#010001", sub: "#7DA6A9",         barBg: "#D5E9EA",          bar: "#D97706", status: "#7DA6A9" },
  { bg: "#010001",  text: "#E8FC85", sub: "rgba(255,255,255,0.3)", barBg: "rgba(255,255,255,0.1)", bar: "#E8FC85", status: "rgba(255,255,255,0.35)" },
];

const DESCRIPTION_CLAMP_LINES = 2;

function lkr(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toLocaleString("en-LK", { maximumFractionDigits: 0 });
}

type Props = {
  buckets: AllocationBucket[];
  surplus: SurplusBreakdown | null | undefined;
};

export function AllocationBuckets({ buckets, surplus }: Props) {
  const monthlySurplus = surplus ? Number(surplus.monthly_surplus) : 0;

  if (buckets.length === 0) {
    return (
      <p className="text-[13px] text-muted-foreground text-center py-8">
        No allocation buckets yet. Generate your FIRE strategy to see personalised buckets.
      </p>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${Math.min(buckets.length, 5)}, 1fr)`,
        gap: 12,
        alignItems: "start",
      }}
    >
      {buckets.map((bucket, i) => (
        <BucketCard
          key={bucket.key}
          bucket={bucket}
          colors={PALETTE[i % PALETTE.length]}
          monthlySurplus={monthlySurplus}
        />
      ))}
    </div>
  );
}

function BucketCard({
  bucket, colors: c, monthlySurplus,
}: {
  bucket: AllocationBucket;
  colors: (typeof PALETTE)[number];
  monthlySurplus: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const pct = (bucket.target_pct * 100).toFixed(0);
  const monthlyAmount = monthlySurplus * bucket.target_pct;

  return (
    <div
      style={{
        background: c.bg,
        borderRadius: 20,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: 148,
      }}
    >
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: c.sub, marginBottom: 3 }}>
          {bucket.name}
        </div>
        <div style={{ fontSize: 11.5, color: c.sub, marginTop: 3 }}>
          {pct}% target
        </div>
        {bucket.description && (
          <>
            <p
              style={{
                fontSize: 11.5,
                color: c.sub,
                marginTop: 4,
                lineHeight: 1.45,
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: expanded ? "unset" : DESCRIPTION_CLAMP_LINES,
                overflow: expanded ? "visible" : "hidden",
              }}
            >
              {bucket.description}
            </p>
            <button
              onClick={() => setExpanded((e) => !e)}
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: c.text,
                opacity: 0.7,
                background: "none",
                border: "none",
                padding: 0,
                marginTop: 4,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {expanded ? "Show less" : "Show more"}
            </button>
          </>
        )}
      </div>
      <div>
        <div style={{ height: 3, background: c.barBg, borderRadius: 999, overflow: "hidden", marginBottom: 8, marginTop: 12 }}>
          <div style={{ width: `${Math.min(100, bucket.target_pct * 100)}%`, height: "100%", background: c.bar, borderRadius: 999 }} />
        </div>
        <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.05em", color: c.text, lineHeight: 1 }}>
          {pct}<span style={{ fontSize: 14 }}>%</span>
        </div>
        {monthlySurplus > 0 && (
          <div style={{ fontSize: 11, color: c.status, marginTop: 2 }}>
            Route LKR {lkr(monthlyAmount)}/mo
          </div>
        )}
      </div>
    </div>
  );
}
