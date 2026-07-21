import Link from "next/link";
import { metricLabel, type UsageMetric } from "@/hooks/useBilling";
import { cn } from "@/lib/utils";

/** One metered quota row: label, count, thin bar; amber >80%, red at limit. */
export function UsageMeter({ metric }: { metric: UsageMetric }) {
  const pct = metric.limit > 0 ? Math.min(100, (metric.used / metric.limit) * 100) : 0;
  const atLimit = metric.limit > 0 && metric.used >= metric.limit;
  const nearLimit = !atLimit && pct >= 80;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[13px] font-medium">{metricLabel(metric.metric)}</span>
        <span className="money text-[13px] text-muted-foreground">
          {metric.used} / {metric.limit}
          {atLimit && (
            <span className="ml-2 rounded-full bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] px-2 py-0.5 text-[11px] font-semibold">
              limit reached
            </span>
          )}
          {nearLimit && (
            <span className="ml-2 rounded-full bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] px-2 py-0.5 text-[11px] font-semibold">
              {Math.round(pct)}%
            </span>
          )}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-[width]",
            atLimit
              ? "bg-[var(--status-danger-text)]"
              : nearLimit
                ? "bg-[var(--status-warning-text)]"
                : "bg-foreground"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {atLimit && (
        <Link href="/settings?upgrade=1" className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 mt-1 inline-block">
          Upgrade for more →
        </Link>
      )}
    </div>
  );
}
