"use client";

import { Bug } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useBugReport } from "@/lib/store";

/**
 * Settings card. Matches the page's hand-rolled card shape (settings/page.tsx does
 * not use the Card component) and spans both columns, since McpConnectionsCard and
 * DangerZone are also full width — a half-width card would sit alone in a row.
 */
export function HelpFeedbackCard() {
  const open = useBugReport((s) => s.open);
  const commit = process.env.NEXT_PUBLIC_COMMIT_SHA ?? "dev";

  return (
    <div className="rounded-lg border bg-card p-5 lg:col-span-2">
      <h2 className="text-[15px] font-semibold mb-3">Help &amp; feedback</h2>
      <p className="text-[13px] text-muted-foreground leading-relaxed">
        Something broken, confusing, or missing? Tell us. Reports include a small
        technical snapshot of your browser and any recent failed requests — never your
        balances, amounts, or account names — and you can review exactly what&apos;s
        attached before sending. You can add your own screenshot too.
      </p>
      <div className="flex items-center gap-2 mt-4">
        <Button variant="outline" onClick={() => open()}>
          <Bug className="size-4" /> Report a problem
        </Button>
      </div>
      {/* "Which version are you on?" is the first support question — surfacing it
          here means the user can read it out even if the report never sends. */}
      <p className="text-xs text-muted-foreground mt-3 font-mono">Build {commit}</p>
    </div>
  );
}
