import { cn } from "@/lib/utils";

export type ChipTone = "danger" | "warning" | "success" | "neutral" | "info";

const TONES: Record<ChipTone, string> = {
  danger: "bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]",
  warning: "bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]",
  success: "bg-[var(--status-success-bg)] text-[var(--status-success-text)]",
  neutral: "bg-muted text-muted-foreground",
  info: "bg-primary/10 text-primary dark:bg-primary/20",
};

/** Small tinted pill. Urgency lives here — never in page banners. */
export function StatusChip({
  tone = "neutral",
  className,
  children,
}: {
  tone?: ChipTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
