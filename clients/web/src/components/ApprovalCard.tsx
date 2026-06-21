"use client";

import { useState } from "react";
import { CheckCircle, XCircle, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ApprovalAction } from "@/lib/stream-agent";

interface ApprovalCardProps {
  action: ApprovalAction;
  status: "pending" | "approved" | "denied";
  onApprove: () => void;
  onDeny: () => void;
}

const ACTION_LABELS: Record<string, string> = {
  create_account: "Create Account",
  create_reminder: "Create Reminder",
  post_journal_entry: "Post Journal Entry",
};

export function ApprovalCard({ action, status, onApprove, onDeny }: ApprovalCardProps) {
  const [busy, setBusy] = useState(false);

  async function handleApprove() {
    setBusy(true);
    onApprove();
  }

  async function handleDeny() {
    setBusy(true);
    onDeny();
  }

  const actionLabel = ACTION_LABELS[action.action] ?? action.action;

  if (status === "approved") {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-[12px] text-emerald-700 my-2">
        <CheckCircle className="size-3.5 shrink-0" />
        <span><strong>{actionLabel}</strong> — approved</span>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-rose-200 bg-rose-50 text-[12px] text-rose-700 my-2">
        <XCircle className="size-3.5 shrink-0" />
        <span><strong>{actionLabel}</strong> — denied</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 my-3 space-y-3">
      <div className="flex items-start gap-2.5">
        <ShieldAlert className="size-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[12px] font-semibold text-amber-900">Action requires approval</span>
            <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700">
              {actionLabel}
            </Badge>
          </div>
          <p className="text-[12px] text-amber-800 leading-relaxed">{action.description}</p>

          {Object.keys(action.params).length > 0 && (
            <div className="mt-2 rounded-md bg-amber-100/70 border border-amber-200 px-3 py-2">
              <dl className="space-y-0.5">
                {Object.entries(action.params).map(([k, v]) => (
                  <div key={k} className="flex gap-2 text-[11px]">
                    <dt className="text-amber-600 font-medium min-w-[80px]">{k}</dt>
                    <dd className="text-amber-900 font-mono">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 justify-end">
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-[12px] border-rose-200 text-rose-700 hover:bg-rose-50"
          onClick={handleDeny}
          disabled={busy}
        >
          {busy ? <Loader2 className="size-3 animate-spin" /> : <XCircle className="size-3" />}
          <span className="ml-1.5">Deny</span>
        </Button>
        <Button
          size="sm"
          className="h-7 text-[12px] bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={handleApprove}
          disabled={busy}
        >
          {busy ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle className="size-3" />}
          <span className="ml-1.5">Approve</span>
        </Button>
      </div>
    </div>
  );
}
