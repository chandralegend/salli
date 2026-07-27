"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";

import { ApiError } from "@/lib/api-error";
import { recordUncaught, toClientErrorInfo } from "@/lib/diagnostics";

/**
 * Captures the failures a React error boundary structurally cannot see.
 *
 * Boundaries only catch errors thrown during render and lifecycle, so an uncaught
 * promise rejection — the mechanism behind "I clicked it and nothing happened" —
 * is invisible to them. Lives here rather than in AppShell because Providers is
 * the one always-mounted client component on *every* route, including /login and
 * the OAuth consent screen, where failures are worth capturing too.
 */
function DiagnosticsListeners() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      // Resource-load failures (a broken <img>) fire a plain Event, not ErrorEvent.
      if (!(event instanceof ErrorEvent)) return;
      recordUncaught(toClientErrorInfo(event.error ?? new Error(event.message)));
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      // Already in the failures buffer with a status and request id; recording it
      // again as a client error would double-report every failed mutation.
      if (event.reason instanceof ApiError) return;
      recordUncaught(toClientErrorInfo(event.reason));
    };

    // addEventListener rather than window.onerror = so nothing gets clobbered.
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1 },
        },
      })
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        {children}
        <DiagnosticsListeners />
        <Toaster position="bottom-right" richColors closeButton />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
