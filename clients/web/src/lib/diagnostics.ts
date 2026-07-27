/**
 * In-memory diagnostics for bug reports: a ring buffer of recent API failures,
 * plus the most recent uncaught client error.
 *
 * Deliberately has no React and no store imports, so an error boundary rendering
 * outside every provider can still read it.
 *
 * WHAT IS NEVER RECORDED HERE, and why:
 *
 * - **Response bodies.** FastAPI 422s echo the submitted value under
 *   `detail[].input`, and `ApiError.message` is literally the whole raw body. On
 *   this app that is amounts and entry descriptions. Only the status is kept.
 * - **Query strings.** `?bank=BOC` is mildly identifying and nothing in a query
 *   string is diagnostically necessary. Dropped unconditionally rather than by a
 *   "does this look sensitive" heuristic, which is exactly the kind of per-value
 *   guess that eventually guesses wrong.
 * - **URL fragments.** supabase.ts runs with `detectSessionInUrl: true`, so
 *   /auth/callback receives `#access_token=…&refresh_token=…`. Recording a URL
 *   from that route would ship a live session into a support ticket.
 */

export type FailureVia = "sdk" | "apiFetch" | "fetch";

export type Failure = {
  /** Epoch ms; converted to a relative ago_ms at collection time. */
  t: number;
  via: FailureVia;
  method: string;
  /** 0 means no HTTP response at all — network error, abort, or CORS. */
  status: number;
  path_template: string;
  request_id: string | null;
};

export type ClientErrorInfo = {
  name: string;
  message: string;
  stack: string | null;
  component_stack: string | null;
};

/**
 * 20 entries (~2 KB of JSON) covers the realistic "everything is broken" case:
 * a full page of parallel queries, doubled by React Query's `retry: 1`, plus a
 * route change. Beyond that you are collecting noise, and `ago_ms` already makes
 * stale entries self-evidently irrelevant.
 */
const CAP = 20;

const MAX_MESSAGE = 1_000;
const MAX_STACK = 4_000;
const MAX_COMPONENT_STACK = 2_000;

/** An uncaught error older than this is unrelated to what the user is reporting. */
const UNCAUGHT_TTL_MS = 5 * 60_000;

const buffer: Failure[] = [];
let lastUncaught: (ClientErrorInfo & { t: number }) | null = null;

export function recordFailure(failure: Omit<Failure, "t">): void {
  // Never record our own submission. It goes through apiFetch, so a failed
  // submit would otherwise be included in the next attempt's payload and
  // compound on every retry.
  if (failure.path_template.startsWith("/bug-reports")) return;

  buffer.push({ ...failure, t: Date.now() });
  if (buffer.length > CAP) buffer.shift();
}

export function recentFailures(now = Date.now()) {
  return buffer.map((f) => ({
    ago_ms: Math.max(0, now - f.t),
    method: f.method,
    status: f.status,
    path_template: f.path_template,
    request_id: f.request_id,
  }));
}

/** Test/debug helper — not used by the app. */
export function clearDiagnostics(): void {
  buffer.length = 0;
  lastUncaught = null;
}

export function recordUncaught(info: ClientErrorInfo): void {
  lastUncaught = { ...info, t: Date.now() };
}

export function lastUncaughtError(): ClientErrorInfo | null {
  if (!lastUncaught) return null;
  if (Date.now() - lastUncaught.t > UNCAUGHT_TTL_MS) return null;
  return {
    name: lastUncaught.name,
    message: lastUncaught.message,
    stack: lastUncaught.stack,
    component_stack: lastUncaught.component_stack,
  };
}

/**
 * Normalise an unknown thrown value into a bounded, serialisable shape.
 * A deep React component stack can run to tens of kilobytes, hence the caps.
 */
export function toClientErrorInfo(
  error: unknown,
  componentStack: string | null = null,
): ClientErrorInfo {
  if (error instanceof Error) {
    return {
      name: error.name || "Error",
      message: (error.message || "").slice(0, MAX_MESSAGE),
      stack: error.stack ? error.stack.slice(0, MAX_STACK) : null,
      component_stack: componentStack ? componentStack.slice(0, MAX_COMPONENT_STACK) : null,
    };
  }
  return {
    name: "UnknownError",
    message: String(error).slice(0, MAX_MESSAGE),
    stack: null,
    component_stack: componentStack ? componentStack.slice(0, MAX_COMPONENT_STACK) : null,
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * "/accounts/3f9c…-…/overview?bank=BOC" → "/accounts/{id}/overview"
 *
 * The over-24-characters rule is unconditional rather than a judgement about
 * whether a segment looks like a secret — a length check cannot be wrong in the
 * leaky direction, whereas a content heuristic can.
 */
export function pathTemplate(pathOrUrl: string): string {
  let path = pathOrUrl || "";

  if (/^https?:\/\//i.test(path)) {
    try {
      path = new URL(path).pathname;
    } catch {
      // Leave it as-is; the segment rules below still apply.
    }
  }

  path = path.split("?")[0].split("#")[0];

  return path
    .split("/")
    .map((segment) => {
      if (!segment) return segment;
      if (UUID_RE.test(segment)) return "{id}";
      if (/^\d+$/.test(segment)) return "{n}";
      if (segment.length > 24) return "{opaque}";
      return segment;
    })
    .join("/");
}

/** Read the correlation id off a response, if the API exposed it via CORS. */
export function requestIdOf(response: Response | undefined | null): string | null {
  try {
    return response?.headers.get("X-Request-Id") ?? null;
  } catch {
    return null;
  }
}
