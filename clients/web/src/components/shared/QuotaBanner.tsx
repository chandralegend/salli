"use client";

import Link from "next/link";
import { TriangleAlert } from "lucide-react";

const METRIC_LABELS: Record<string, string> = {
  agent_messages: "AI messages",
  statement_uploads: "statement uploads",
  advisor_runs: "advisor runs",
};

/** 402 quota_exceeded → quiet amber banner linking to the upgrade dialog. */
export function QuotaBanner({ metric }: { metric?: string }) {
  const label = (metric && METRIC_LABELS[metric]) || "quota";
  return (
    <div className="flex items-center gap-2 rounded-md bg-[var(--status-warning-bg)] px-3 py-2 text-[13px] text-[var(--status-warning-text)]">
      <TriangleAlert className="size-4 shrink-0" />
      <span>
        Monthly {label} used up ·{" "}
        <Link href="/settings?upgrade=1" className="font-semibold underline underline-offset-2">
          Upgrade
        </Link>
      </span>
    </div>
  );
}
