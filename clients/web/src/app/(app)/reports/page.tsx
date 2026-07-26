"use client";

import { useMemo, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/PageHeader";
import { BalanceSheetTab } from "@/components/reports/BalanceSheetTab";
import { IncomeStatementTab } from "@/components/reports/IncomeStatementTab";
import { NetWorthTab } from "@/components/reports/NetWorthTab";
import {
  useBalanceSheet,
  useIncomeStatement,
  useNetWorthStatement,
  exportReportCsv,
  type ExportableReport,
} from "@/hooks/useReports";
import { assessmentYearRange } from "@/lib/format";

type TabKey = "balance-sheet" | "income" | "net-worth";

const TAB_LABELS: Record<TabKey, string> = {
  "balance-sheet": "Balance Sheet",
  income: "Income Stmt",
  "net-worth": "Net Worth",
};

const iso = (d: Date) => d.toISOString().slice(0, 10);

type Period = { value: string; label: string; from: string; to: string };

/** Income-statement period options — current month, last month, YTD, assessment year. */
function buildPeriods(now = new Date()): Period[] {
  const y = now.getFullYear();
  const m = now.getMonth();
  const fmtMonth = (d: Date) => d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  const thisMonthStart = new Date(y, m, 1);
  const lastMonthStart = new Date(y, m - 1, 1);
  const ay = assessmentYearRange(now);
  return [
    { value: "this-month", label: `This month · ${fmtMonth(thisMonthStart)}`, from: iso(thisMonthStart), to: iso(now) },
    {
      value: "last-month",
      label: `Last month · ${fmtMonth(lastMonthStart)}`,
      from: iso(lastMonthStart),
      to: iso(new Date(y, m, 0)),
    },
    { value: "ytd", label: `Year to date · ${y}`, from: `${y}-01-01`, to: iso(now) },
    { value: "assessment-year", label: `Assessment Year ${ay.label}`, from: ay.from, to: ay.to },
  ];
}

export default function ReportsPage() {
  const [tab, setTab] = useState<TabKey>("balance-sheet");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const periods = useMemo(() => buildPeriods(), []);
  const [periodValue, setPeriodValue] = useState(periods[0].value);
  const period = periods.find((p) => p.value === periodValue) ?? periods[0];

  const balanceSheet = useBalanceSheet();
  const netWorth = useNetWorthStatement();
  const income = useIncomeStatement({ from: period.from, to: period.to });

  // Which server-side CSV export the current tab maps to (Income Stmt has none).
  const exportType: ExportableReport | null =
    tab === "balance-sheet" ? "balance-sheet" : tab === "net-worth" ? "net-worth" : null;

  async function handleExport() {
    if (!exportType || exporting) return;
    setExportError(null);
    setExporting(true);
    try {
      await exportReportCsv(exportType);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Could not export this report.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Balance sheet, income statement, and net-worth trend — straight from your ledger"
        breadcrumbTab={TAB_LABELS[tab]}
        actions={
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={!exportType || exporting}
            title={exportType ? "Download as CSV" : "This report can't be exported"}
          >
            {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            Export CSV
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
          <TabsList>
            <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
            <TabsTrigger value="income">Income Stmt</TabsTrigger>
            <TabsTrigger value="net-worth">Net Worth</TabsTrigger>
          </TabsList>
        </Tabs>

        {tab === "income" && (
          <Select value={periodValue} onValueChange={(v) => v && setPeriodValue(v)}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periods.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {exportError && (
        <p className="text-[13px] text-[var(--status-danger-text)]">{exportError}</p>
      )}

      {tab === "balance-sheet" && (
        <BalanceSheetTab data={balanceSheet.data} loading={balanceSheet.isLoading} />
      )}
      {tab === "income" && (
        <IncomeStatementTab
          data={income.data}
          loading={income.isLoading}
          periodLabel={period.label}
        />
      )}
      {tab === "net-worth" && <NetWorthTab data={netWorth.data} loading={netWorth.isLoading} />}
    </div>
  );
}
