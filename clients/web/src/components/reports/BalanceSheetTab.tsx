import { Scale } from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { MoneyText } from "@/components/shared/MoneyText";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportSection, type ReportLine } from "@/components/reports/ReportSection";
import type { BalanceSheet } from "@/hooks/useReports";

const toLines = (rows: BalanceSheet["assets"]): ReportLine[] =>
  rows.map((r) => ({ code: r.code, label: r.name, value: r.balance }));

export function BalanceSheetTab({
  data,
  loading,
}: {
  data?: BalanceSheet;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const hasData =
    data &&
    (data.assets.length > 0 || data.liabilities.length > 0 || data.equity.length > 0);

  if (!data || !hasData) {
    return (
      <div className="rounded-lg border bg-card">
        <EmptyState
          icon={Scale}
          title="No balance sheet yet"
          body="Post entries to your ledger and Salli will build your asset, liability, and equity positions here."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Net Worth"
          value={<MoneyText value={data.net_worth} decimals={0} />}
          caption="Assets less liabilities"
          className="border-2 border-foreground"
        />
        <StatCard label="Total Assets" value={<MoneyText value={data.total_assets} decimals={0} />} caption="What you own" />
        <StatCard
          label="Total Liabilities"
          value={<MoneyText value={data.total_liabilities} decimals={0} />}
          caption="What you owe"
        />
        <StatCard label="Total Equity" value={<MoneyText value={data.total_equity} decimals={0} />} caption="Owner's equity" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 items-start">
        {data.assets.length > 0 && (
          <ReportSection title="Assets" lines={toLines(data.assets)} total={data.total_assets} accent />
        )}
        {data.liabilities.length > 0 && (
          <ReportSection title="Liabilities" lines={toLines(data.liabilities)} total={data.total_liabilities} />
        )}
        {data.equity.length > 0 && (
          <ReportSection title="Equity" lines={toLines(data.equity)} total={data.total_equity} />
        )}
      </div>
    </div>
  );
}
