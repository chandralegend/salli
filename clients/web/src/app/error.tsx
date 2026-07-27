"use client";

import { useEffect } from "react";

import { BugReportDialog } from "@/components/support/BugReportDialog";
import { ErrorFallback } from "@/components/support/ErrorFallback";
import { recordUncaught, toClientErrorInfo } from "@/lib/diagnostics";

/**
 * Root segment boundary — covers the routes `(app)/error.tsx` does not: /login,
 * /signup, /onboarding, /auth/callback, /oauth/consent.
 *
 * Boundaries bubble to the nearest ancestor, and this one sits *inside* the root
 * layout, so Providers (QueryClient, Toaster, ThemeProvider) are all available.
 * AppShell is not mounted on these routes, so it renders its own BugReportDialog —
 * the store is global and the component is idempotent, and there is no second
 * instance in this tree.
 */
export default function RootError({
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
    <div className="flex min-h-[100dvh] items-center justify-center p-8">
      <ErrorFallback error={error} clientError={null} digest={error.digest} reset={reset} />
      <BugReportDialog />
    </div>
  );
}
