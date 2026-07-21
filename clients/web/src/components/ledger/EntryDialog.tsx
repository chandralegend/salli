"use client";

import { useState } from "react";
import { ArrowRight, Loader2, Scale } from "lucide-react";
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
import type { Account } from "@/hooks/useLedger";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function EntryDialog({
  open,
  onOpenChange,
  accounts,
  onSubmit,
  pending,
  serverError,
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
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New journal entry</DialogTitle>
          <DialogDescription>One balanced double entry — equal debit and credit.</DialogDescription>
        </DialogHeader>
        {/* Mounted only while open — form state resets via remount. */}
        {open && (
          <EntryForm
            accounts={accounts}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
            pending={pending}
            serverError={serverError}
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
}) {
  const [date, setDate] = useState(todayIso());
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [debitId, setDebitId] = useState("");
  const [creditId, setCreditId] = useState("");
  const [error, setError] = useState<string | null>(null);

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

  const accountSelect = (value: string, onChange: (v: string) => void, placeholder: string) => (
    <Select value={value || undefined} onValueChange={(v) => onChange(v ?? "")}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {active.map((a) => (
          <SelectItem key={a.id} value={a.id}>
            <span className="font-mono text-xs text-muted-foreground mr-1.5">{a.code}</span>
            {a.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
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
              {accountSelect(debitId, setDebitId, "Where value goes…")}
            </div>
            <ArrowRight className="size-4 text-muted-foreground mb-2.5" />
            <div className="space-y-1.5">
              <Label>Credit account</Label>
              {accountSelect(creditId, setCreditId, "Where value comes from…")}
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
  );
}
