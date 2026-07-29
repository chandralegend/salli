import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Standard stat-card anatomy: eyebrow label top-left, quiet icon top-right,
 * big tabular figure, one caption/badge line. `emphasis` renders the navy
 * variant — reserved for the few surfaces that carry it (FI score, years-to-FIRE).
 */
export function StatCard({
  id,
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
  id?: string;
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
      id={id}
      className={cn(
        "rounded-lg border p-4 sm:p-5 flex flex-col gap-3",
        emphasis
          ? "bg-[var(--emphasis)] text-white border-[var(--emphasis)]"
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
          {/* Money figures are one unbreakable token, so a 12-character value
              like 5,600,000.00 needs 171px at 28px — more than a 2-up card gets
              on a 375px screen. 20px is the largest size that fits there. */}
          {value !== undefined && (
            <p className="money text-[20px] sm:text-[28px] leading-none font-semibold">{value}</p>
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
