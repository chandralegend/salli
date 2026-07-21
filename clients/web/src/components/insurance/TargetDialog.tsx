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
import { POLICY_TYPES } from "@/components/insurance/PolicyDialog";

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export function TargetDialog({
  open,
  onOpenChange,
  onSubmit,
  pending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (data: { policy_type: string; target_amount: number }) => void;
  pending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set coverage target</DialogTitle>
          <DialogDescription>
            Declare how much cover a policy type should carry. Setting a target for a type again
            overwrites the previous amount.
          </DialogDescription>
        </DialogHeader>
        {/* Mounted only while open — form state resets via remount. */}
        {open && (
          <TargetForm onSubmit={onSubmit} onCancel={() => onOpenChange(false)} pending={pending} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function TargetForm({
  onSubmit,
  onCancel,
  pending,
}: {
  onSubmit: (data: { policy_type: string; target_amount: number }) => void;
  onCancel: () => void;
  pending: boolean;
}) {
  const [policyType, setPolicyType] = useState<string>("life");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!amount || Number(amount) <= 0) {
      setError("Enter a positive target amount.");
      return;
    }
    onSubmit({ policy_type: policyType, target_amount: Number(amount) });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Policy type</Label>
        <Select value={policyType} onValueChange={(v) => setPolicyType(v ?? "life")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {POLICY_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {cap(t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="tgt-amount">Target amount (LKR)</Label>
        <Input
          id="tgt-amount"
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

      {error && <p className="text-[13px] text-destructive">{error}</p>}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : "Save target"}
        </Button>
      </DialogFooter>
    </form>
  );
}
