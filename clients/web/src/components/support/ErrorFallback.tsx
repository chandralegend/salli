"use client";

import { AlertTriangle, Bug, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toClientErrorInfo, type ClientErrorInfo } from "@/lib/diagnostics";
import { getRouteLabel } from "@/lib/nav";
import { useBugReport } from "@/lib/store";

/**
 * Shared crash screen for every error boundary in the app.
 *
 * The reassurance line is not filler: in a finance app a stack trace makes people
 * assume their ledger has been corrupted. Saying plainly that nothing was changed
 * is the most important sentence on the screen.
 */
export function ErrorFallback({
  error,
  clientError,
  digest,
  reset,
}: {
  error: Error;
  /**
   * Pre-built error info, if the caller has richer detail than `error` alone.
   * Next's boundaries receive only `{ error, reset }`, so in practice this is
   * null and the info is derived from `error` — meaning `component_stack` is
   * always null on these paths. The stack, `digest`, and the build sha are what
   * actually resolve a production crash against that deploy's sourcemaps.
   */
  clientError?: ClientErrorInfo | null;
  /** Next's server-error hash; the only join key for a server-render failure. */
  digest?: string;
  reset: () => void;
}) {
  const commit = process.env.NEXT_PUBLIC_COMMIT_SHA ?? "dev";

  function report() {
    const pathname = typeof window !== "undefined" ? window.location.pathname : "";
    useBugReport.getState().open({
      title: `Crash on ${pathname || "unknown page"}`,
      severity: "blocking",
      area: getRouteLabel(pathname) ?? undefined,
      clientError: clientError ?? toClientErrorInfo(error, null),
    });
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col items-start gap-4 rounded-lg border bg-card p-6">
      <div className="flex items-center gap-2.5">
        <AlertTriangle className="size-5 text-destructive" />
        <h2 className="text-[15px] font-semibold">Something broke on this page</h2>
      </div>

      <p className="text-[13px] text-muted-foreground leading-relaxed">
        Your data is safe and nothing was changed — this is a display problem, not a
        problem with your ledger. Try again, and if it keeps happening please send us a
        report so we can fix it.
      </p>

      <p className="font-mono text-xs text-muted-foreground">
        {digest ?? error.name} · build {commit}
      </p>

      <div className="flex items-center gap-2">
        <Button onClick={reset} variant="outline">
          <RotateCcw className="size-4" /> Try again
        </Button>
        <Button onClick={report}>
          <Bug className="size-4" /> Report this
        </Button>
      </div>
    </div>
  );
}
