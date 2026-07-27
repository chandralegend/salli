import Link from "next/link";
import { metricLabel, type UsageMetric } from "@/hooks/useBilling";
import { cn } from "@/lib/utils";

/** One metered quota row: label, count, and a percentage-used pill —
 * neutral by default, amber >80%, red at limit. */
export function UsageMeter({ metric }: { metric: UsageMetric }) {
  const pct = metric.limit > 0 ? Math.min(100, (metric.used / metric.limit) * 100) : 0;
  const atLimit = metric.limit > 0 && metric.used >= metric.limit;
  const nearLimit = !atLimit && pct >= 80;

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/60 px-3 py-2.5">
      <div>
        <span className="text-[13px] font-medium">{metricLabel(metric.metric)}</span>
        <p className="money text-xs text-muted-foreground mt-0.5">
          {metric.used} / {metric.limit}
        </p>
      </div>
      <span
        className={cn(
          "rounded-full px-2.5 py-1 text-[11px] font-semibold shrink-0",
          atLimit
            ? "bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]"
            : nearLimit
              ? "bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]"
              : "bg-muted text-muted-foreground"
        )}
      >
        {atLimit ? "Limit reached" : `${Math.round(pct)}%`}
      </span>
      {atLimit && (
        <Link href="/settings?upgrade=1" className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 shrink-0">
          Upgrade →
        </Link>
      )}
    </div>
  );
}
