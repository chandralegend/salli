"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, apiFetch } from "@/lib/api-fetch";

export type LlmProvider = "anthropic" | "openai";

export type StoredLlmKey = {
  provider: LlmProvider;
  /** Last four characters — the only part of the key the server will return. */
  last4: string;
  validated_at: string | null;
  /** False when the stored key can no longer be decrypted (an encryption key was
   *  rotated away server-side). It exists but is unusable, so ask for a re-entry
   *  rather than showing it as working. */
  readable: boolean;
};

export type LlmKeysState = {
  /** False when this deployment can't accept keys at all — hide the section
   *  rather than offering a control that will fail. */
  available: boolean;
  keys: StoredLlmKey[];
};

export function useLlmKeys() {
  return useQuery({
    queryKey: ["llm-keys"],
    queryFn: () => apiFetch<LlmKeysState>("GET", "/llm-keys"),
    staleTime: 30_000,
  });
}

export function useSaveLlmKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ provider, key }: { provider: LlmProvider; key: string }) =>
      apiFetch<void>("PUT", `/llm-keys/${provider}`, { key }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["llm-keys"] });
      // Adding a key lifts the usage limits, so the quota display is now stale.
      qc.invalidateQueries({ queryKey: ["billing", "subscription"] });
    },
  });
}

export function useDeleteLlmKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (provider: LlmProvider) => apiFetch<void>("DELETE", `/llm-keys/${provider}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["llm-keys"] });
      qc.invalidateQueries({ queryKey: ["billing", "subscription"] });
    },
  });
}

/**
 * The server's own wording for why a key was refused. It distinguishes two cases
 * that need different responses: `invalid_key` means the provider rejected it,
 * `validation_unavailable` means we couldn't reach the provider — a "try again",
 * not a "you're wrong".
 */
export function llmKeyErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.message) return err.message;
  return "Couldn't save that key. Please try again shortly.";
}
