"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { PageShell, PageHeader } from "@/components/ui/page-shell";
import { useAuditLog, type AuditLogEntry } from "@/hooks/useAuditLog";

function fmtDate(s: string) {
  return new Date(s).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AuditLogPage() {
  const auditLog = useAuditLog();

  const columns: ColumnDef<AuditLogEntry>[] = [
    { accessorKey: "created_at", header: "Time", cell: ({ row }) => <span className="text-[12px] text-muted-foreground whitespace-nowrap">{fmtDate(row.original.created_at)}</span> },
    { accessorKey: "action", header: "Action", cell: ({ row }) => <span className="text-[13px] font-mono font-medium">{row.original.action}</span> },
    {
      accessorKey: "params",
      header: "Params",
      cell: ({ row }) => (
        <span className="text-[12px] text-muted-foreground font-mono truncate block max-w-md">
          {JSON.stringify(row.original.params)}
        </span>
      ),
    },
    {
      accessorKey: "decision",
      header: "Decision",
      cell: ({ row }) => (
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${row.original.decision === "approved" ? "badge-success" : "badge-danger"}`}>
          {row.original.decision}
        </span>
      ),
    },
  ];

  return (
    <PageShell>
      <PageHeader title="Audit Log" subtitle="Every agent-initiated write, approved or denied" />
      <div className="rounded-2xl border bg-card overflow-hidden">
        <DataTable
          columns={columns}
          data={auditLog.data ?? []}
          isLoading={auditLog.isLoading}
          emptyNode={<span className="text-[13px] text-muted-foreground">No agent write actions recorded yet.</span>}
          searchPlaceholder="Search actions…"
          searchColumn="action"
        />
      </div>
    </PageShell>
  );
}
