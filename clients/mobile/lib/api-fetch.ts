import { API_URL } from "./api-client";
import { useSalliStore } from "./store";

/** Mirrors clients/web/src/lib/api-fetch.ts — for endpoints not in the generated SDK. */
export async function apiFetch<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = useSalliStore.getState().token;
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
