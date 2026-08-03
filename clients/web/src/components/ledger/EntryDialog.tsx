"use client";

import { useState } from "react";
import { ArrowRight, Loader2, Plus, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AccountDialog, type AccountType } from "@/components/ledger/AccountDialog";
import type { Account } from "@/hooks/useLedger";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/** Sentinel option value for the "+ Add new account" row inside each Select —
 * distinct from any real account id, which are always uuids. */
const CREATE_NEW = "__create_new_account__";

type AccountHint = { name?: string; type?: AccountType };

/** Optional prefill for the entry form (e.g. from the AI quick-add parse).
 * `debitHint`/`creditHint` are only used if the matching id is empty — they
 * seed the inline "+ Add new account" form with the AI's best guess. */
export type EntryDraftInit = {
  description?: string;
  amount?: string;
  debitId?: string;
  creditId?: string;
  debitHint?: AccountHint;
  creditHint?: AccountHint;
};

export function EntryDialog({
  open,
  onOpenChange,
  accounts,
  onSubmit,
  pending,
  serverError,
  initialDraft,
  onCreateAccount,
  creatingAccount,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  accounts: Account[];
  onSubmit: (data: {
    entry_date: string;
    description: string;
    amount: string;
    debitId: string;
    creditId: string;
  }) => void;
  pending: boolean;
  /** 422 detail from the API, rendered inline. */
  serverError?: string | null;
  /** Prefill values (AI quick-add) applied when the dialog opens. */
  initialDraft?: EntryDraftInit | null;
  /** Creates an account without leaving the entry form — the freshly-created
   * account is passed back so the caller can auto-select it. */
  onCreateAccount: (
    data: { code: string; name: string; type: AccountType; currency: string },
    callbacks: { onSuccess: (account: { id: string }) => void },
  ) => void;
  creatingAccount: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initialDraft ? "Review entry" : "New journal entry"}</DialogTitle>
          <DialogDescription>
            {initialDraft
              ? "Salli drafted this from your note — review, adjust, and post."
              : "One balanced double entry — equal debit and credit."}
          </DialogDescription>
        </DialogHeader>
        {/* Mounted only while open — form state resets via remount. */}
        {open && (
          <EntryForm
            accounts={accounts}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
            pending={pending}
            serverError={serverError}
            initial={initialDraft}
            onCreateAccount={onCreateAccount}
            creatingAccount={creatingAccount}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EntryForm({
  accounts,
  onSubmit,
  onCancel,
  pending,
  serverError,
  initial,
  onCreateAccount,
  creatingAccount,
}: {
  accounts: Account[];
  onSubmit: (data: {
    entry_date: string;
    description: string;
    amount: string;
    debitId: string;
    creditId: string;
  }) => void;
  onCancel: () => void;
  pending: boolean;
  serverError?: string | null;
  onCreateAccount: (
    data: { code: string; name: string; type: AccountType; currency: string },
    callbacks: { onSuccess: (account: { id: string }) => void },
  ) => void;
  creatingAccount: boolean;
  initial?: EntryDraftInit | null;
}) {
  const [date, setDate] = useState(todayIso());
  const [description, setDescription] = useState(initial?.description ?? "");
  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [debitId, setDebitId] = useState(initial?.debitId ?? "");
  const [creditId, setCreditId] = useState(initial?.creditId ?? "");
  const [error, setError] = useState<string | null>(null);
  // Which side's picker requested "+ Add new account" — the entry form stays
  // mounted underneath throughout, so nothing typed so far is lost.
  const [pendingSide, setPendingSide] = useState<"debit" | "credit" | null>(null);

  const active = accounts.filter((a) => a.is_active !== false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!debitId || !creditId) {
      setError("Pick both a debit and a credit account.");
      return;
    }
    if (debitId === creditId) {
      setError("Debit and credit accounts must differ.");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError("Enter a positive amount.");
      return;
    }
    onSubmit({ entry_date: date, description: description.trim(), amount, debitId, creditId });
  }

  // Sensible fallback account type for a brand-new account when the AI parser
  // gave no hint for this side: debit is usually a new expense category,
  // credit is usually the asset/bank account paid from.
  const pendingHint = pendingSide === "debit" ? initial?.debitHint : pendingSide === "credit" ? initial?.creditHint : undefined;
  const pendingPrefill = pendingSide
    ? { name: pendingHint?.name, type: pendingHint?.type ?? (pendingSide === "debit" ? "expense" : "asset") }
    : undefined;

  const accountSelect = (
    value: string,
    onChange: (v: string) => void,
    placeholder: string,
    side: "debit" | "credit",
  ) => {
    const selected = active.find((a) => a.id === value);
    return (
    <Select
      // Pass the plain string, not `value || undefined` (a pre-existing bug
      // surfaced by testing the new auto-select-on-create path): Base UI's
      // Select decides controlled-vs-uncontrolled from whatever `value` is on
      // the FIRST render, then warns if it later flips. `value || undefined`
      // starts as `undefined` (uncontrolled) and later becomes a real string
      // once an account is picked (or auto-selected after inline creation),
      // which flips it to controlled mid-lifecycle. Passing the plain string
      // keeps it controlled from the start — no SelectItem ever has value="",
      // so "" still correctly matches nothing and shows the placeholder.
      value={value}
      onValueChange={(v) => {
        if (v === CREATE_NEW) {
          setPendingSide(side);
          return;
        }
        onChange(v ?? "");
      }}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder}>
          {selected ? (
            <>
              <span className="font-mono text-xs text-muted-foreground mr-1.5">{selected.code}</span>
              {selected.name}
            </>
          ) : undefined}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={CREATE_NEW} className="text-primary">
          <Plus className="size-3.5" /> Add new account
        </SelectItem>
        {active.map((a) => (
          <SelectItem key={a.id} value={a.id}>
            <span className="font-mono text-xs text-muted-foreground mr-1.5">{a.code}</span>
            {a.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    );
  };

  return (
    <>
    <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="entry-date">Date</Label>
              <Input id="entry-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="entry-amount">Amount (LKR)</Label>
              <Input
                id="entry-amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                className="money text-right"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="entry-desc">Description</Label>
            <Input
              id="entry-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Rent – July 2026"
              required
            />
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
            <div className="space-y-1.5">
              <Label>Debit account</Label>
              {accountSelect(debitId, setDebitId, "Where value goes…", "debit")}
            </div>
            <ArrowRight className="size-4 text-muted-foreground mb-2.5" />
            <div className="space-y-1.5">
              <Label>Credit account</Label>
              {accountSelect(creditId, setCreditId, "Where value comes from…", "credit")}
            </div>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Scale className="size-3.5" /> Debits must equal credits — Salli posts both sides for you.
          </p>
          {(error || serverError) && <p className="text-[13px] text-destructive">{error || serverError}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : "Post entry"}
            </Button>
          </DialogFooter>
    </form>

    {/* Lives inside EntryForm (not the Ledger page's own toolbar instance) so
        creating an account never closes the in-progress entry — date/amount/
        description are untouched throughout. */}
    <AccountDialog
      open={pendingSide !== null}
      onOpenChange={(v) => !v && setPendingSide(null)}
      prefill={pendingPrefill}
      pending={creatingAccount}
      onSubmit={(data) =>
        onCreateAccount(data, {
          onSuccess: (created) => {
            if (pendingSide === "debit") setDebitId(created.id);
            else if (pendingSide === "credit") setCreditId(created.id);
            setPendingSide(null);
          },
        })
      }
    />
    </>
  );
}
