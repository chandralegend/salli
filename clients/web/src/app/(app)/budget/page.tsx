"use client";

import { useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus, Trash2, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { PageShell, PageHeader, BentoTile, SectionTitle } from "@/components/ui/page-shell";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useLedger } from "@/hooks/useLedger";
import {
  useBudgets,
  useBudgetSummary,
  useCreateBudget,
  useDeleteBudget,
  type Budget,
  type BudgetLine,
} from "@/hooks/useBudget";

function fmt(v: string | number) {
  return Number(v).toLocaleString("en-LK", { minimumFractionDigits: 2 });
}

const EMPTY_LINE: BudgetLine = { account_id: "", limit_amount: "" };

export default function BudgetPage() {
  const { accounts } = useLedger();
  const expenseAccounts = (accounts.data ?? []).filter((a) => a.type === "expense" && a.is_active);

  const budgets = useBudgets();
  const createBudget = useCreateBudget();
  const deleteBudget = useDeleteBudget();

  const [addOpen, setAddOpen] = useState(false);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [lines, setLines] = useState<BudgetLine[]>([{ ...EMPTY_LINE }]);
  const [deleteTarget, setDeleteTarget] = useState<Budget | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const summary = useBudgetSummary(selectedId);

  function resetAddForm() {
    setPeriodStart("");
    setPeriodEnd("");
    setLines([{ ...EMPTY_LINE }]);
  }

  async function handleCreate() {
    const validLines = lines.filter((l) => l.account_id && l.limit_amount);
    if (!periodStart || !periodEnd || validLines.length === 0) return;
    await createBudget.mutateAsync({ period_start: periodStart, period_end: periodEnd, lines: validLines });
    setAddOpen(false);
    resetAddForm();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteBudget.mutateAsync(deleteTarget.id);
    if (selectedId === deleteTarget.id) setSelectedId(null);
    setDeleteTarget(null);
  }

  const columns: ColumnDef<Budget>[] = [
    {
      accessorKey: "period_start",
      header: "Period",
      cell: ({ row }) => (
        <span className="text-[13px] font-medium">
          {row.original.period_start} → {row.original.period_end}
        </span>
      ),
    },
    {
      id: "categories",
      header: "Categories",
      cell: ({ row }) => (
        <span className="text-[13px] text-muted-foreground">{row.original.lines.length}</span>
      ),
    },
    {
      id: "total_limit",
      header: "Total Limit",
      cell: ({ row }) => (
        <span className="font-mono tabular-nums text-[13px]">
          {fmt(row.original.lines.reduce((s, l) => s + Number(l.limit_amount), 0))}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            title="View summary"
            onClick={() => setSelectedId(row.original.id)}
          >
            <BarChart3 className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Delete"
            onClick={() => setDeleteTarget(row.original)}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Budget"
        subtitle="Category limits vs. actual ledger spend"
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="size-4 mr-1.5" /> New Budget
          </Button>
        }
      />

      <div className="rounded-2xl border bg-card overflow-hidden mb-6">
        <DataTable
          columns={columns}
          data={budgets.data ?? []}
          isLoading={budgets.isLoading}
          emptyNode={
            <span className="text-[13px] text-muted-foreground">
              No budgets yet. Create one to track category spend against limits.
            </span>
          }
        />
      </div>

      {selectedId && (
        <div className="flex flex-col gap-4">
          <SectionTitle>Summary</SectionTitle>
          {summary.isLoading ? (
            <div className="grid grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => (
                <BentoTile key={i} variant="card" label="" value="" loading />
              ))}
            </div>
          ) : summary.data ? (
            <>
              <div className="grid grid-cols-3 gap-4">
                <BentoTile variant="teal" label="Total Limit" value={fmt(summary.data.total_limit)} />
                <BentoTile variant="card" label="Total Actual" value={fmt(summary.data.total_actual)} />
                <BentoTile
                  variant={Number(summary.data.total_variance) < 0 ? "dark" : "mint"}
                  label="Total Variance"
                  value={fmt(summary.data.total_variance)}
                  badge={Number(summary.data.total_variance) < 0 ? "Over budget" : "On track"}
                  badgeVariant={Number(summary.data.total_variance) < 0 ? "red" : "green"}
                />
              </div>
              <div className="rounded-2xl border bg-card overflow-hidden">
                <Table>
                  <TableBody>
                    {summary.data.lines.map((line) => {
                      const over = Number(line.variance) < 0;
                      return (
                        <TableRow key={line.account_id} className="border-b last:border-0">
                          <TableCell className="text-[13px] font-medium px-4 py-3">{line.category}</TableCell>
                          <TableCell className="text-right font-mono tabular-nums text-[13px] px-4 py-3">
                            {fmt(line.actual_amount)} / {fmt(line.limit_amount)}
                          </TableCell>
                          <TableCell className="text-right px-4 py-3">
                            <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${over ? "badge-danger" : "badge-success"}`}>
                              {fmt(line.variance)}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ── Add Budget Dialog ── */}
      <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) resetAddForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Budget</DialogTitle>
            <DialogDescription>Declare per-category limits for a period.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Period start <span className="text-destructive">*</span></Label>
                <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Period end <span className="text-destructive">*</span></Label>
                <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Category limits <span className="text-destructive">*</span></Label>
              {lines.map((line, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Select
                    value={line.account_id}
                    onValueChange={(v) =>
                      setLines((prev) => prev.map((l, j) => (j === i ? { ...l, account_id: v ?? "" } : l)))
                    }
                  >
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Expense account" /></SelectTrigger>
                    <SelectContent>
                      {expenseAccounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Limit"
                    className="w-32"
                    value={line.limit_amount}
                    onChange={(e) =>
                      setLines((prev) => prev.map((l, j) => (j === i ? { ...l, limit_amount: e.target.value } : l)))
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={lines.length === 1}
                    onClick={() => setLines((prev) => prev.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() => setLines((prev) => [...prev, { ...EMPTY_LINE }])}
              >
                <Plus className="size-3.5 mr-1" /> Add category
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={createBudget.isPending || !periodStart || !periodEnd}
            >
              {createBudget.isPending ? "Creating…" : "Create Budget"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete budget?</AlertDialogTitle>
            <AlertDialogDescription>
              The budget for <strong>{deleteTarget?.period_start} → {deleteTarget?.period_end}</strong> will
              be permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
