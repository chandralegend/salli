import { Receipt } from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { MoneyText } from "@/components/shared/MoneyText";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportSection, type ReportLine } from "@/components/reports/ReportSection";
import type { IncomeStatement } from "@/hooks/useReports";

/** Sums decimal-string amounts for a display-only total (never re-fed to money math). */
function sum(record: Record<string, string>): number {
  return Object.values(record).reduce((acc, v) => acc + (Number(v) || 0), 0);
}

const toLines = (record: Record<string, string>): ReportLine[] =>
  Object.entries(record).map(([label, value]) => ({ label, value }));

export function IncomeStatementTab({
  data,
  loading,
  periodLabel,
}: {
  data?: IncomeStatement;
  loading: boolean;
  periodLabel: string;
}) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const incomeEntries = data ? Object.keys(data.income).length : 0;
  const expenseEntries = data ? Object.keys(data.expenses).length : 0;

  if (!data || (incomeEntries === 0 && expenseEntries === 0)) {
    return (
      <div className="rounded-lg border bg-card">
        <EmptyState
          icon={Receipt}
          title="No activity this period"
          body={`No income or expenses were posted for ${periodLabel}. Try a different period or add ledger entries.`}
        />
      </div>
    );
  }

  const totalIncome = sum(data.income);
  const totalExpenses = sum(data.expenses);
  const net = Number(data.net_income) || 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StatCard
          label="Total Income"
          value={<MoneyText value={String(totalIncome)} decimals={0} />}
          caption={periodLabel}
        />
        <StatCard
          label="Total Expenses"
          value={<MoneyText value={String(totalExpenses)} decimals={0} />}
          caption={periodLabel}
        />
        <StatCard
          label="Net Income"
          value={<MoneyText value={data.net_income} decimals={0} />}
          caption={net >= 0 ? "Surplus" : "Deficit"}
          className="border-2 border-foreground"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 items-start">
        {incomeEntries > 0 && (
          <ReportSection title="Income" lines={toLines(data.income)} total={String(totalIncome)} accent />
        )}
        {expenseEntries > 0 && (
          <ReportSection title="Expenses" lines={toLines(data.expenses)} total={String(totalExpenses)} />
        )}
      </div>
    </div>
  );
}
