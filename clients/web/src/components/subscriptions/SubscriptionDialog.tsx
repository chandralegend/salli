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
import { FREQUENCIES, type Frequency, type Subscription } from "@/hooks/useSubscriptions";

export type SubscriptionFormData = {
  name: string;
  amount: number;
  frequency: Frequency;
  next_due_date: string;
};

export function SubscriptionDialog({
  open,
  onOpenChange,
  subscription,
  onSubmit,
  pending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Present when editing; absent when creating. */
  subscription?: Subscription | null;
  onSubmit: (data: SubscriptionFormData) => void;
  pending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{subscription ? "Edit subscription" : "New subscription"}</DialogTitle>
          <DialogDescription>
            {subscription
              ? "Update the amount, cadence, or next due date."
              : "Track a recurring charge to see its monthly-equivalent cost."}
          </DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, keyed by target — state resets via remount. */}
        {open && (
          <SubscriptionForm
            key={subscription?.id ?? "new"}
            subscription={subscription}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
            pending={pending}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SubscriptionForm({
  subscription,
  onSubmit,
  onCancel,
  pending,
}: {
  subscription?: Subscription | null;
  onSubmit: (data: SubscriptionFormData) => void;
  onCancel: () => void;
  pending: boolean;
}) {
  const initialFreq = (subscription?.frequency ?? "monthly").toLowerCase();
  const [name, setName] = useState(subscription?.name ?? "");
  const [amount, setAmount] = useState(subscription ? String(subscription.amount) : "");
  const [frequency, setFrequency] = useState<Frequency>(
    (FREQUENCIES as readonly string[]).includes(initialFreq) ? (initialFreq as Frequency) : "monthly"
  );
  const [nextDue, setNextDue] = useState(subscription?.next_due_date ?? "");

  const amountNum = Number(amount);
  const canSubmit = Boolean(name.trim() && amount && amountNum > 0 && nextDue.trim());

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      name: name.trim(),
      amount: amountNum,
      frequency,
      next_due_date: nextDue.trim(),
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="sub-name">Name</Label>
        <Input
          id="sub-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Netflix"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="sub-amount">Amount</Label>
          <Input
            id="sub-amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="0"
            className="money"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label>Billing cycle</Label>
          <Select value={frequency} onValueChange={(v) => setFrequency((v as Frequency) ?? "monthly")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FREQUENCIES.map((f) => (
                <SelectItem key={f} value={f}>
                  {f[0].toUpperCase() + f.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sub-due">Next due date</Label>
        <Input
          id="sub-due"
          type="date"
          value={nextDue}
          onChange={(e) => setNextDue(e.target.value)}
          required
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending || !canSubmit}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : subscription ? (
            "Save changes"
          ) : (
            "Add subscription"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}
