"use client";

import { version as reactVersion } from "react";

import {
  lastUncaughtError,
  recentFailures,
  type ClientErrorInfo,
} from "./diagnostics";
import {
  getOnboardingComplete,
  getStoredToken,
  getTourComplete,
  useScroogePanel,
} from "./store";
import { isSupabaseConfigured } from "./supabase";

/**
 * The `exp` claim of the stored bearer token, or null.
 *
 * Parses ONLY `exp` — never `sub`, never `email`, and the token string itself
 * never enters the returned object. "Their session silently expired" is a common
 * root cause that is invisible to the user: they see a wall of failures, not an
 * auth prompt. A past `token_exp` sitting next to a run of 401s in
 * `recent_failures` turns a multi-message support thread into a one-line
 * diagnosis.
 *
 * Every step is allowed to fail, because in local dev the "token" is a bare user
 * id rather than a JWT.
 */
function tokenExp(): number | null {
  const token = getStoredToken();
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null; // dev-login token, not a JWT

  try {
    let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    b64 += "=".repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(atob(b64)) as { exp?: unknown };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

/**
 * Builds the diagnostic snapshot attached to a bug report.
 *
 * THIS IS AN ALLOW-LIST. Every field below is written by hand from a named
 * source. There is no spread, no Object.assign, no deep copy of application
 * state, and the function accepts no store object and no queryClient — so a new
 * piece of user data cannot arrive here by being added somewhere else. Adding a
 * field requires adding a line, which is the point.
 *
 * DELIBERATELY EXCLUDED, and why:
 *
 * - `getStoredToken()`'s value / localStorage["salli_token"] — a live bearer for
 *   the user's entire financial account. tokenExp() above reads it locally and
 *   returns one integer.
 * - `sb-<ref>-auth-token` — supabase.ts runs with `persistSession: true`, so this
 *   holds a *refresh* token: durable account takeover, and it does not expire on
 *   its own. This is also why this function names each localStorage key it wants
 *   instead of iterating Object.keys(localStorage).
 * - `window.location.href` / `.search` / `.hash` — `detectSessionInUrl: true`
 *   means /auth/callback receives `#access_token=…&refresh_token=…`. Pathname only.
 * - `usePageHeader.subtitle` and `.actions` — typed ReactNode, and pages set them
 *   to interpolated live figures ("Net worth LKR 12,480,000"). `document.title`
 *   is the static route name and is the safe substitute.
 * - `useScroogePanel.pendingPrompt` — user-authored free text about their own
 *   money. `agent_thread_id` gives support the same conversation server-side.
 * - Any queryClient cache dump — that *is* the ledger: accounts, trial balance,
 *   tax computation, holdings, debts. Structurally impossible here, since this
 *   function takes no queryClient.
 * - All balances, amounts, account names, entry descriptions, tickers, policy
 *   numbers — no source line exists for them.
 * - Failure response bodies — FastAPI 422s echo `detail[].input`. See diagnostics.ts.
 * - `profile.email` / `display_name` / `user_id` — the backend attaches these from
 *   the JWT. Sending them from the body would make the contact-back opt-in
 *   decorative.
 * - `document.cookie`, `performance.getEntries()` — credentials, and full URLs
 *   with ids and query strings.
 */
export function collectReportContext(clientError?: ClientErrorInfo | null) {
  const now = Date.now();
  const hasWindow = typeof window !== "undefined";
  const hasDocument = typeof document !== "undefined";
  const hasNavigator = typeof navigator !== "undefined";

  return {
    // Where they were
    route: hasWindow ? window.location.pathname : null,
    page_title: hasDocument ? document.title : null,

    // What they were running
    app_commit: process.env.NEXT_PUBLIC_COMMIT_SHA ?? "dev",
    react_version: reactVersion,

    // Their environment
    viewport: hasWindow
      ? { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio }
      : null,
    user_agent: hasNavigator ? navigator.userAgent : null,
    language: hasNavigator ? navigator.language : null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? null,
    // Read off the <html> class rather than useTheme(), so this stays a plain
    // function callable from a boundary rendered outside ThemeProvider.
    theme:
      hasDocument && document.documentElement.classList.contains("dark") ? "dark" : "light",

    // Auth shape — never the token itself
    supabase_configured: isSupabaseConfigured(),
    token_exp: tokenExp(),

    // Session correlation. threadId is a crypto.randomUUID() that indexes the
    // server-side LangGraph checkpoint, so support can pull the exact conversation
    // from data already under this user's own row without the client sending any.
    agent_thread_id: useScroogePanel.getState().threadId,
    onboarding_complete: getOnboardingComplete(),
    tour_complete: getTourComplete(),

    // Technical failures
    recent_failures: recentFailures(now),
    client_error: clientError ?? lastUncaughtError(),
  };
}

export type ReportContext = ReturnType<typeof collectReportContext>;
