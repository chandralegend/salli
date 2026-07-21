import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Uppercase group header for a list of EntityCards, e.g. "ASSETS · 3 accounts".
 * Mirrors the mobile section labels above each grouped card list. */
export function CardSection({
  label,
  meta,
  children,
  className,
}: {
  label: string;
  /** Trailing muted text after a "·" (e.g. "3 accounts"). */
  meta?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="mb-1.5 px-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
        {label}
        {meta ? <span className="text-muted-foreground/50"> · {meta}</span> : null}
      </p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

type AccentTone = "accent" | "muted";
type IconTone = "accent" | "muted";

/**
 * Card row used across list screens (accounts, entries, debts, policies,
 * subscriptions, documents) — the web counterpart of the mobile card:
 * optional accent bar, optional icon tile, title (+ inline chip), subtitle,
 * a right-aligned value, and either action buttons (`trailing`) or a chevron.
 *
 * Rendered as a div so nested action buttons stay valid HTML; when `onClick`
 * is set it becomes keyboard-activatable. Nested buttons must stopPropagation.
 */
export function EntityCard({
  accent,
  icon: Icon,
  iconTone = "muted",
  title,
  titleChip,
  subtitle,
  value,
  valueMuted,
  trailing,
  chevron,
  onClick,
  dimmed,
  className,
}: {
  accent?: AccentTone;
  icon?: LucideIcon;
  iconTone?: IconTone;
  title: React.ReactNode;
  /** Inline chip/badge shown right of the title. */
  titleChip?: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Right-aligned primary value (money, count…). */
  value?: React.ReactNode;
  /** Render the value in the muted foreground (e.g. non-asset balances). */
  valueMuted?: boolean;
  /** Right-side action controls (edit/delete). Rendered after the value. */
  trailing?: React.ReactNode;
  /** Show a chevron on the far right (indicates click-through). */
  chevron?: boolean;
  onClick?: () => void;
  dimmed?: boolean;
  className?: string;
}) {
  const clickable = Boolean(onClick);
  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={cn(
        "group flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors",
        clickable && "cursor-pointer hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        dimmed && "opacity-50",
        className
      )}
    >
      {accent ? (
        <span
          className={cn(
            "h-9 w-[3px] shrink-0 rounded-full",
            accent === "accent" ? "bg-primary" : "bg-border"
          )}
        />
      ) : null}
      {Icon ? (
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-[10px]",
            iconTone === "accent" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          )}
        >
          <Icon className="size-[15px]" strokeWidth={2} />
        </span>
      ) : null}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-semibold">{title}</span>
          {titleChip}
        </div>
        {subtitle ? (
          <div className="mt-0.5 truncate text-[12px] text-muted-foreground">{subtitle}</div>
        ) : null}
      </div>

      {value != null ? (
        <div
          className={cn(
            "shrink-0 text-right text-[13px] font-semibold tabular-nums",
            valueMuted && "text-muted-foreground"
          )}
        >
          {value}
        </div>
      ) : null}
      {trailing}
      {chevron ? <ChevronRight className="size-4 shrink-0 text-muted-foreground" /> : null}
    </div>
  );
}
