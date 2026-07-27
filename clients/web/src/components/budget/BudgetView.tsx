import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { MoneyText } from "@/components/shared/MoneyText";
import { StatusChip } from "@/components/shared/StatusChip";
import { SectionLabel } from "@/components/shared/SectionLabel";
import type { BudgetSummaryFull } from "@/hooks/useBudget";
import { categoryIcon } from "./categoryIcon";

/**
 * Read-only budget dashboard: a navy spend-vs-limit hero plus per-category
 * limit bars, all sourced from the deterministic summary endpoint.
 */
export function BudgetView({ summary, monthLabel }: { summary: BudgetSummaryFull; monthLabel: string }) {
  const spent = Number(summary.total_actual);
  const limit = Number(summary.total_limit);
  const remaining = limit - spent;
  const usedPct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
  const over = remaining < 0;

  return (
    <div className="space-y-6">
      {/* Hero — spend vs limit */}
      <div className="rounded-lg bg-[var(--emphasis)] text-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow text-white/60">Monthly budget</p>
            <p className="money text-[36px] leading-none font-semibold mt-2">
              LKR {formatMoney(summary.total_actual, 0)}
            </p>
            <p className="text-[13px] text-white/50 mt-2">of LKR {formatMoney(summary.total_limit, 0)} limit</p>
          </div>
          <StatusChip tone={over ? "danger" : "success"}>{usedPct}% used</StatusChip>
        </div>

        <div className="mt-4 flex items-center justify-between text-[13px] text-white/60">
          <span>{monthLabel}</span>
          <span className={over ? "text-[var(--status-danger-text)]" : "text-[var(--status-success-text)]"}>
            LKR {formatMoney(String(Math.abs(remaining)), 0)} {over ? "over" : "remaining"}
          </span>
        </div>
      </div>

      {/* Per-category limit bars */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionLabel>Category limits</SectionLabel>
          <span className="text-[13px] text-muted-foreground">{monthLabel}</span>
        </div>

        <div className="space-y-2">
          {summary.lines.map((line) => {
            const actual = Number(line.actual_amount);
            const lim = Number(line.limit_amount);
            const lineOver = actual > lim;
            const share = lim > 0 ? Math.min(100, (actual / lim) * 100) : 0;
            const Icon = categoryIcon(line.category);
            return (
              <div
                key={line.category}
                className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3"
              >
                <div
                  className={cn(
                    "size-9 shrink-0 rounded-lg flex items-center justify-center",
                    lineOver ? "bg-[var(--status-danger-bg)]" : "bg-muted"
                  )}
                >
                  <Icon
                    className={cn("size-4", lineOver ? "text-[var(--status-danger-text)]" : "text-muted-foreground")}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{line.category}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold shrink-0",
                        lineOver ? "bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {Math.round(share)}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    <MoneyText value={line.actual_amount} decimals={0} /> of{" "}
                    <MoneyText value={line.limit_amount} decimals={0} />
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
