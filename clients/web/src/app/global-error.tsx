"use client";

// REQUIRED. This file *replaces* the root layout, so app/layout.tsx's own
// `import "./globals.css"` is gone along with it. Without this line the fallback
// renders completely unstyled — the single most-missed detail in global-error.tsx.
import "./globals.css";

import { useState } from "react";

/**
 * Last-resort crash screen: takes over when the root layout itself fails.
 *
 * Everything here is deliberately self-contained. It imports nothing from
 * `@/lib/*` and nothing from `@/components/*`, because if the crash originated in a
 * module-scope throw somewhere in that graph, importing it here would crash the
 * fallback too. So the diagnostics object is built inline, the token is read
 * straight out of localStorage, and the disclosure uses native <details>.
 *
 * There are also no providers on this path: no QueryClient (useMutation would
 * throw "No QueryClient set"), no <Toaster/> (sonner renders nothing), no
 * ThemeProvider (no `dark` class, so the colours below are light-mode literals),
 * and no next/font variables on <html>.
 *
 * Note this only takes over in production builds; in dev the Next overlay wins.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  const commit = process.env.NEXT_PUBLIC_COMMIT_SHA ?? "dev";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  const context = {
    route: typeof location !== "undefined" ? location.pathname : null,
    page_title: typeof document !== "undefined" ? document.title : null,
    app_commit: commit,
    viewport:
      typeof window !== "undefined"
        ? { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio }
        : null,
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    language: typeof navigator !== "undefined" ? navigator.language : null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? null,
    client_error: {
      name: error.name,
      message: (error.message || "").slice(0, 1000),
      stack: error.stack ? error.stack.slice(0, 4000) : null,
      component_stack: null,
    },
  };

  async function send() {
    setState("sending");
    try {
      const token =
        typeof localStorage !== "undefined" ? localStorage.getItem("salli_token") : null;
      const res = await fetch(`${apiUrl}/bug-reports/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: `Fatal crash${error.digest ? ` (${error.digest})` : ""}`,
          description: "Sent from the global error screen.",
          severity: "blocking",
          area: null,
          contact_ok: true,
          file_ref: null,
          context,
        }),
      });
      setState(res.ok ? "sent" : "failed");
    } catch {
      setState("failed");
    }
  }

  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          background: "#ffffff",
          color: "#18181b",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div style={{ maxWidth: "34rem", width: "100%" }}>
          <h1 style={{ fontSize: "1.05rem", fontWeight: 600, marginBottom: "0.75rem" }}>
            Salli couldn&apos;t load
          </h1>

          <p style={{ fontSize: "0.85rem", lineHeight: 1.6, color: "#52525b" }}>
            Something failed before the app could start. Your data is safe and nothing
            was changed. Reloading usually fixes it — and sending us the report below
            tells us what went wrong.
          </p>

          <p
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: "0.72rem",
              color: "#71717a",
              margin: "0.9rem 0",
            }}
          >
            {error.digest ?? error.name} · build {commit}
          </p>

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button type="button" onClick={reset} style={buttonStyle(false)}>
              Try again
            </button>
            {/* Never auto-sends: the payload is shown and the user decides. */}
            <button
              type="button"
              onClick={send}
              disabled={state === "sending" || state === "sent"}
              style={buttonStyle(true)}
            >
              {state === "idle" && "Send report"}
              {state === "sending" && "Sending…"}
              {state === "sent" && "Report sent — thank you"}
              {state === "failed" && "Couldn't send — retry"}
            </button>
            <a href="/dashboard" style={{ ...buttonStyle(false), textDecoration: "none" }}>
              Go to dashboard
            </a>
          </div>

          <details style={{ marginTop: "1.25rem" }}>
            <summary
              style={{ fontSize: "0.8rem", color: "#71717a", cursor: "pointer" }}
            >
              What gets sent
            </summary>
            <pre
              style={{
                marginTop: "0.5rem",
                maxHeight: "16rem",
                overflow: "auto",
                background: "#f4f4f5",
                borderRadius: "0.375rem",
                padding: "0.75rem",
                fontSize: "0.68rem",
                lineHeight: 1.6,
              }}
            >
              {JSON.stringify(context, null, 2)}
            </pre>
            <p style={{ marginTop: "0.5rem", fontSize: "0.72rem", color: "#71717a" }}>
              Not included: your balances, amounts, account names, or your login token.
            </p>
          </details>
        </div>
      </body>
    </html>
  );
}

function buttonStyle(primary: boolean): React.CSSProperties {
  return {
    padding: "0.4rem 0.85rem",
    fontSize: "0.82rem",
    borderRadius: "0.375rem",
    border: primary ? "1px solid #18181b" : "1px solid #d4d4d8",
    background: primary ? "#18181b" : "#ffffff",
    color: primary ? "#ffffff" : "#18181b",
    cursor: "pointer",
    lineHeight: 1.4,
  };
}
