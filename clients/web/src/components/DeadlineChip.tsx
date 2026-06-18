import { cn } from "@/lib/utils";

interface DeadlineChipProps {
  dueDate: string;
  done?: boolean;
}

function getDaysUntil(dateStr: string): number {
  const due = new Date(dateStr);
  const now = new Date();
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function DeadlineChip({ dueDate, done }: DeadlineChipProps) {
  const days = getDaysUntil(dueDate);

  const variant = done
    ? "done"
    : days < 0
    ? "overdue"
    : days <= 14
    ? "upcoming"
    : "future";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold",
        variant === "done" && "bg-income/10 text-income",
        variant === "overdue" && "bg-expense/10 text-expense",
        variant === "upcoming" && "bg-warning/10 text-warning",
        variant === "future" && "bg-secondary text-muted-foreground"
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          variant === "done" && "bg-income",
          variant === "overdue" && "bg-expense",
          variant === "upcoming" && "bg-warning",
          variant === "future" && "bg-muted-foreground"
        )}
      />
      {done
        ? "Done"
        : days < 0
        ? `${Math.abs(days)}d overdue`
        : days === 0
        ? "Today"
        : `${days}d`}
    </span>
  );
}
