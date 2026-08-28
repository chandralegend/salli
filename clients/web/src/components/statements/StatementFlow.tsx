"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { recordFailure, requestIdOf } from "@/lib/diagnostics";
import { CheckCircle2, FileUp, Loader2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MoneyText } from "@/components/shared/MoneyText";
import { StatusChip } from "@/components/shared/StatusChip";
import { QuotaBanner } from "@/components/shared/QuotaBanner";
import { API_URL } from "@/lib/api-client";
import { getStoredToken } from "@/lib/store";
import { apiFetch } from "@/lib/api-fetch";
import { cn } from "@/lib/utils";

const BANKS = ["Commercial Bank", "People's Bank", "HSBC", "BOC", "Sampath", "NDB"];
const MAX_BYTES = 10 * 1024 * 1024;

export type StatementTxn = {
  id: string;
  date: string;
  description: string;
  amount: string;
  credit_flag: boolean;
  currency: string;
  category: string | null;
  confidence: number | null;
  dedup_status: string | null;
};

type UploadResult = {
  statement_id: string;
  bank: string;
  total_rows: number;
  parsed: number;
  errors: number;
  transactions: StatementTxn[];
};

type Phase =
  | { name: "upload" }
  | { name: "review"; result: UploadResult; fileName: string }
  | { name: "posted"; posted: number; skipped: number };

/** dedup_status is "pending"/"unique" for clean rows; these mark suspected duplicates. */
const isDuplicate = (t: StatementTxn) =>
  t.dedup_status === "exact_duplicate" || t.dedup_status === "fuzzy_match" || t.dedup_status === "confirmed_duplicate";

function ConfidenceDots({ value }: { value: number | null }) {
  const level = value == null ? 0 : value >= 0.8 ? 3 : value >= 0.5 ? 2 : 1;
  return (
    <span className="inline-flex items-center gap-1" title={value != null ? `confidence ${(value * 100).toFixed(0)}%` : undefined}>
      <span className="inline-flex gap-0.5">
        {[1, 2, 3].map((i) => (
          <span key={i} className={cn("size-1.5 rounded-full", i <= level ? "bg-foreground/60" : "bg-muted-foreground/25")} />
        ))}
      </span>
      <span className="text-[11px] text-muted-foreground">{level === 3 ? "high" : level === 2 ? "med" : "low"}</span>
    </span>
  );
}

