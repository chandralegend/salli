import { ApiError, messageFrom } from "./api-error";
import { client } from "./api/client.gen";
import { pathTemplate, recordFailure, requestIdOf } from "./diagnostics";
import { getStoredToken } from "./store";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

client.setConfig({
  baseUrl: API_URL,
});

client.interceptors.request.use((request) => {
  const token = getStoredToken();
  if (token) {
    const headers = new Headers(request.headers);
    headers.set("Authorization", `Bearer ${token}`);
    return new Request(request, { headers });
  }
  return request;
});

/**
 * The only place an SDK failure's HTTP status exists.
 *
 * The generated client throws the *parsed response body* rather than an Error
 * (see api/client/client.gen.ts: `throw jsonError ?? textError`), and by the time
 * that value reaches a React Query `onError` the Response — and with it the status
 * and headers — is gone. So this interceptor does two jobs:
 *
 * 1. Records the failure for bug reports (status, method, path, request id).
 * 2. Wraps the thrown value into a real ApiError. Every `onError` in src/hooks
 *    does `e instanceof Error ? e.message : "Unknown error"`, so without this
 *    wrap users see literally "Unknown error" on every failed mutation, and
 *    EntryDialog's inline `serverError` line is permanently null.
 *
 * This cannot change throw-vs-return behaviour: `throwOnError` defaults to false
 * and is opted into per call, and the interceptor only substitutes the value the
 * client's own `if (throwOnError) throw` then throws.
 */
client.interceptors.error.use((error, response, request, options) => {
  // `options.url` is the OpenAPI path template ("/accounts/{account_id}"), not
  // the interpolated URL, so it needs no normalising. `request` may be undefined
  // when the failure happened while building the request.
  const template =
    typeof options?.url === "string" ? options.url : pathTemplate(request?.url ?? "");

  recordFailure({
    via: "sdk",
    method: String(options?.method ?? request?.method ?? "GET").toUpperCase(),
    status: response?.status ?? 0,
    path_template: template,
    request_id: requestIdOf(response),
  });

  // Network TypeErrors and AbortErrors are already real Errors — leave them be.
  if (error instanceof Error) return error;

  const status = response?.status ?? 0;
  return new ApiError(status, messageFrom(error, status));
});

export { client, API_URL };
