"use client";

import { useState } from "react";
import { ShieldCheck, ShieldX } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusChip } from "@/components/shared/StatusChip";
import { Skeleton } from "@/components/ui/skeleton";
import { AuditParams } from "@/components/audit/AuditParams";
import { useAuditLog, type AuditLogEntry } from "@/hooks/useAuditLog";
import { cn } from "@/lib/utils";

const FILTERS = ["all", "approved", "denied"] as const;
type Filter = (typeof FILTERS)[number];

const FILTER_LABEL: Record<Filter, string> = {
  all: "All",
  approved: "Approved",
  denied: "Denied",
};

/** Full timestamp → "Apr 5, 2026, 2:30 PM"; falls back to the raw string. */
function formatTimestamp(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function AuditRow({ entry }: { entry: AuditLogEntry }) {
  const approved = entry.decision === "approved";
  return (
    <div className="flex gap-3 px-4 py-3.5">
      <div
        className={cn(
          "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg",
          approved ? "bg-[var(--status-success-bg)]" : "bg-[var(--status-danger-bg)]"
        )}
      >
        {approved ? (
          <ShieldCheck className="size-4 text-[var(--status-success-text)]" />
        ) : (
          <ShieldX className="size-4 text-[var(--status-danger-text)]" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold capitalize">{entry.action.replace(/_/g, " ")}</p>
          <StatusChip tone={approved ? "success" : "danger"} className="capitalize">
            {entry.decision}
          </StatusChip>
        </div>
        <p className="mt-0.5 font-mono text-xs text-muted-foreground">{formatTimestamp(entry.created_at)}</p>
        <AuditParams params={entry.params} />
      </div>
    </div>
  );
}

export default function AuditLogPage() {
  const entries = useAuditLog();
  const [filter, setFilter] = useState<Filter>("all");

  const all = entries.data ?? [];
  const approved = all.filter((e) => e.decision === "approved").length;
  const denied = all.filter((e) => e.decision === "denied").length;

  const visible = [...all]
    .filter((e) => (filter === "all" ? true : e.decision === filter))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const empty = !entries.isLoading && all.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        subtitle="Every write action Salli AI proposed, and how it was decided"
      />

      {/* Summary strip */}
      <div className={cn("grid grid-cols-3 gap-4", empty && "opacity-50")}>
        <StatCard label="Total" value={all.length} loading={entries.isLoading} />
        <StatCard label="Approved" value={approved} loading={entries.isLoading} />
        <StatCard label="Denied" value={denied} loading={entries.isLoading} />
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const active = filter === f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full border px-3.5 py-1 text-[13px] font-medium transition-colors",
                active
                  ? "border-foreground bg-foreground text-background"
                  : "bg-card text-muted-foreground hover:bg-accent/40"
              )}
            >
              {FILTER_LABEL[f]}
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="rounded-lg border bg-card">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <h2 className="text-[15px] font-semibold">Actions</h2>
          <StatusChip tone="neutral">{visible.length}</StatusChip>
        </div>
        {entries.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title={all.length === 0 ? "No AI actions yet" : `No ${filter} actions`}
            body={
              all.length === 0
                ? "When Salli AI proposes a write action, it is recorded here with whether you approved or denied it."
                : "Try a different filter to see other decisions."
            }
          />
        ) : (
          <div className="divide-y">
            {visible.map((e, i) => (
              <AuditRow key={`${e.created_at}-${i}`} entry={e} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
