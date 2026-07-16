"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageShell, PageHeader, BentoTile, CardContainer } from "@/components/ui/page-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import {
  useBalanceSheet,
  useNetWorthStatement,
  useGoalProgressReport,
  downloadReportCsv,
} from "@/hooks/useReports";
import { toast } from "sonner";

function fmt(v: string | number | null | undefined) {
  if (v === null || v === undefined) return "—";
  return Number(v).toLocaleString("en-LK", { minimumFractionDigits: 2 });
}

function ExportButton({ reportType }: { reportType: "balance-sheet" | "net-worth" | "goal-progress" }) {
  const [pending, setPending] = useState(false);
  async function handleExport() {
    setPending(true);
    try {
      await downloadReportCsv(reportType);
      toast.success("Export downloaded");
    } catch (e) {
      toast.error(`Export failed: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setPending(false);
    }
  }
  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={pending}>
      <Download className="size-3.5 mr-1.5" /> {pending ? "Exporting…" : "Export CSV"}
    </Button>
  );
}

export default function ReportsPage() {
  const [tab, setTab] = useState("balance-sheet");

  const balanceSheet = useBalanceSheet();
  const netWorth = useNetWorthStatement();
  const goalProgress = useGoalProgressReport();

  return (
    <PageShell>
      <PageHeader title="Reports" subtitle="Balance sheet, net worth & goal progress — exportable as CSV" />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
          <TabsTrigger value="net-worth">Net Worth</TabsTrigger>
          <TabsTrigger value="goal-progress">Goal Progress</TabsTrigger>
        </TabsList>

        <TabsContent value="balance-sheet" className="mt-4">
          <div className="flex justify-end mb-3">
            <ExportButton reportType="balance-sheet" />
          </div>
          {balanceSheet.data && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-4 gap-4">
                <BentoTile variant="teal" label="Total Assets" value={fmt(balanceSheet.data.total_assets)} />
                <BentoTile variant="card" label="Total Liabilities" value={fmt(balanceSheet.data.total_liabilities)} />
                <BentoTile variant="card" label="Total Equity" value={fmt(balanceSheet.data.total_equity)} />
                <BentoTile variant="mint" label="Net Worth" value={fmt(balanceSheet.data.net_worth)} />
              </div>
              {(["assets", "liabilities", "equity"] as const).map((section) => (
                <CardContainer key={section} title={section.charAt(0).toUpperCase() + section.slice(1)}>
                  <Table>
                    <TableBody>
                      {balanceSheet.data[section].length === 0 ? (
                        <TableRow><TableCell className="text-center text-muted-foreground py-4 text-[13px]">No accounts.</TableCell></TableRow>
                      ) : (
                        balanceSheet.data[section].map((line) => (
                          <TableRow key={line.account_id} className="border-b last:border-0">
                            <TableCell className="text-[13px] px-2 py-2">{line.code} — {line.name}</TableCell>
                            <TableCell className="text-right font-mono tabular-nums text-[13px] px-2 py-2">{fmt(line.balance)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContainer>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="net-worth" className="mt-4">
          <div className="flex justify-end mb-3">
            <ExportButton reportType="net-worth" />
          </div>
          {netWorth.data && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <BentoTile variant="teal" label="Current Net Worth" value={fmt(netWorth.data.current_net_worth)} />
                <BentoTile variant="card" label="As Of" value={netWorth.data.as_of ? new Date(netWorth.data.as_of).toLocaleDateString() : "—"} />
              </div>
              <CardContainer title="Trend">
                <Table>
                  <TableBody>
                    {netWorth.data.trend.length === 0 ? (
                      <TableRow><TableCell className="text-center text-muted-foreground py-4 text-[13px]">No history yet.</TableCell></TableRow>
                    ) : (
                      netWorth.data.trend.map((t, i) => (
                        <TableRow key={i} className="border-b last:border-0">
                          <TableCell className="text-[13px] px-2 py-2">{t.date ? new Date(t.date).toLocaleDateString() : "—"}</TableCell>
                          <TableCell className="text-right font-mono tabular-nums text-[13px] px-2 py-2">{fmt(t.net_worth)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContainer>
            </div>
          )}
        </TabsContent>

        <TabsContent value="goal-progress" className="mt-4">
          <div className="flex justify-end mb-3">
            <ExportButton reportType="goal-progress" />
          </div>
          {goalProgress.data && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <BentoTile variant="mint" label="Completed Goals" value={String(goalProgress.data.completed_count)} />
                <BentoTile variant="card" label="In Progress" value={String(goalProgress.data.in_progress_count)} />
              </div>
              <CardContainer title="Goals">
                <Table>
                  <TableBody>
                    {goalProgress.data.goals.length === 0 ? (
                      <TableRow><TableCell className="text-center text-muted-foreground py-4 text-[13px]">No goals yet.</TableCell></TableRow>
                    ) : (
                      goalProgress.data.goals.map((g) => (
                        <TableRow key={g.id} className="border-b last:border-0">
                          <TableCell className="text-[13px] px-2 py-2">{g.name}</TableCell>
                          <TableCell className="text-right font-mono tabular-nums text-[13px] px-2 py-2">
                            {fmt(g.current_amount)} / {fmt(g.target_amount)}
                          </TableCell>
                          <TableCell className="text-right px-2 py-2">
                            <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${g.progress >= 1 ? "badge-success" : "badge-info"}`}>
                              {(g.progress * 100).toFixed(0)}%
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContainer>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
