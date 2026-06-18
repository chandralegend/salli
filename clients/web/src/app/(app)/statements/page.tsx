"use client";

import { useState } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatementUploadZone } from "@/components/StatementUploadZone";
import {
  uploadStatementStatementsUploadPost,
  getPendingStatementsStatementIdGet,
  postApprovedStatementsStatementIdPostPost,
} from "@/lib/api/sdk.gen";

type ParsedTx = {
  id: string;
  date: string;
  description: string;
  amount: string;
  credit_flag: boolean;
  suggested_account_id?: string | null;
};

type UploadResult = {
  statement_id: string;
  transactions: ParsedTx[];
};

export default function StatementsPage() {
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [approved, setApproved] = useState<Set<string>>(new Set());
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [posted, setPosted] = useState(false);
  const [error, setError] = useState("");

  async function handleUpload(file: File) {
    setUploading(true);
    setError("");
    setResult(null);
    setApproved(new Set());
    setSkipped(new Set());
    setPosted(false);
    try {
      const upload = await uploadStatementStatementsUploadPost({
        body: { file },
        throwOnError: true,
      });
      const uploadData = upload.data as { statement_id: string };
      const pending = await getPendingStatementsStatementIdGet({
        path: { statement_id: uploadData.statement_id },
        throwOnError: true,
      });
      const txData = pending.data as { transactions: ParsedTx[] };
      setResult({
        statement_id: uploadData.statement_id,
        transactions: txData.transactions ?? [],
      });
      const allIds = new Set((txData.transactions ?? []).map((t) => t.id));
      setApproved(allIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function toggle(id: string, approve: boolean) {
    setApproved((prev) => {
      const next = new Set(prev);
      if (approve) next.add(id);
      else next.delete(id);
      return next;
    });
    setSkipped((prev) => {
      const next = new Set(prev);
      if (!approve) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function handlePostApproved() {
    if (!result || approved.size === 0) return;
    setPosting(true);
    setError("");
    try {
      await postApprovedStatementsStatementIdPostPost({
        path: { statement_id: result.statement_id },
        body: { approved_ids: Array.from(approved) },
        throwOnError: true,
      });
      setPosted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Post failed");
    } finally {
      setPosting(false);
    }
  }

  if (posted) {
    return (
      <div className="p-6 max-w-[1280px] mx-auto">
        <div className="rounded-[16px] bg-card border border-border p-10 flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-income/10 flex items-center justify-center">
            <Check className="w-6 h-6 text-income" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            {approved.size} entries posted
          </h2>
          <p className="text-sm text-muted-foreground">
            Journal entries have been created from the approved transactions.
          </p>
          <Button
            onClick={() => {
              setResult(null);
              setPosted(false);
            }}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Upload another statement
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1280px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Statements</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Import bank statements and review parsed transactions
        </p>
      </div>

      {!result && (
        <div className="max-w-xl">
          <StatementUploadZone onUpload={handleUpload} loading={uploading} />
          {error && (
            <p className="text-expense text-sm mt-3">{error}</p>
          )}
        </div>
      )}

      {result && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {result.transactions.length} transactions found
              </h2>
              <p className="text-xs text-muted-foreground font-mono">
                {result.statement_id}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {approved.size} approved · {skipped.size} skipped
              </span>
              <Button
                onClick={handlePostApproved}
                disabled={posting || approved.size === 0}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {posting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Post approved
              </Button>
            </div>
          </div>

          {error && <p className="text-expense text-sm mb-4">{error}</p>}

          <div className="rounded-[16px] bg-card border border-border divide-y divide-border overflow-hidden">
            {result.transactions.map((tx) => {
              const isApproved = approved.has(tx.id);
              const isSkipped = skipped.has(tx.id);
              return (
                <div
                  key={tx.id}
                  className={`flex items-center gap-4 px-6 py-4 transition-colors ${
                    isSkipped ? "opacity-40" : ""
                  }`}
                >
                  <span className="font-mono text-[13px] text-muted-foreground w-24 shrink-0">
                    {tx.date}
                  </span>
                  <p className="flex-1 text-sm text-foreground truncate">
                    {tx.description}
                  </p>
                  <Badge
                    variant="outline"
                    className={
                      tx.credit_flag
                        ? "border-income/30 text-income bg-income/10 font-mono text-[10px]"
                        : "border-expense/30 text-expense bg-expense/10 font-mono text-[10px]"
                    }
                  >
                    {tx.credit_flag ? "CR" : "DR"}
                  </Badge>
                  <span
                    className={`font-mono font-semibold text-sm w-28 text-right shrink-0 ${
                      tx.credit_flag ? "text-income" : "text-expense"
                    }`}
                  >
                    LKR {tx.amount}
                  </span>
                  <div className="flex items-center gap-2 ml-2">
                    <button
                      onClick={() => toggle(tx.id, true)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                        isApproved
                          ? "bg-income/20 text-income"
                          : "bg-secondary text-muted-foreground hover:text-income"
                      }`}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggle(tx.id, false)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                        isSkipped
                          ? "bg-expense/20 text-expense"
                          : "bg-secondary text-muted-foreground hover:text-expense"
                      }`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
