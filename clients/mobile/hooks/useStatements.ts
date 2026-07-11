import { useMutation } from "@tanstack/react-query";
import {
  uploadStatementStatementsUploadPost,
  getPendingStatementsStatementIdGet,
  postApprovedStatementsStatementIdPostPost,
} from "@/lib/api/sdk.gen";

export type ParsedTx = {
  id: string;
  date: string;
  description: string;
  amount: string;
  credit_flag: boolean;
  suggested_account_id?: string | null;
};

export type UploadResult = { statement_id: string; transactions: ParsedTx[] };

export type PickedFile = { uri: string; name: string; mimeType?: string | null };

/**
 * Statement upload → parse → approve → post-to-ledger flow.
 * Mirrors clients/web/src/app/(app)/statements/page.tsx.
 */
export function useStatements() {
  const upload = useMutation({
    mutationFn: async (file: PickedFile): Promise<UploadResult> => {
      const form = new FormData();
      // React Native FormData file part — not a web File/Blob.
      form.append("file", {
        uri: file.uri,
        name: file.name,
        type: file.mimeType ?? "application/octet-stream",
      } as unknown as Blob);

      const uploadRes = await uploadStatementStatementsUploadPost({
        body: form as unknown as { file: Blob },
        bodySerializer: null,
        headers: { "Content-Type": null },
        throwOnError: true,
      });
      const uploadData = uploadRes.data as { statement_id: string };

      const pending = await getPendingStatementsStatementIdGet({
        path: { statement_id: uploadData.statement_id },
        throwOnError: true,
      });
      const txData = pending.data as { transactions: ParsedTx[] };
      const txs = txData.transactions ?? [];

      return { statement_id: uploadData.statement_id, transactions: txs };
    },
  });

  const postApproved = useMutation({
    mutationFn: async ({ statementId, approvedIds }: { statementId: string; approvedIds: string[] }) => {
      await postApprovedStatementsStatementIdPostPost({
        path: { statement_id: statementId },
        body: { approved_ids: approvedIds },
        throwOnError: true,
      });
    },
  });

  return { upload, postApproved };
}
