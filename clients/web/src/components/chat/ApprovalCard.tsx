"use client";

import { Check, X } from "lucide-react";
import type { ApprovalAction } from "@/lib/stream-agent";
import { cn } from "@/lib/utils";

/**
 * The loudest element in the drawer — a white card on navy. Nothing writes to
 * the ledger until the user explicitly approves.
 */
export function ApprovalCard({
  action,
  status,
  onApprove,
  onDeny,
}: {
  action: ApprovalAction;
  status: "pending" | "approved" | "denied";
  onApprove: () => void;
  onDeny: () => void;
}) {
  const params = action.params ?? {};
  const rows = Object.entries(params).filter(([, v]) => typeof v !== "object" || v === null);

  return (
    <div className={cn("rounded-lg bg-white text-foreground p-4", status !== "pending" && "opacity-75")}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--status-warning-text)]">
        Approval required
      </p>
      <p className="text-sm font-semibold mt-1">{action.description || action.action}</p>
      {rows.length > 0 && (
        <dl className="mt-2.5 space-y-1 border-t pt-2.5">
          {rows.slice(0, 6).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 text-[12px]">
              <dt className="text-muted-foreground">{k.replaceAll("_", " ")}</dt>
              <dd className="font-medium money text-right truncate">{String(v)}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="text-[11px] text-muted-foreground mt-2.5">Nothing is posted until you approve.</p>
      {status === "pending" ? (
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={onApprove}
            className="flex-1 h-9 rounded-md bg-foreground text-white text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-foreground/90 transition-colors"
          >
            <Check className="size-3.5" /> Approve
          </button>
          <button
            type="button"
            onClick={onDeny}
            className="flex-1 h-9 rounded-md border text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-black/5 transition-colors"
          >
            <X className="size-3.5" /> Deny
          </button>
        </div>
      ) : (
        <p
          className={cn(
            "mt-3 text-[12px] font-semibold",
            status === "approved" ? "text-[var(--status-success-text)]" : "text-destructive"
          )}
        >
          {status === "approved" ? "✓ Approved" : "✕ Denied"}
        </p>
      )}
    </div>
  );
}
