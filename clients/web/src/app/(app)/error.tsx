"use client";

import { useEffect } from "react";

import { ErrorFallback } from "@/components/support/ErrorFallback";
import { recordUncaught, toClientErrorInfo } from "@/lib/diagnostics";

/**
 * Boundary for the authenticated app — the primary crash surface users will hit.
 *
 * In the App Router `error.tsx` wraps the segment's *page* while the segment's
 * layout stays outside it. So this renders inside `(app)/layout.tsx`, which means
 * TourProvider, AppShell, and the mounted BugReportDialog are all still live: a
 * crashing page keeps its sidebar and header, and "Report this" opens the full
 * dialog with the payload preview.
 *
 * That nesting is also why there is no client class boundary in AppShell. This
 * boundary sits *closer* to the throw than anything mounted at the layout level,
 * so it always wins — and unlike a class boundary it also catches server-render
 * errors. The tradeoff is that React's component stack is not available here
 * (Next passes only `{ error, reset }`); `error.digest` plus the build sha are the
 * join keys instead.
 */
export default function AppSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    recordUncaught(toClientErrorInfo(error, null));
  }, [error]);

  return (
    <div className="py-10">
      <ErrorFallback error={error} clientError={null} digest={error.digest} reset={reset} />
    </div>
  );
}
