"use client";

import { useState } from "react";
import { Lock, RotateCcw } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { StatusChip, type ChipTone } from "@/components/shared/StatusChip";
import { MoneyText } from "@/components/shared/MoneyText";
import { ReverseConfirm } from "@/components/ledger/ReverseConfirm";
import type { Account, JournalEntry } from "@/hooks/useLedger";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";

const SOURCE_TONES: Record<string, ChipTone> = {
  manual: "neutral",
  statement: "info",
  system: "neutral",
  sms: "neutral",
};

/**
 * Entry Detail — amount hero + double-entry postings (DR/CR · account · amount)
 * with a Reverse action. Mirrors mobile's EntryDetailSheet: posted entries are
 * immutable, so the only correction is an equal-and-opposite reversing entry.
 */
export function EntryDetailSheet({
  entry,
  accounts,
  open,
  onOpenChange,
  onReverse,
}: {
  entry: JournalEntry | null;
  accounts: Account[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onReverse: (id: string) => void;
}) {
  const [confirmReverse, setConfirmReverse] = useState(false);

  const acct = (id?: string) => accounts.find((a) => a.id === id);
  const debit = entry?.postings.find((p) => p.direction === 1);
  const credit = entry?.postings.find((p) => p.direction === -1);
  const reversed = Boolean(entry?.reversed_by);
  const amount = debit?.amount ?? "0";

  const Posting = ({
    kind,
    posting,
    first,
  }: {
    kind: "Debit" | "Credit";
    posting?: JournalEntry["postings"][number];
    first?: boolean;
  }) => {
    const a = acct(posting?.account_id);
    const strong = kind === "Debit";
    return (
      <div
        className={cn(
          "flex items-center gap-3 border bg-card px-3.5 py-3",
          first ? "rounded-t-lg border-b-0" : "rounded-b-lg"
        )}
      >
        <div className={cn("h-9 w-[3px] rounded-full", strong ? "bg-primary" : "bg-border")} />
        <div className="min-w-0 flex-1">
          <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {kind} · {a?.type ?? "—"}
          </p>
          <p className="truncate text-[13px] font-medium">{a ? `${a.code} · ${a.name}` : "—"}</p>
        </div>
        <MoneyText
          value={posting?.amount ?? "0"}
          decimals={0}
          prefix="LKR"
          className={cn("text-[13px] font-semibold", strong ? "text-foreground" : "text-muted-foreground")}
        />
      </div>
    );
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full gap-0 sm:max-w-lg">
          <SheetHeader className="border-b">
            <SheetTitle>Entry detail</SheetTitle>
            <SheetDescription>A posted double-entry transaction.</SheetDescription>
          </SheetHeader>

          {!entry ? null : (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="flex justify-end">
                <StatusChip tone={reversed ? "neutral" : SOURCE_TONES[entry.source] ?? "neutral"}>
                  {reversed ? "reversed" : entry.source}
                </StatusChip>
              </div>

              {/* amount hero */}
              <div className="rounded-lg bg-[#0A2540] text-white p-5">
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-white/40 truncate">
                  {entry.description}
                </p>
                <p className="money text-[32px] leading-none font-semibold">
                  <span className="text-white/40 text-[18px] mr-1">LKR</span>
                  <MoneyText value={amount} decimals={0} className="text-white" />
                </p>
                <p className="mt-2 text-[11px] text-white/40">
                  {formatDate(entry.entry_date)}
                  {entry.external_ref ? ` · Ref ${entry.external_ref}` : ""}
                </p>
              </div>

              <div>
                <p className="eyebrow mb-1.5">Double-entry postings</p>
                <Posting kind="Debit" posting={debit} first />
                <Posting kind="Credit" posting={credit} />
              </div>

              <div className="flex items-start gap-2 rounded-lg border bg-muted/40 px-3.5 py-2.5">
                <Lock className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <p className="text-[11px] leading-4 text-muted-foreground">
                  Posted entries are immutable · correct via a reversing entry
                </p>
              </div>
            </div>
          )}

          <SheetFooter className="border-t">
            <Button
              variant="outline"
              className="w-full"
              disabled={!entry || reversed}
              onClick={() => setConfirmReverse(true)}
            >
              <RotateCcw className="size-4" /> {reversed ? "Reversed" : "Reverse entry"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ReverseConfirm
        open={confirmReverse}
        onOpenChange={setConfirmReverse}
        description={entry?.description}
        onConfirm={() => {
          if (entry) onReverse(entry.id);
          setConfirmReverse(false);
        }}
      />
    </>
  );
}
