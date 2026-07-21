"use client";

import { cn } from "@/lib/utils";
import type { Strategy } from "@/hooks/useDebt";

const OPTIONS: { value: Strategy; label: string }[] = [
  { value: "avalanche", label: "Avalanche" },
  { value: "snowball", label: "Snowball" },
];

/** Segmented avalanche/snowball switch — web has no shared SegmentedControl,
 * so this small toggle stands in, styled like the shadcn tab rail. */
export function StrategyToggle({
  value,
  onChange,
  className,
}: {
  value: Strategy;
  onChange: (v: Strategy) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label="Payoff strategy"
      className={cn("inline-flex rounded-lg border bg-muted p-0.5", className)}
    >
      {OPTIONS.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
