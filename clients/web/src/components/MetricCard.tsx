import { Card, CardContent } from "@/components/ui/card";
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
    <Card className={cn(large && "row-span-2", className)}>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        {loading ? (
          <div className="h-8 w-32 rounded bg-muted animate-pulse mt-2" />
        ) : (
          <p className={cn("font-bold mt-2 tabular-nums", large ? "text-4xl" : "text-2xl")}>
            {value}
          </p>
        )}
        {delta && (
          <p className={cn("text-sm mt-1", deltaPositive ? "text-green-600" : "text-red-600")}>
            {delta}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
