import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string;
  delta?: string;
  deltaPositive?: boolean;
  large?: boolean;
  className?: string;
  loading?: boolean;
}

export function MetricCard({
  label,
  value,
  delta,
  deltaPositive,
  large,
  className,
  loading,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "rounded-[16px] bg-card border border-border p-6 flex flex-col justify-between transition-transform duration-150 hover:-translate-y-0.5",
        large && "row-span-2",
        className
      )}
    >
      <span className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground font-mono">
        {label}
      </span>
      {loading ? (
        <div className="h-9 w-32 rounded bg-secondary animate-pulse mt-4" />
      ) : (
        <span
          className={cn(
            "font-mono font-semibold text-foreground leading-none mt-4",
            large ? "text-5xl" : "text-3xl"
          )}
        >
          {value}
        </span>
      )}
      {delta && (
        <span
          className={cn(
            "text-[13px] font-mono font-medium mt-2",
            deltaPositive ? "text-income" : "text-expense"
          )}
        >
          {deltaPositive ? "▲" : "▼"} {delta}
        </span>
      )}
    </div>
  );
}
