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
import { formatMoney } from "@/lib/format";
import type { Debt } from "@/hooks/useDebt";

/** Values submitted back to the page, already converted for the backend:
 * APR is a fraction (0.24), everything else a plain number. */
export type DebtFormValues = {
  name: string;
  principal: number;
  apr: number;
  minimum_payment: number;
};

export function DebtDialog({
  open,
  onOpenChange,
  debt,
  onSubmit,
  pending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Present when editing; absent when creating. */
  debt?: Debt | null;
  onSubmit: (data: DebtFormValues) => void;
  pending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{debt ? "Edit debt" : "New debt"}</DialogTitle>
          <DialogDescription>
            {debt
              ? "Update the balance, rate, or minimum — the payoff plan recalculates."
              : "Track a loan to see it in your avalanche/snowball payoff plan."}
          </DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, keyed by target — state resets via remount. */}
        {open && (
          <DebtForm
            key={debt?.id ?? "new"}
            debt={debt}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
            pending={pending}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function DebtForm({
  debt,
  onSubmit,
  onCancel,
  pending,
}: {
  debt?: Debt | null;
  onSubmit: (data: DebtFormValues) => void;
  onCancel: () => void;
  pending: boolean;
}) {
  const [name, setName] = useState(debt?.name ?? "");
  const [principal, setPrincipal] = useState(debt ? String(Number(debt.principal)) : "");
  // Fraction -> percent for display (0.24 -> "24").
  const [aprPct, setAprPct] = useState(debt ? String(Number(debt.apr) * 100) : "");
  const [minPayment, setMinPayment] = useState(debt ? String(Number(debt.minimum_payment)) : "");

  const principalNum = Number(principal) || 0;
  const aprNum = Number(aprPct) || 0;
  const minNum = Number(minPayment) || 0;
  const canSubmit = Boolean(name.trim() && principal && aprPct && minPayment && principalNum > 0);
  const monthlyInterest = (principalNum * (aprNum / 100)) / 12;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      name: name.trim(),
      principal: principalNum,
      // Percent -> fraction for the backend ("24" -> 0.24).
      apr: aprNum / 100,
      minimum_payment: minNum,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="debt-name">Name</Label>
        <Input
          id="debt-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Housing Loan"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="debt-principal">Principal outstanding</Label>
        <Input
          id="debt-principal"
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={principal}
          onChange={(e) => setPrincipal(e.target.value)}
          placeholder="0"
          className="money"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="debt-apr">APR %</Label>
          <Input
            id="debt-apr"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={aprPct}
            onChange={(e) => setAprPct(e.target.value)}
            placeholder="24"
            className="money"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="debt-min">Min payment / mo</Label>
          <Input
            id="debt-min"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={minPayment}
            onChange={(e) => setMinPayment(e.target.value)}
            placeholder="0"
            className="money"
            required
          />
        </div>
      </div>

      {principal && aprPct ? (
        <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3.5 py-2.5">
          <span className="text-[13px] text-muted-foreground">Interest / mo (approx)</span>
          <span className="money text-sm font-semibold">LKR {formatMoney(String(monthlyInterest))}</span>
        </div>
      ) : null}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending || !canSubmit}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : debt ? "Save changes" : "Add debt"}
        </Button>
      </DialogFooter>
    </form>
  );
}
