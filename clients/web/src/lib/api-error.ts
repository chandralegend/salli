/**
 * Shared API error type and message extraction.
 *
 * `ApiError` lives here rather than in api-fetch.ts to break an import cycle:
 * api-fetch.ts imports API_URL from api-client.ts, so api-client.ts (which needs
 * to construct an ApiError inside its error interceptor) cannot import from
 * api-fetch.ts. api-fetch.ts re-exports it, so existing call sites are unchanged.
 */

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * Turn a FastAPI error body into one human-readable line.
 *
 * Deliberately reads only `detail` — never `detail[].input`, which echoes the
 * value the user submitted. On this app that means amounts and entry
 * descriptions, so surfacing it in a toast (or capturing it in a bug report)
 * would leak financial data through an error path.
 */
export function messageFrom(body: unknown, status: number): string {
  if (typeof body === "string" && body.trim()) return body;

  if (body && typeof body === "object") {
    const detail = (body as { detail?: unknown }).detail;

    if (typeof detail === "string") return detail;

    if (Array.isArray(detail)) {
      const first = detail[0] as { msg?: string; loc?: unknown[] } | undefined;
      if (first?.msg) {
        const field = Array.isArray(first.loc)
          ? first.loc.filter((segment) => segment !== "body").join(".")
          : "";
        return field ? `${field}: ${first.msg}` : first.msg;
      }
    }

    // Structured details, e.g. the quota and rate-limit payloads.
    if (detail && typeof detail === "object") {
      const error = (detail as { error?: unknown }).error;
      if (typeof error === "string") return error.replace(/_/g, " ");
    }
  }

  return status
    ? `Request failed (${status})`
    : "Network error — check your connection.";
}
