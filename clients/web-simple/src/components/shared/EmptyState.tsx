import type { LucideIcon } from "lucide-react";

/** Every empty state teaches the single next step. */
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6 gap-2">
      <div className="size-12 rounded-lg bg-muted flex items-center justify-center mb-1">
        <Icon className="size-6 text-muted-foreground" />
      </div>
      <p className="text-[15px] font-semibold">{title}</p>
      <p className="text-[13px] text-muted-foreground max-w-sm">{body}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
