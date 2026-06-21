import { metricLabel, type UsageMetric } from "@/hooks/useBilling";
import { cn } from "@/lib/utils";

function fmtReset(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

export function UsageMeter({ usage }: { usage: UsageMetric }) {
  const pct = usage.limit > 0 ? Math.min(100, Math.round((usage.used / usage.limit) * 100)) : 0;
  const near = pct >= 80;
  const full = usage.remaining <= 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[13px] text-foreground">{metricLabel(usage.metric)}</span>
        <span className="font-ledger text-[12px] text-muted-foreground">
          <span className={cn(full && "text-rose-600", near && !full && "text-amber-600")}>
            {usage.used.toLocaleString()}
          </span>
          {" / "}
          {usage.limit.toLocaleString()}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500",
            full ? "bg-rose-500" : near ? "bg-amber-500" : "bg-primary",
          )}
          style={{ width: `${Math.max(pct, usage.used > 0 ? 4 : 0)}%` }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">
        {full
          ? `Limit reached · resets ${fmtReset(usage.resets_at)}`
          : `${usage.remaining.toLocaleString()} left · resets ${fmtReset(usage.resets_at)}`}
      </p>
    </div>
  );
}
