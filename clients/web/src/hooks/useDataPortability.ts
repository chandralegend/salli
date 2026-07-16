"use client";

import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch";
import { API_URL } from "@/lib/api-client";
import { getStoredToken } from "@/lib/store";

/** Best-effort decode of the `email` claim from a Supabase JWT. Returns null
 * for dev-mode tokens (which are just the raw user id, not a JWT) or if
 * decoding fails for any reason. */
export function decodeEmailFromToken(token: string | null): string | null {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const claims = JSON.parse(json) as { email?: string };
    return claims.email ?? null;
  } catch {
    return null;
  }
}

export async function downloadDataExport() {
  const data = await apiFetch<Record<string, unknown>>("GET", "/onboarding/export");
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "salli-data-export.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: async (confirmEmail: string) => {
      const token = getStoredToken();
      const res = await fetch(`${API_URL}/onboarding/account`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ confirm_email: confirmEmail }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(body.detail ?? `HTTP ${res.status}`);
      }
      return res.json() as Promise<{ deleted: boolean; counts: Record<string, number> }>;
    },
  });
}
