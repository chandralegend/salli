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
import type { Policy } from "@/hooks/useInsurance";

export const POLICY_TYPES = ["life", "health", "motor", "property", "other"] as const;
export const PREMIUM_FREQUENCIES = ["monthly", "quarterly", "yearly"] as const;

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export type PolicyFormValues = {
  name: string;
  provider: string;
  policy_type: string;
  coverage_amount: number;
  premium_amount: number;
  premium_frequency: string;
  expiry_date: string;
};

export function PolicyDialog({
  open,
  onOpenChange,
  policy,
  onSubmit,
  pending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Present when editing; absent when creating. */
  policy?: Policy | null;
  onSubmit: (data: PolicyFormValues) => void;
  pending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{policy ? "Edit policy" : "New policy"}</DialogTitle>
          <DialogDescription>
            {policy
              ? "Update cover, premium, or renewal date."
              : "Track a policy to measure it against your coverage targets."}
          </DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, keyed by target — state resets via remount. */}
        {open && (
          <PolicyForm
            key={policy?.id ?? "new"}
            policy={policy}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
            pending={pending}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PolicyForm({
  policy,
  onSubmit,
  onCancel,
  pending,
}: {
  policy?: Policy | null;
  onSubmit: (data: PolicyFormValues) => void;
  onCancel: () => void;
  pending: boolean;
}) {
  const [name, setName] = useState(policy?.name ?? "");
  const [provider, setProvider] = useState(policy?.provider ?? "");
  const [policyType, setPolicyType] = useState<string>(policy?.policy_type ?? "life");
  const [frequency, setFrequency] = useState<string>(policy?.premium_frequency ?? "yearly");
  const [coverage, setCoverage] = useState(policy ? String(policy.coverage_amount) : "");
  const [premium, setPremium] = useState(policy ? String(policy.premium_amount) : "");
  const [expiry, setExpiry] = useState(policy?.expiry_date?.slice(0, 10) ?? "");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !provider.trim()) {
      setError("Enter a policy name and provider.");
      return;
    }
    if (!coverage || Number(coverage) <= 0) {
      setError("Enter a positive coverage amount.");
      return;
    }
    if (!premium || Number(premium) < 0) {
      setError("Enter a valid premium amount.");
      return;
    }
    if (!expiry) {
      setError("Pick an expiry date.");
      return;
    }
    onSubmit({
      name: name.trim(),
      provider: provider.trim(),
      policy_type: policyType,
      coverage_amount: Number(coverage),
      premium_amount: Number(premium),
      premium_frequency: frequency,
      expiry_date: expiry,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="pol-name">Name</Label>
          <Input
            id="pol-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Family Life Cover"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pol-provider">Provider</Label>
          <Input
            id="pol-provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            placeholder="Ceylinco Life"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Type</Label>
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
          <Label>Premium frequency</Label>
          <Select value={frequency} onValueChange={(v) => setFrequency(v ?? "yearly")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PREMIUM_FREQUENCIES.map((f) => (
                <SelectItem key={f} value={f}>
                  {cap(f)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="pol-coverage">Coverage (LKR)</Label>
          <Input
            id="pol-coverage"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            className="money text-right"
            value={coverage}
            onChange={(e) => setCoverage(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pol-premium">Premium (LKR)</Label>
          <Input
            id="pol-premium"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            className="money text-right"
            value={premium}
            onChange={(e) => setPremium(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pol-expiry">Expiry date</Label>
        <Input
          id="pol-expiry"
          type="date"
          value={expiry}
          onChange={(e) => setExpiry(e.target.value)}
          required
        />
      </div>

      {error && <p className="text-[13px] text-destructive">{error}</p>}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : policy ? (
            "Save changes"
          ) : (
            "Add policy"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}
