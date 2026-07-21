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
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import type { Holding } from "@/hooks/usePortfolio";

/** Asset classes the backend accepts (free-form string); stored lowercase. */
export const ASSET_CLASSES = ["equity", "commodity", "bond", "cash", "property"] as const;
export type AssetClass = (typeof ASSET_CLASSES)[number];

const titleCase = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function HoldingDialog({
  open,
  onOpenChange,
  holding,
  onSubmit,
  pending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Present when editing; absent when creating. */
  holding?: Holding | null;
  onSubmit: (data: {
    symbol: string;
    name: string;
    asset_class: AssetClass;
    cost_basis: number;
    current_value: number;
  }) => void;
  pending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{holding ? "Edit holding" : "New holding"}</DialogTitle>
          <DialogDescription>
            {holding
              ? "Update the manually-declared value — there is no live market feed."
              : "Add a manually-declared holding to track value, cost and allocation."}
          </DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, keyed by target — state resets via remount. */}
        {open && (
          <HoldingForm
            key={holding?.id ?? "new"}
            holding={holding}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
            pending={pending}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function HoldingForm({
  holding,
  onSubmit,
  onCancel,
  pending,
}: {
  holding?: Holding | null;
  onSubmit: (data: {
    symbol: string;
    name: string;
    asset_class: AssetClass;
    cost_basis: number;
    current_value: number;
  }) => void;
  onCancel: () => void;
  pending: boolean;
}) {
  const [symbol, setSymbol] = useState(holding?.symbol ?? "");
  const [name, setName] = useState(holding?.name ?? "");
  const [assetClass, setAssetClass] = useState<AssetClass>(
    (ASSET_CLASSES as readonly string[]).includes(holding?.asset_class ?? "")
      ? (holding!.asset_class as AssetClass)
      : "equity"
  );
  const [cost, setCost] = useState(holding ? String(holding.cost_basis) : "");
  const [value, setValue] = useState(holding ? String(holding.current_value) : "");

  const costNum = Number(cost) || 0;
  const valueNum = Number(value) || 0;
  const gain = valueNum - costNum;
  const gainPct = costNum > 0 ? (gain / costNum) * 100 : 0;
  const canSubmit = Boolean(symbol.trim() && name.trim() && cost && value);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      symbol: symbol.trim().toUpperCase(),
      name: name.trim(),
      asset_class: assetClass,
      cost_basis: costNum,
      current_value: valueNum,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-[120px_1fr] gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="hld-symbol">Symbol</Label>
          <Input
            id="hld-symbol"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="COMB"
            className="font-mono"
            autoCapitalize="characters"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="hld-name">Name</Label>
          <Input
            id="hld-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Commercial Bank"
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Asset class</Label>
        <div className="flex flex-wrap gap-2">
          {ASSET_CLASSES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setAssetClass(c)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[13px] font-medium border transition-colors",
                assetClass === c
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:text-foreground"
              )}
            >
              {titleCase(c)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="hld-cost">Cost basis (LKR)</Label>
          <Input
            id="hld-cost"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            inputMode="decimal"
            placeholder="0"
            className="money"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="hld-value">Current value (LKR)</Label>
          <Input
            id="hld-value"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            inputMode="decimal"
            placeholder="0"
            className="money"
            required
          />
        </div>
      </div>

      {cost && value && (
        <div
          className={cn(
            "flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-sm",
            gain >= 0
              ? "border-[var(--status-success-text)]/20 bg-[var(--status-success-bg)]"
              : "border-[var(--status-danger-text)]/20 bg-[var(--status-danger-bg)]"
          )}
        >
          <span className="text-muted-foreground">Unrealized gain</span>
          <span
            className={cn(
              "money font-semibold",
              gain >= 0
                ? "text-[var(--status-success-text)]"
                : "text-[var(--status-danger-text)]"
            )}
          >
            {gain >= 0 ? "+" : "-"}LKR {formatMoney(String(Math.abs(gain)))} ·{" "}
            {gainPct >= 0 ? "+" : ""}
            {gainPct.toFixed(1)}%
          </span>
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending || !canSubmit}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : holding ? (
            "Save changes"
          ) : (
            "Add holding"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}
