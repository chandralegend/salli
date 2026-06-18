"use client";

import { Check, Loader2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeadlineChip } from "@/components/DeadlineChip";
import { useReminders } from "@/hooks/useReminders";

export default function RemindersPage() {
  const { reminders, markDone, seedCalendar } = useReminders();

  const items = reminders.data ?? [];
  const pending = items.filter((r) => r.status !== "done");
  const done = items.filter((r) => r.status === "done");

  return (
    <div className="p-6 max-w-[1280px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Reminders</h1>
          <p className="text-sm text-muted-foreground mt-1">
            IRD filing deadlines and tax obligations
          </p>
        </div>
        <Button
          onClick={() => seedCalendar.mutateAsync(undefined)}
          disabled={seedCalendar.isPending}
          variant="outline"
          className="border-border text-muted-foreground hover:text-foreground gap-2"
        >
          {seedCalendar.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Calendar className="w-4 h-4" />
          )}
          Seed filing calendar
        </Button>
      </div>

      {reminders.isLoading ? (
        <div className="flex flex-col gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-secondary rounded-[10px] animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-[16px] bg-card border border-border p-10 text-center">
          <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-base font-semibold text-foreground">
            No reminders yet
          </h2>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Seed the IRD filing calendar to get deadlines for YA 2025/26.
          </p>
          <Button
            onClick={() => seedCalendar.mutateAsync(undefined)}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Seed filing calendar
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {pending.length > 0 && (
            <div className="rounded-[16px] bg-card border border-border overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">
                  Pending ({pending.length})
                </h2>
              </div>
              <div className="divide-y divide-border">
                {pending.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between px-6 py-4"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {r.kind}
                      </p>
                      <p className="text-xs font-mono text-muted-foreground mt-0.5">
                        Due {r.due_date}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <DeadlineChip dueDate={r.due_date} />
                      <button
                        onClick={() => markDone.mutate(r.id)}
                        disabled={markDone.isPending}
                        className="w-8 h-8 rounded-full bg-secondary text-muted-foreground hover:bg-income/20 hover:text-income flex items-center justify-center transition-colors"
                        title="Mark done"
                      >
                        {markDone.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {done.length > 0 && (
            <div className="rounded-[16px] bg-card border border-border overflow-hidden opacity-60">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">
                  Completed ({done.length})
                </h2>
              </div>
              <div className="divide-y divide-border">
                {done.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between px-6 py-4"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground line-through">
                        {r.kind}
                      </p>
                      <p className="text-xs font-mono text-muted-foreground mt-0.5">
                        Due {r.due_date}
                      </p>
                    </div>
                    <DeadlineChip dueDate={r.due_date} done />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
