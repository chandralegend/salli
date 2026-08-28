"use client";

import Link from "next/link";
import { TriangleAlert } from "lucide-react";

/**
 * 402 quota_exceeded → quiet amber banner linking to Settings.
 *
 * There is one balance now, so the old per-metric label map is gone. What the
 * server does send is `cost` and `balance`, which is far more useful than a
 * label: "needs 30 credits, you have 12" tells someone what to do, where "out
 * of credits" only tells them they cannot.
 */
export function QuotaBanner({ cost, balance }: { cost?: number; balance?: number }) {
  const detail =
    typeof cost === "number" && typeof balance === "number" && cost > 0
      ? `Needs ${cost.toLocaleString()} credits, you have ${balance.toLocaleString()}`
      : "Out of AI credits";
  return (
    <div className="flex items-center gap-2 rounded-md bg-[var(--status-warning-bg)] px-3 py-2 text-[13px] text-[var(--status-warning-text)]">
      <TriangleAlert className="size-4 shrink-0" />
      <span>
        {detail} ·{" "}
        <Link href="/settings" className="font-semibold underline underline-offset-2">
          Top up or upgrade
        </Link>
      </span>
    </div>
  );
}
