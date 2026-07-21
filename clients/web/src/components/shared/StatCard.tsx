import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Standard stat-card anatomy: eyebrow label top-left, quiet icon top-right,
 * big tabular figure, one caption/badge line. `emphasis` renders the navy
 * variant — reserved for the few surfaces that carry it (FI score, years-to-FIRE).
 */
export function StatCard({
  label,
  value,
  caption,
  badge,
  icon: Icon,
  emphasis = false,
  loading = false,
  className,
  children,
}: {
  label: string;
  value?: React.ReactNode;
  caption?: React.ReactNode;
  badge?: React.ReactNode;
  icon?: LucideIcon;
  emphasis?: boolean;
  loading?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-5 flex flex-col gap-3",
        emphasis
          ? "bg-[#0A2540] text-white border-[#0A2540]"
          : "bg-card text-card-foreground",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <p className={cn("eyebrow", emphasis && "text-white/60")}>{label}</p>
        {Icon && <Icon className={cn("size-4", emphasis ? "text-white/50" : "text-muted-foreground")} />}
      </div>
      {loading ? (
        <>
          <Skeleton className={cn("h-8 w-28", emphasis && "bg-white/15")} />
          <Skeleton className={cn("h-3.5 w-20", emphasis && "bg-white/15")} />
        </>
      ) : (
        <>
          {value !== undefined && (
            <p className="money text-[28px] leading-none font-semibold">{value}</p>
          )}
          {(badge || caption) && (
            <div className="flex items-center gap-2 text-xs">
              {badge}
              {caption && (
                <span className={emphasis ? "text-white/60" : "text-muted-foreground"}>{caption}</span>
              )}
            </div>
          )}
          {children}
        </>
      )}
    </div>
  );
}
