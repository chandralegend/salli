import { useMutation } from "@tanstack/react-query";
import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";
import { apiFetch } from "@/lib/api-fetch";
import { API_URL } from "@/lib/api-client";
import { useSalliStore } from "@/lib/store";

/** Mirrors clients/web/src/hooks/useDataPortability.ts */

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
  const json = JSON.stringify(data, null, 2);
  const file = new File(Paths.cache, "salli-data-export.json");
  file.write(json);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: "application/json", UTI: "public.json" });
  }
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: async (confirmEmail: string) => {
      const token = useSalliStore.getState().token;
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
