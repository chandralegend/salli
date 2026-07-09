"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { SurplusBreakdown } from "@/hooks/useFi";
import { cn } from "@/lib/utils";

const INCOME_COLORS = [
  "#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4",
];
const EXPENSE_COLORS = [
  "#f87171", "#fb923c", "#fbbf24", "#a78bfa", "#60a5fa", "#34d399",
];

function lkr(v: string | number): string {
  const n = Number(v);
  if (!isFinite(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString("en-LK", { maximumFractionDigits: 0 });
}

type Props = { data: SurplusBreakdown };

export function SurplusFlow({ data }: Props) {
  const incomeEntries = Object.entries(data.income_by_source).sort(
    ([, a], [, b]) => Number(b) - Number(a)
  );
  const expenseEntries = Object.entries(data.expense_by_category).sort(
    ([, a], [, b]) => Number(b) - Number(a)
  );

  const incomeChartData = incomeEntries.map(([name, value]) => ({
    name,
    value: Number(value),
  }));

  const savingsRate = Number(data.savings_rate) * 100;
  const surplusPositive = Number(data.monthly_surplus) >= 0;

  return (
    <div className="space-y-4">
      {/* Income donut */}
      <div className="flex items-center gap-4">
        <div className="shrink-0" style={{ width: 120, height: 120 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={incomeChartData}
                cx="50%"
                cy="50%"
                innerRadius={32}
                outerRadius={52}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
              >
                {incomeChartData.map((_, i) => (
                  <Cell key={i} fill={INCOME_COLORS[i % INCOME_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  fontSize: 11,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-1.5 min-w-0">
          {incomeEntries.map(([name, value], i) => (
            <div key={name} className="flex items-center gap-2 text-[12px]">
              <span
                className="size-2 rounded-full shrink-0"
                style={{ backgroundColor: INCOME_COLORS[i % INCOME_COLORS.length] }}
              />
              <span className="truncate text-muted-foreground flex-1">{name}</span>
              <span className="font-ledger text-[11px] shrink-0">LKR {lkr(value)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Flow breakdown */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-[12px]">
          <span className="text-muted-foreground">Total income</span>
          <span className="font-ledger text-emerald-600">LKR {lkr(data.gross_monthly_income)}</span>
        </div>

        <div className="space-y-1">
          {expenseEntries.map(([name, value], i) => (
            <div key={name} className="flex items-center gap-2 text-[11px]">
              <span
                className="size-1.5 rounded-full shrink-0"
                style={{ backgroundColor: EXPENSE_COLORS[i % EXPENSE_COLORS.length] }}
              />
              <span className="truncate text-muted-foreground flex-1">{name}</span>
              <span className="font-ledger text-rose-600/80 shrink-0">−{lkr(value)}</span>
            </div>
          ))}
        </div>

        <div className="h-px bg-border/60" />

        <div className="flex justify-between items-center text-[13px] font-medium">
          <span>Monthly surplus</span>
          <span className={cn("font-ledger", surplusPositive ? "text-emerald-600" : "text-rose-600")}>
            LKR {lkr(data.monthly_surplus)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-[width]",
                savingsRate >= 50 ? "bg-emerald-500" :
                savingsRate >= 30 ? "bg-primary" :
                savingsRate >= 10 ? "bg-amber-500" : "bg-rose-500"
              )}
              style={{ width: `${Math.min(100, Math.max(0, savingsRate))}%` }}
            />
          </div>
          <span className="font-ledger text-[12px] text-muted-foreground shrink-0">
            {savingsRate.toFixed(1)}% saved
          </span>
        </div>
      </div>
    </div>
  );
}