export function StatementFlow({ onViewLedger }: { onViewLedger: () => void }) {
  const qc = useQueryClient();
  const [phase, setPhase] = useState<Phase>({ name: "upload" });
  const [bank, setBank] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotaHit, setQuotaHit] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [approved, setApproved] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setError(null);
    setQuotaHit(false);
    if (file.size > MAX_BYTES) {
      setError("File is over 10 MB.");
      return;
    }
    const token = getStoredToken();
    if (!token) return;

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const qs = bank ? `?bank=${encodeURIComponent(bank)}` : "";
      const res = await fetch(`${API_URL}/statements/upload${qs}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) {
        // Statement parsing is where users most often get stuck, so this is the
        // highest-value capture site in the app.
        recordFailure({
          via: "fetch",
          method: "POST",
          status: res.status,
          path_template: "/statements/upload",
          request_id: requestIdOf(res),
        });
      }
      if (res.status === 402) {
        setQuotaHit(true);
        return;
      }
      if (res.status === 413) {
        setError("File is over 10 MB.");
        return;
      }
      if (res.status === 422) {
        setError("Couldn't parse this file — try the CSV export from your bank portal.");
        return;
      }
      if (!res.ok) {
        setError(`Upload failed (${res.status}). Try again.`);
        return;
      }
      const uploaded = (await res.json()) as UploadResult;
      // The upload response has no row ids — the persisted pending rows do.
      const pending = await apiFetch<{ statement_id: string; transactions: StatementTxn[] }>(
        "GET",
        `/statements/${uploaded.statement_id}`
      );
      const result: UploadResult = { ...uploaded, transactions: pending.transactions };
      // Everything parsed starts approved — except flagged duplicates.
      setApproved(new Set(result.transactions.filter((t) => !isDuplicate(t)).map((t) => t.id)));
      setPhase({ name: "review", result, fileName: file.name });
    } catch {
      recordFailure({
        via: "fetch",
        method: "POST",
        status: 0,
        path_template: "/statements/upload",
        request_id: null,
      });
      setError("Upload failed. Check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  async function post() {
    if (phase.name !== "review" || posting) return;
    setPosting(true);
    setError(null);
    try {
      const { posted } = await apiFetch<{ posted: number; entry_ids: string[] }>(
        "POST",
        `/statements/${phase.result.statement_id}/post`,
        { approved_ids: [...approved] }
      );
      qc.invalidateQueries({ queryKey: ["entries"] });
      qc.invalidateQueries({ queryKey: ["trial-balance"] });
      qc.invalidateQueries({ queryKey: ["income-statement"] });
      setPhase({ name: "posted", posted, skipped: phase.result.transactions.length - approved.size });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Posting failed.");
    } finally {
      setPosting(false);
    }
  }

  function toggle(id: string) {
    setApproved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ── Phase: posted ────────────────────────────────────────────────────────────
  if (phase.name === "posted") {
    return (
      <div className="max-w-[560px] mx-auto rounded-lg border bg-card p-10 text-center">
        <CheckCircle2 className="size-14 mx-auto text-[var(--status-success-text)]" />
        <h2 className="text-[20px] font-semibold mt-4">
          {phase.posted} {phase.posted === 1 ? "entry" : "entries"} posted to your ledger
        </h2>
        <p className="text-[13px] text-muted-foreground mt-2">
          Each transaction was posted as a balanced double entry with source &ldquo;statement&rdquo;.
          You can reverse any of them from the Ledger.
        </p>
        <div className="flex justify-center gap-3 mt-6">
          <Button onClick={onViewLedger}>View ledger</Button>
          <Button variant="outline" onClick={() => setPhase({ name: "upload" })}>
            Upload another
          </Button>
        </div>
        {phase.skipped > 0 && (
          <p className="text-xs text-muted-foreground mt-4">
            {phase.skipped} {phase.skipped === 1 ? "row was" : "rows were"} skipped and not posted.
          </p>
        )}
      </div>
    );
  }

  // ── Phase: review ────────────────────────────────────────────────────────────
  if (phase.name === "review") {
    const txns = phase.result.transactions;
    const skippedCount = txns.length - approved.size;
    return (
      <div className="space-y-4">
        <div className="rounded-lg border bg-card p-4 flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="min-w-0">
            <p className="text-[15px] font-semibold">{txns.length} transactions parsed</p>
            <p className="text-xs text-muted-foreground truncate">
              {phase.fileName} · {phase.result.statement_id.slice(0, 8)}
            </p>
          </div>
          <div className="flex items-center gap-3 text-[13px]">
            <button
              type="button"
              className="font-medium hover:underline"
              onClick={() => setApproved(new Set(txns.map((t) => t.id)))}
            >
              Approve all
            </button>
            <button type="button" className="font-medium hover:underline" onClick={() => setApproved(new Set())}>
              Skip all
            </button>
            <StatusChip tone="neutral">
              {approved.size} approved · {skippedCount} skipped
            </StatusChip>
          </div>
          <div className="ml-auto">
            <Button onClick={post} disabled={approved.size === 0 || posting}>
              {posting ? <Loader2 className="size-4 animate-spin" /> : `Post ${approved.size} to ledger`}
            </Button>
          </div>
        </div>

        {error && <p className="text-[13px] text-destructive">{error}</p>}

        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead className="w-20 text-right">Approve</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {txns.map((t) => {
                const on = approved.has(t.id);
                const dup = isDuplicate(t);
                return (
                  <TableRow
                    key={t.id}
                    className={cn(dup && "bg-[var(--status-warning-bg)]/40", !on && "opacity-45")}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">{t.date}</TableCell>
                    <TableCell className="font-medium">
                      {t.description}
                      {dup && (
                        <StatusChip tone="warning" className="ml-2">
                          possible duplicate
                        </StatusChip>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusChip tone={t.credit_flag ? "success" : "neutral"}>
                        {t.credit_flag ? "CR" : "DR"}
                      </StatusChip>
                    </TableCell>
                    <TableCell className="text-right">
                      <MoneyText value={t.amount} prefix={t.currency || "LKR"} />
                    </TableCell>
                    <TableCell className="text-[13px] text-muted-foreground">{t.category ?? "—"}</TableCell>
                    <TableCell>
                      <ConfidenceDots value={t.confidence} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Switch checked={on} onCheckedChange={() => toggle(t.id)} aria-label="Approve row" />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <p className="px-4 py-3 text-xs text-muted-foreground border-t">
            {txns.length} rows · {txns.filter(isDuplicate).length} flagged as possible duplicates
          </p>
        </div>
      </div>
    );
  }

  // ── Phase: upload ────────────────────────────────────────────────────────────
  return (
    <div className="max-w-[720px] mx-auto space-y-3">
      {quotaHit && <QuotaBanner />}
      <div className="rounded-lg border bg-card p-8">
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) upload(file);
          }}
          className={cn(
            "rounded-lg border-2 border-dashed p-10 text-center cursor-pointer transition-colors",
            dragOver ? "border-foreground bg-muted/50" : error ? "border-destructive" : "border-border hover:border-muted-foreground/50"
          )}
        >
          {uploading ? (
            <Loader2 className="size-10 mx-auto text-muted-foreground animate-spin" />
          ) : (
            <UploadCloud className="size-10 mx-auto text-muted-foreground" />
          )}
          <p className="text-base font-semibold mt-3">
            {uploading ? "Parsing…" : "Drop a bank statement here"}
          </p>
          <p className="text-[13px] text-muted-foreground mt-1">PDF, CSV or XLSX · up to 10 MB</p>
          <Button variant="outline" size="sm" className="mt-4 pointer-events-none">
            <FileUp className="size-3.5" /> Browse files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.csv,.xlsx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload(file);
              e.target.value = "";
            }}
          />
        </div>
        {error && <p className="text-[13px] text-destructive mt-3 text-center">{error}</p>}
        <div className="mt-5 max-w-xs mx-auto space-y-1.5">
          <p className="text-[13px] font-medium text-center">Bank (optional)</p>
          <Select value={bank || undefined} onValueChange={(v) => setBank(v ?? "")}>
            <SelectTrigger>
              <SelectValue placeholder="Helps Salli pick the right parser" />
            </SelectTrigger>
            <SelectContent>
              {BANKS.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Statements are parsed on the server and never shared. Duplicates are detected automatically.
      </p>
    </div>
  );
}
