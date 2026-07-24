import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getPendingStatementsStatementIdGet, postApprovedStatementsStatementIdPostPost } from "@/lib/api/sdk.gen";
import { API_URL } from "@/lib/api-client";
import { QuotaError } from "@/lib/quota";
import { useSalliStore } from "@/lib/store";

/** Matches the API's flat `_txn_dict` serialisation (statements router) — the
 * backend flattens `RawRow` fields onto the transaction, it is NOT nested. */
export type ParsedTransaction = {
  id: string;
  date: string;
  description: string;
  amount: string;
  currency: string;
  credit_flag: boolean;
  bank_ref: string;
  category: string;
  debit_account_id: string | null;
  credit_account_id: string | null;
  confidence: number;
  dedup_status: string;
};

/** POST /statements/upload response — the richest source of statement metadata
 * (bank, period, counts). GET /{id} only re-returns the transaction list. */
export type StatementUploadResult = {
  statement_id: string;
  bank: string;
  period_start: string | null;
  period_end: string | null;
  total_rows: number;
  parsed: number;
  errors: string[];
  transactions: ParsedTransaction[];
};

export type PendingStatement = {
  statement_id: string;
  transactions: ParsedTransaction[];
};

export function usePendingStatement(statementId: string | null) {
  return useQuery({
    queryKey: ["statement-pending", statementId],
    queryFn: async () => {
      const { data } = await getPendingStatementsStatementIdGet({
        path: { statement_id: statementId! },
        throwOnError: true,
      });
      return data as unknown as PendingStatement;
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
      qc.invalidateQueries({ queryKey: ["trial-balance"] });
    },
  });
}

/** Multipart upload — bypasses the generated SDK (its body serializer expects a
 * DOM Blob/File; Expo's document-picker result is a {uri,name,type} object that
 * only React Native's native FormData/fetch handle correctly). */
export async function uploadStatement(
  fileUri: string,
  fileName: string,
  mimeType: string,
  bank: string,
): Promise<StatementUploadResult> {
  const token = useSalliStore.getState().token;
  const form = new FormData();
  form.append("file", { uri: fileUri, name: fileName, type: mimeType } as unknown as Blob);

  const res = await fetch(`${API_URL}/statements/upload?bank=${encodeURIComponent(bank)}`, {
    method: "POST",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: form,
  });
  if (res.status === 402) throw new QuotaError("statement_uploads");
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
  return (await res.json()) as StatementUploadResult;
}
