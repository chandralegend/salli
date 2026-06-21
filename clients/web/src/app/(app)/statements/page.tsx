"use client";

import { useState } from "react";
import { Check, X, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatementUploadZone } from "@/components/StatementUploadZone";
import { cn } from "@/lib/utils";
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

type UploadResult = { statement_id: string; transactions: ParsedTx[] };

export default function StatementsPage() {
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [approved, setApproved] = useState<Set<string>>(new Set());
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [posted, setPosted] = useState(false);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const upload = await uploadStatementStatementsUploadPost({ body: { file }, throwOnError: true });
      const uploadData = upload.data as { statement_id: string };
      const pending = await getPendingStatementsStatementIdGet({
        path: { statement_id: uploadData.statement_id },
        throwOnError: true,
      });
      const txData = pending.data as { transactions: ParsedTx[] };
      const txs = txData.transactions ?? [];
      setResult({ statement_id: uploadData.statement_id, transactions: txs });
      setApproved(new Set(txs.map((t) => t.id)));
      toast.success(`Parsed ${txs.length} transactions`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function toggle(id: string, approve: boolean) {
    setApproved((prev) => { const n = new Set(prev); approve ? n.add(id) : n.delete(id); return n; });
    setSkipped((prev) => { const n = new Set(prev); !approve ? n.add(id) : n.delete(id); return n; });
  }

  function toggleAll(approve: boolean) {
    if (!result) return;
    if (approve) {
      setApproved(new Set(result.transactions.map((t) => t.id)));
      setSkipped(new Set());
    } else {
      setApproved(new Set());
      setSkipped(new Set(result.transactions.map((t) => t.id)));
    }
  }

  async function handlePostApproved() {
    if (!result || approved.size === 0) return;
    setPosting(true);
    try {
      await postApprovedStatementsStatementIdPostPost({
        path: { statement_id: result.statement_id },
        body: { approved_ids: Array.from(approved) },
        throwOnError: true,
      });
      setPosted(true);
      toast.success(`${approved.size} entries posted to ledger`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Post failed");
    } finally {
      setPosting(false);
    }
  }

  if (posted) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card>
          <div className="p-12 flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCircle className="w-7 h-7 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold">{approved.size} entries posted</h2>
              <p className="text-[13px] text-muted-foreground mt-1">
                Journal entries have been created from the approved transactions.
              </p>
            </div>
            <Button onClick={() => { setResult(null); setPosted(false); }}>
              Upload another statement
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-[18px] font-semibold tracking-tight">Statements</h1>
        <p className="text-meta mt-0.5">
          Import bank statements, review parsed transactions, and post to the ledger
        </p>
      </div>

      {!result && (
        <div className="max-w-2xl">
          <StatementUploadZone onUpload={handleUpload} loading={uploading} />
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-[15px] font-semibold">
                {result.transactions.length} transactions parsed
              </h2>
              <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{result.statement_id}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => toggleAll(true)}>Approve all</Button>
              <Button variant="outline" size="sm" onClick={() => toggleAll(false)}>Skip all</Button>
              <span className="text-[12px] text-muted-foreground tabular-nums">
                {approved.size} approved · {skipped.size} skipped
              </span>
              <Button onClick={handlePostApproved} disabled={posting || approved.size === 0}>
                {posting && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                Post {approved.size} to ledger
              </Button>
            </div>
          </div>

          {/* Transaction table */}
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 border-b">
                  <TableHead className="h-9 px-3 w-24">
                    <span className="text-secondary-label">Date</span>
                  </TableHead>
                  <TableHead className="h-9 px-3">
                    <span className="text-secondary-label">Description</span>
                  </TableHead>
                  <TableHead className="h-9 px-3 w-16">
                    <span className="text-secondary-label">Type</span>
                  </TableHead>
                  <TableHead className="h-9 px-3 w-32 text-right">
                    <span className="text-secondary-label">Amount</span>
                  </TableHead>
                  <TableHead className="h-9 px-3 w-20 text-right">
                    <span className="text-secondary-label">Action</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.transactions.map((tx) => {
                  const isApproved = approved.has(tx.id);
                  const isSkipped = skipped.has(tx.id);
                  return (
                    <TableRow
                      key={tx.id}
                      className={cn(
                        "border-b last:border-0 transition-opacity",
                        isSkipped && "opacity-35"
                      )}
                    >
                      <TableCell className="px-3 py-2.5">
                        <span className="text-[12px] font-mono text-muted-foreground tabular-nums">
                          {tx.date}
                        </span>
                      </TableCell>
                      <TableCell className="px-3 py-2.5">
                        <span className="text-[13px] truncate max-w-[300px] block">{tx.description}</span>
                      </TableCell>
                      <TableCell className="px-3 py-2.5">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium",
                            tx.credit_flag
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          )}
                        >
                          {tx.credit_flag ? "CR" : "DR"}
                        </span>
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-right">
                        <span
                          className={cn(
                            "text-[13px] font-semibold tabular-nums",
                            tx.credit_flag ? "text-emerald-700" : "text-rose-700"
                          )}
                        >
                          LKR {tx.amount}
                        </span>
                      </TableCell>
                      <TableCell className="px-3 py-2.5">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant={isApproved ? "default" : "ghost"}
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => toggle(tx.id, true)}
                            aria-label="Approve"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant={isSkipped ? "destructive" : "ghost"}
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => toggle(tx.id, false)}
                            aria-label="Skip"
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="px-4 py-2.5 border-t bg-muted/20">
              <p className="text-[11px] text-muted-foreground tabular-nums">
                {result.transactions.length} rows
              </p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
