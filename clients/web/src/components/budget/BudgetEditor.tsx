"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionLabel } from "@/components/shared/SectionLabel";
import type { Account } from "@/hooks/useLedger";
import { categoryIcon } from "./categoryIcon";

const PRESETS = [
  { label: "60K", value: 60000 },
  { label: "84K", value: 84000 },
  { label: "100K", value: 100000 },
  { label: "120K", value: 120000 },
];

type Cadence = "Weekly" | "Monthly";

/**
 * Edit mode: per-category monthly limits, a cadence toggle, quick presets,
 * an even-distribution Auto-split, and a live unallocated indicator.
 */
export function BudgetEditor({
  accounts,
  initialLimits,
  monthlyIncome,
  saving,
  isUpdate,
  onSave,
  onCancel,
}: {
  accounts: Account[];
  initialLimits: Record<string, string>;
  monthlyIncome: number;
  saving: boolean;
  isUpdate: boolean;
  onSave: (lines: { account_id: string; limit_amount: number }[]) => void;
  onCancel: () => void;
}) {
  const expenseAccounts = useMemo(() => accounts.filter((a) => a.type === "expense" && a.is_active !== false), [accounts]);

  const [limits, setLimits] = useState<Record<string, string>>(initialLimits);
  const [cadence, setCadence] = useState<Cadence>("Monthly");

  const allocated = Object.values(limits).reduce((sum, v) => sum + (Number(v) || 0), 0);
  const recommended = monthlyIncome > 0 ? Math.round(monthlyIncome * 0.7) : 0;
  const effectiveLimit = allocated || recommended;
  const unallocated = effectiveLimit - allocated;
  const pct = monthlyIncome > 0 && allocated > 0 ? Math.round((allocated / monthlyIncome) * 100) : null;

  const applyPreset = (value: number) => {
    // Distribute a preset total evenly across categories.
    if (expenseAccounts.length === 0) return;
    const per = Math.round(value / expenseAccounts.length);
    setLimits(Object.fromEntries(expenseAccounts.map((a) => [a.id, String(per)])));
  };

  const autoSplit = () => {
    const target = allocated || recommended;
    if (!target || expenseAccounts.length === 0) return;
    const per = Math.round(target / expenseAccounts.length);
    setLimits(Object.fromEntries(expenseAccounts.map((a) => [a.id, String(per)])));
  };

  const save = () => {
    const lines = Object.entries(limits)
      .filter(([, v]) => Number(v) > 0)
      .map(([account_id, v]) => ({ account_id, limit_amount: Number(v) }));
    if (lines.length === 0) return;
    onSave(lines);
  };

  return (
    <div className="space-y-6">
      {/* Hero — total allocation */}
      <div className="rounded-lg bg-primary text-white p-6">
        <p className="eyebrow text-white/60">Monthly limit</p>
        <div className="flex items-end justify-between gap-4 mt-2">
          <p className="money text-[36px] leading-none font-semibold">LKR {formatMoney(String(allocated), 0)}</p>
          {pct !== null && (
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-white/80">
              {pct}% of income
            </span>
          )}
        </div>
        <p className="text-[13px] text-white/50 mt-3">
          Avg monthly income{" "}
          {monthlyIncome > 0 ? `LKR ${formatMoney(String(monthlyIncome), 0)}` : "—"} · recommended ≤ 80%
        </p>
      </div>

      {/* Cadence + presets */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border p-0.5">
          {(["Weekly", "Monthly"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCadence(c)}
              className={cn(
                "px-3 py-1 text-[13px] font-medium rounded-md transition-colors",
                cadence === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <Button key={p.label} type="button" variant="outline" size="sm" onClick={() => applyPreset(p.value)}>
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Per-category limit inputs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionLabel>Category limits</SectionLabel>
          <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={autoSplit}>
            Auto-split
          </Button>
        </div>

        {expenseAccounts.length === 0 ? (
          <div className="rounded-lg border bg-card p-6 text-center text-[13px] text-muted-foreground">
            No expense accounts to budget yet. Add expense accounts in the ledger first.
          </div>
        ) : (
          <div className="space-y-2">
            {expenseAccounts.map((a) => {
              const value = Number(limits[a.id] ?? 0);
              const share = effectiveLimit > 0 ? Math.min(100, (value / effectiveLimit) * 100) : 0;
              const Icon = categoryIcon(a.name);
              return (
                <div key={a.id} className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
                  <div className="size-9 shrink-0 rounded-lg bg-muted flex items-center justify-center">
                    <Icon className="size-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium truncate block">{a.name}</span>
                    <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${share}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs text-muted-foreground">LKR</span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="1000"
                      placeholder="0"
                      className="money text-right w-28 h-8"
                      value={limits[a.id] ?? ""}
                      onChange={(e) => setLimits((prev) => ({ ...prev, [a.id]: e.target.value }))}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Unallocated indicator */}
      {effectiveLimit > 0 && (
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <span
            className={cn(
              "size-2 rounded-full",
              unallocated < 0 ? "bg-[var(--status-danger-text)]" : "bg-primary"
            )}
          />
          <span>
            LKR {formatMoney(String(Math.abs(unallocated)), 0)} {unallocated < 0 ? "over budget" : "unallocated"}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={save} disabled={saving || allocated === 0}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : isUpdate ? "Update budget" : "Save budget"}
        </Button>
      </div>
    </div>
  );
}
