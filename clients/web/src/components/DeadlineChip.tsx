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

  if (done) {
    return (
      <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium bg-muted text-muted-foreground">
        Done
      </span>
    );
  }
  if (days < 0) {
    return (
      <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium bg-rose-50 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300">
        {Math.abs(days)}d overdue
      </span>
    );
  }
  if (days === 0) {
    return (
      <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium bg-primary/12 text-primary">
        Today
      </span>
    );
  }
  if (days <= 14) {
    return (
      <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300 tabular-nums">
        {days}d
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium bg-muted text-muted-foreground tabular-nums">
      {days}d
    </span>
  );
}
