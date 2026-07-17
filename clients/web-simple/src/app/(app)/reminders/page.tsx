"use client";

import { useState } from "react";
import { CalendarClock, CalendarPlus, Check, ChevronRight, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusChip } from "@/components/shared/StatusChip";
import { useReminders, type Reminder } from "@/hooks/useReminders";
import { daysUntil, deadlineLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

type Bucket = "overdue" | "due-soon" | "upcoming";

function bucketOf(r: Reminder): Bucket {
  const d = daysUntil(r.due_date);
  if (d < 0) return "overdue";
  if (d <= 30) return "due-soon";
  return "upcoming";
}

const BUCKET_META: Record<Bucket, { label: string; caption: string; tone: "danger" | "warning" | "neutral"; border: string }> = {
  overdue: { label: "Overdue", caption: "needs attention", tone: "danger", border: "border-l-[var(--status-danger-text)]" },
  "due-soon": { label: "Due Soon", caption: "within 30 days", tone: "warning", border: "border-l-[var(--status-warning-text)]" },
  upcoming: { label: "Upcoming", caption: "scheduled", tone: "neutral", border: "border-l-border" },
};

function CreateDialog({
  open,
  onOpenChange,
  onSubmit,
  pending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (data: { kind: string; due_date: string }) => void;
  pending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New reminder</DialogTitle>
          <DialogDescription>A deadline Salli should keep in view.</DialogDescription>
        </DialogHeader>
        {open && <CreateForm onSubmit={onSubmit} onCancel={() => onOpenChange(false)} pending={pending} />}
      </DialogContent>
    </Dialog>
  );
}

function CreateForm({
  onSubmit,
  onCancel,
  pending,
}: {
  onSubmit: (data: { kind: string; due_date: string }) => void;
  onCancel: () => void;
  pending: boolean;
}) {
  const [kind, setKind] = useState("");
  const [dueDate, setDueDate] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ kind: kind.trim(), due_date: dueDate });
      }}
      className="space-y-4"
    >
      <div className="space-y-1.5">
        <Label htmlFor="rem-kind">What needs doing?</Label>
        <Input
          id="rem-kind"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          placeholder="e.g. Collect APIT certificate from employer"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="rem-date">Due date</Label>
        <Input id="rem-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending || !kind.trim() || !dueDate}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : "Add reminder"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function RemindersPage() {
  const { reminders, markDone, deleteReminder, seedCalendar, createReminder } = useReminders();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleting, setDeleting] = useState<Reminder | null>(null);
  const [filter, setFilter] = useState<Bucket | null>(null);
  const [completedOpen, setCompletedOpen] = useState(false);

  const all = reminders.data ?? [];
  const pending = all
    .filter((r) => r.status !== "done")
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
  const completed = all.filter((r) => r.status === "done");

  const counts: Record<Bucket, number> = { overdue: 0, "due-soon": 0, upcoming: 0 };
  for (const r of pending) counts[bucketOf(r)]++;

  const visible = filter ? pending.filter((r) => bucketOf(r) === filter) : pending;
  // Overdue first, then by date
  const ordered = [...visible].sort((a, b) => {
    const ao = bucketOf(a) === "overdue" ? 0 : 1;
    const bo = bucketOf(b) === "overdue" ? 0 : 1;
    return ao - bo || a.due_date.localeCompare(b.due_date);
  });

  const empty = !reminders.isLoading && all.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reminders"
        subtitle="IRD deadlines and personal follow-ups"
        actions={
          <>
            <Button variant="outline" onClick={() => seedCalendar.mutate("2025/26")} disabled={seedCalendar.isPending}>
              {seedCalendar.isPending ? <Loader2 className="size-4 animate-spin" /> : <CalendarPlus className="size-4" />}
              Seed IRD calendar
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" /> New
            </Button>
          </>
        }
      />

      {/* Summary tiles — also filters */}
      <div className={cn("grid grid-cols-3 gap-4", empty && "opacity-50")}>
        {(Object.keys(BUCKET_META) as Bucket[]).map((b) => {
          const meta = BUCKET_META[b];
          const active = filter === b;
          return (
            <button
              key={b}
              type="button"
              onClick={() => setFilter(active ? null : b)}
              className={cn(
                "rounded-lg border border-l-[3px] bg-card p-4 text-left transition-colors",
                meta.border,
                active ? "border-2 border-l-[3px] border-foreground" : "hover:bg-accent/40"
              )}
            >
              <p className="eyebrow">{meta.label}</p>
              <p className="money text-[28px] font-semibold mt-1">{counts[b]}</p>
              <p className="text-xs text-muted-foreground">{meta.caption}</p>
            </button>
          );
        })}
      </div>

      {/* Pending list */}
      <div className="rounded-lg border bg-card">
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <h2 className="text-[15px] font-semibold">Pending</h2>
          <StatusChip tone="neutral">{visible.length}</StatusChip>
          {filter && (
            <button type="button" className="text-xs text-muted-foreground hover:underline ml-2" onClick={() => setFilter(null)}>
              clear filter
            </button>
          )}
        </div>
        {reminders.isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : ordered.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No reminders yet"
            body="Track IRD deadlines and money tasks in one place. Start with the official YA 2025/26 filing calendar."
            action={
              <div className="flex gap-2">
                <Button size="sm" onClick={() => seedCalendar.mutate("2025/26")} disabled={seedCalendar.isPending}>
                  Seed IRD calendar
                </Button>
                <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
                  Add reminder
                </Button>
              </div>
            }
          />
        ) : (
          <div className="divide-y">
            {ordered.map((r) => {
              const bucket = bucketOf(r);
              return (
                <div key={r.id} className="group flex items-center gap-3 px-4 py-3">
                  <button
                    type="button"
                    aria-label="Mark done"
                    title="Mark done"
                    onClick={() => markDone.mutate(r.id)}
                    className="size-7 shrink-0 rounded-full border flex items-center justify-center text-transparent hover:text-primary-foreground hover:bg-foreground hover:border-foreground transition-colors"
                  >
                    <Check className="size-3.5" />
                  </button>
                  <p className="text-sm font-medium flex-1 min-w-0 truncate">{r.kind}</p>
                  <span className="font-mono text-xs text-muted-foreground shrink-0">{r.due_date}</span>
                  <StatusChip tone={BUCKET_META[bucket].tone}>{deadlineLabel(r.due_date)}</StatusChip>
                  <button
                    type="button"
                    aria-label="Delete reminder"
                    onClick={() => setDeleting(r)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity shrink-0"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Completed */}
      {completed.length > 0 && (
        <Collapsible open={completedOpen} onOpenChange={setCompletedOpen}>
          <CollapsibleTrigger
            render={<button type="button" className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground" />}
          >
            <ChevronRight className={cn("size-3.5 transition-transform", completedOpen && "rotate-90")} />
            Completed ({completed.length})
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="rounded-lg border bg-card divide-y mt-2">
              {completed.map((r) => (
                <div key={r.id} className="group flex items-center gap-3 px-4 py-3 opacity-50">
                  <span className="size-7 shrink-0 rounded-full bg-[var(--status-success-bg)] flex items-center justify-center">
                    <Check className="size-3.5 text-[var(--status-success-text)]" />
                  </span>
                  <p className="text-sm line-through flex-1 min-w-0 truncate">{r.kind}</p>
                  <span className="font-mono text-xs text-muted-foreground">{r.due_date}</span>
                  <button
                    type="button"
                    aria-label="Delete reminder"
                    onClick={() => setDeleting(r)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      <CreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        pending={createReminder.isPending}
        onSubmit={(data) => createReminder.mutate(data, { onSuccess: () => setCreateOpen(false) })}
      />

      <AlertDialog open={Boolean(deleting)} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete reminder?</AlertDialogTitle>
            <AlertDialogDescription>{deleting ? `“${deleting.kind}”` : ""} will be removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleting) deleteReminder.mutate(deleting.id);
                setDeleting(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
