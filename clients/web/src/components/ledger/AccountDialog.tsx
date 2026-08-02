"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
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

const TYPES = ["asset", "liability", "equity", "income", "expense"] as const;
export type AccountType = (typeof TYPES)[number];

export function AccountDialog({
  open,
  onOpenChange,
  account,
  prefill,
  onSubmit,
  pending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Present when editing; absent when creating. */
  account?: Account | null;
  /** Create-mode-only suggested starting values (e.g. from an AI quick-add hint). */
  prefill?: { name?: string; type?: AccountType };
  onSubmit: (data: { code: string; name: string; type: AccountType; currency: string }) => void;
  pending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{account ? "Edit account" : "New account"}</DialogTitle>
          <DialogDescription>
            {account
              ? "Rename or reclassify — existing postings keep their history."
              : "Add an account to your chart of accounts."}
          </DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, keyed by target — state resets via remount. */}
        {open && (
          <AccountForm
            key={account?.id ?? "new"}
            account={account}
            prefill={prefill}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
            pending={pending}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function AccountForm({
  account,
  prefill,
  onSubmit,
  onCancel,
  pending,
}: {
  account?: Account | null;
  prefill?: { name?: string; type?: AccountType };
  onSubmit: (data: { code: string; name: string; type: AccountType; currency: string }) => void;
  onCancel: () => void;
  pending: boolean;
}) {
  const [code, setCode] = useState(account?.code ?? "");
  const [name, setName] = useState(account?.name ?? prefill?.name ?? "");
  const [type, setType] = useState<AccountType>((account?.type as AccountType) ?? prefill?.type ?? "asset");
  const [currency, setCurrency] = useState(account?.currency ?? "LKR");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ code: code.trim(), name: name.trim(), type, currency: currency.trim() || "LKR" });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-[110px_1fr] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="acc-code">Code</Label>
              <Input
                id="acc-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="1000"
                className="font-mono"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-name">Name</Label>
              <Input
                id="acc-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Commercial Bank – Savings"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType((v as AccountType) ?? "asset")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t[0].toUpperCase() + t.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-ccy">Currency</Label>
              <Input id="acc-ccy" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !code.trim() || !name.trim()}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : account ? "Save changes" : "Create account"}
            </Button>
          </DialogFooter>
    </form>
  );
}
