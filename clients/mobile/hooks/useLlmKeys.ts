import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteLlmKeyLlmKeysProviderDelete,
  getLlmKeysLlmKeysGet,
  saveLlmKeyLlmKeysProviderPut,
} from "@/lib/api/sdk.gen";

export type LlmProvider = "anthropic";

export type StoredLlmKey = {
  provider: LlmProvider;
  /** Last four characters — the only part of the key the server will return. */
  last4: string;
  validated_at: string | null;
  /** False when the stored key can no longer be decrypted (an encryption key was
   *  rotated away server-side). The key still exists but is unusable, so the UI
   *  should ask for a re-entry rather than showing it as working. */
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
    queryFn: async () => {
      const { data } = await getLlmKeysLlmKeysGet({ throwOnError: true });
      return data as unknown as LlmKeysState;
    },
  });
}

export function useSaveLlmKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ provider, key }: { provider: LlmProvider; key: string }) => {
      await saveLlmKeyLlmKeysProviderPut({
        path: { provider },
        body: { key },
        throwOnError: true,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["llm-keys"] });
      // Adding a key lifts the usage limits, so the quota display is now stale.
      qc.invalidateQueries({ queryKey: ["entitlements"] });
    },
  });
}

export function useDeleteLlmKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (provider: LlmProvider) => {
      await deleteLlmKeyLlmKeysProviderDelete({ path: { provider }, throwOnError: true });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["llm-keys"] });
      qc.invalidateQueries({ queryKey: ["entitlements"] });
    },
  });
}

/** The server's reason for refusing a key, so the UI can say something useful.
 *  `invalid_key` means the provider rejected it; `validation_unavailable` means
 *  we couldn't reach the provider, which is a "try again", not a "you're wrong". */
export function llmKeyErrorMessage(err: unknown): string {
  const detail = (err as { error?: { detail?: { error?: string; message?: string } } })?.error
    ?.detail;
  if (detail?.message) return detail.message;
  return "Couldn't save that key. Please try again shortly.";
}
