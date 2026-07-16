"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { PageShell } from "@/components/ui/page-shell";
import { useAccountOverview } from "@/hooks/useLedger";

const TYPE_COLORS: Record<string, string> = {
  asset: "badge-info",
  liability: "badge-danger",
  equity: "badge-purple",
  income: "badge-success",
  expense: "badge-warning",
};

function fmt(v: string | number) {
  return Number(v).toLocaleString("en-LK", { minimumFractionDigits: 2 });
}

export default function AccountDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const overview = useAccountOverview(params.id);

  return (
    <PageShell>
      <Button variant="ghost" size="sm" className="mb-4 -ml-2 gap-1.5" onClick={() => router.push("/ledger")}>
        <ArrowLeft className="w-4 h-4" /> Back to Ledger
      </Button>

      {overview.isLoading ? (
        <div className="flex flex-col gap-4">
          <div className="h-24 bg-muted rounded-2xl animate-pulse" />
          <div className="h-64 bg-muted rounded-2xl animate-pulse" />
        </div>
      ) : overview.isError ? (
        <Card className="p-12 text-center">
          <p className="text-[13px] text-muted-foreground">
            Account not found, or you don&apos;t have access to it.
          </p>
        </Card>
      ) : overview.data ? (
        <>
          <div className="flex items-start justify-between mb-6 gap-5">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="font-mono text-[13px] text-muted-foreground tabular-nums">
                  {overview.data.account.code}
                </span>
                <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium capitalize ${TYPE_COLORS[overview.data.account.type] ?? "bg-muted text-muted-foreground"}`}>
                  {overview.data.account.type}
                </span>
                <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${overview.data.account.is_active ? "badge-success" : "bg-muted text-muted-foreground"}`}>
                  {overview.data.account.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <h1 className="text-[32px] font-black tracking-[-0.04em] leading-[1.1] text-foreground">
                {overview.data.account.name}
              </h1>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.08em] mb-1">
                Current Balance
              </p>
              <p className="text-[28px] font-black tabular-nums font-mono tracking-tight text-foreground">
                {overview.data.account.currency} {fmt(overview.data.current_balance)}
              </p>
            </div>
          </div>

          <Card className="overflow-hidden">
            <div className="px-4 py-2.5 border-b">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
                Transactions
              </p>
            </div>
            <Table>
              <TableBody>
                {overview.data.transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8 text-[13px]">
                      No transactions on this account yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  [...overview.data.transactions].reverse().map((t, i, arr) => {
                    const priorBalance = i < arr.length - 1 ? Number(arr[i + 1].running_balance) : 0;
                    const delta = Number(t.running_balance) - priorBalance;
                    return (
                      <TableRow key={`${t.entry_id}-${i}`} className="border-b last:border-0">
                        <TableCell className="text-[12px] font-mono text-muted-foreground tabular-nums px-4 py-3 whitespace-nowrap">
                          {t.entry_date}
                        </TableCell>
                        <TableCell className="text-[13px] px-4 py-3">
                          <p className="font-medium text-foreground">{t.description}</p>
                          <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium capitalize mt-1">
                            {t.source}
                          </span>
                        </TableCell>
                        <TableCell className="text-right px-4 py-3">
                          <span className={`text-[13px] font-medium tabular-nums font-mono ${delta < 0 ? "text-destructive" : "text-emerald-600"}`}>
                            {delta >= 0 ? "+" : ""}{fmt(delta)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right px-4 py-3">
                          <span className="text-[13px] tabular-nums font-mono text-muted-foreground">
                            {fmt(t.running_balance)}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </>
      ) : null}
    </PageShell>
  );
}
