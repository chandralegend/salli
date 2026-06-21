import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string;
  delta?: string;
  deltaPositive?: boolean;
  large?: boolean;
  accent?: boolean;
  className?: string;
  loading?: boolean;
}

/** Currency code set quiet so the figure carries the weight, ledger-style. */
function Amount({ value, className }: { value: string; className?: string }) {
  const m = value.match(/^([A-Z]{3})\s+(.*)$/);
  if (!m) return <span className={className}>{value}</span>;
  return (
    <span className={className}>
      <span className="text-[0.62em] font-medium text-muted-foreground mr-1 align-baseline tracking-normal">
        {m[1]}
      </span>
      {m[2]}
    </span>
  );
}

export function MetricCard({
  label,
  value,
  delta,
  deltaPositive,
  large,
  accent,
  className,
  loading,
}: MetricCardProps) {
  return (
    <Card
      className={cn(
        "transition-shadow duration-200 hover:shadow-[0_1px_12px_rgb(0_0_0/0.04)]",
        large && "row-span-2",
        accent && "ring-primary/25 bg-primary/[0.04]",
        className,
      )}
    >
      <CardContent>
        <p className="text-secondary-label">{label}</p>
        {loading ? (
          <div className="h-7 w-32 rounded bg-muted animate-pulse mt-3" />
        ) : (
          <Amount
            value={value}
            className={cn(
              "text-metric block mt-3",
              large && "text-[34px]",
              accent ? "text-primary" : "text-foreground",
            )}
          />
        )}
        {delta && (
          <p className={cn("text-meta mt-2", deltaPositive ? "text-emerald-600" : "text-rose-600")}>
            {delta}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
