import { API_URL } from "./api-client";
import { ApiError, messageFrom } from "./api-error";
import { pathTemplate, recordFailure, requestIdOf } from "./diagnostics";
import { getStoredToken } from "./store";

// ApiError moved to api-error.ts to break an import cycle (api-client.ts needs it
// inside its error interceptor, and this module imports API_URL from there).
// Re-exported so existing call sites keep working unchanged.
export { ApiError };

export async function apiFetch<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = getStoredToken();
  const template = pathTemplate(path);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    // status 0 == no HTTP response at all: offline, DNS, CORS, or abort.
    recordFailure({
      via: "apiFetch",
      method,
      status: 0,
      path_template: template,
      request_id: null,
    });
    throw err;
  }

  if (!res.ok) {
    recordFailure({
      via: "apiFetch",
      method,
      status: res.status,
      path_template: template,
      request_id: requestIdOf(res),
    });

    const text = await res.text().catch(() => "");
    let parsed: unknown = text;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Not JSON — messageFrom handles the raw string.
    }
    // Routed through messageFrom rather than thrown raw: this previously used the
    // entire response body as the error message, and callers toast that verbatim —
    // so a 422 displayed a JSON blob containing the values the user had submitted.
    throw new ApiError(res.status, messageFrom(parsed, res.status));
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
