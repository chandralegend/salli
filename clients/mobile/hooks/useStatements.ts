import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getPendingStatementsStatementIdGet, postApprovedStatementsStatementIdPostPost } from "@/lib/api/sdk.gen";
import { API_URL } from "@/lib/api-client";
import { useSalliStore } from "@/lib/store";

export type ParsedTransaction = {
  id: string;
  raw: { date: string; description: string; amount: string; currency: string; credit_flag: boolean };
  debit_account_id: string | null;
  credit_account_id: string | null;
  confidence: number;
  dedup_status: string;
};

export function usePendingStatement(statementId: string | null) {
  return useQuery({
    queryKey: ["statement-pending", statementId],
    queryFn: async () => {
      const { data } = await getPendingStatementsStatementIdGet({
        path: { statement_id: statementId! },
        throwOnError: true,
      });
      return data as unknown as { transactions: ParsedTransaction[]; period_start: string; period_end: string };
    },
    enabled: Boolean(statementId),
  });
}

export function usePostStatement(statementId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (approvedIds: string[]) => {
      await postApprovedStatementsStatementIdPostPost({
        path: { statement_id: statementId! },
        body: { approved_ids: approvedIds },
        throwOnError: true,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["statement-pending", statementId] });
      qc.invalidateQueries({ queryKey: ["entries"] });
    },
  });
}

/** Multipart upload — bypasses the generated SDK (its body serializer expects a
 * DOM Blob/File; Expo's document-picker result is a {uri,name,type} object that
 * only React Native's native FormData/fetch handle correctly). */
export async function uploadStatement(fileUri: string, fileName: string, mimeType: string, bank: string) {
  const token = useSalliStore.getState().token;
  const form = new FormData();
  form.append("file", { uri: fileUri, name: fileName, type: mimeType } as unknown as Blob);

  const res = await fetch(`${API_URL}/statements/upload?bank=${encodeURIComponent(bank)}`, {
    method: "POST",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: form,
  });
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
  return (await res.json()) as { statement_id: string };
}
