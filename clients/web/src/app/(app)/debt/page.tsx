"use client";

import { useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { PageShell, PageHeader, BentoTile, SectionTitle, PillButton } from "@/components/ui/page-shell";
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
import { Table, TableBody, TableCell, TableRow, TableHead, TableHeader } from "@/components/ui/table";
import {
  useDebts,
  usePayoffPlan,
  useAddDebt,
  useUpdateDebt,
  useDeleteDebt,
  type Debt,
} from "@/hooks/useDebt";

function fmt(v: string | number) {
  return Number(v).toLocaleString("en-LK", { minimumFractionDigits: 2 });
}

const EMPTY_FORM = { name: "", principal: "", apr: "", minimum_payment: "" };

export default function DebtPage() {
  const debts = useDebts(false);
  const addDebt = useAddDebt();
  const updateDebt = useUpdateDebt();
  const deleteDebt = useDeleteDebt();

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editTarget, setEditTarget] = useState<Debt | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Debt | null>(null);

  const [strategy, setStrategy] = useState<"avalanche" | "snowball">("avalanche");
  const [extraPayment, setExtraPayment] = useState("0");
  const plan = usePayoffPlan(Number(extraPayment) || 0, strategy);

  async function handleAdd() {
    if (!form.name || !form.principal || !form.apr || !form.minimum_payment) return;
    await addDebt.mutateAsync({
      name: form.name,
      principal: Number(form.principal),
      apr: Number(form.apr) / 100,
      minimum_payment: Number(form.minimum_payment),
    });
    setAddOpen(false);
    setForm(EMPTY_FORM);
  }

  function openEdit(d: Debt) {
    setEditTarget(d);
    setEditForm({
      name: d.name,
      principal: d.principal,
      apr: String(Number(d.apr) * 100),
      minimum_payment: d.minimum_payment,
    });
  }

  async function handleUpdate() {
    if (!editTarget) return;
    await updateDebt.mutateAsync({
      id: editTarget.id,
      body: {
        name: editForm.name,
        principal: Number(editForm.principal),
        apr: Number(editForm.apr) / 100,
        minimum_payment: Number(editForm.minimum_payment),
      },
    });
    setEditTarget(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteDebt.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }

  const columns: ColumnDef<Debt>[] = [
    { accessorKey: "name", header: "Name", cell: ({ row }) => <span className="text-[13px] font-medium">{row.original.name}</span> },
    { accessorKey: "principal", header: "Principal", cell: ({ row }) => <span className="font-mono tabular-nums text-[13px]">{fmt(row.original.principal)}</span> },
    { accessorKey: "apr", header: "APR", cell: ({ row }) => <span className="font-mono tabular-nums text-[13px]">{(Number(row.original.apr) * 100).toFixed(2)}%</span> },
    { accessorKey: "minimum_payment", header: "Min. Payment", cell: ({ row }) => <span className="font-mono tabular-nums text-[13px]">{fmt(row.original.minimum_payment)}</span> },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${row.original.is_active ? "badge-success" : "badge-danger"}`}>
          {row.original.is_active ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(row.original)}>
            <Pencil className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Delete" onClick={() => setDeleteTarget(row.original)}>
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  const visibleSchedule = plan.data?.schedule.slice(0, 12) ?? [];

  return (
    <PageShell>
      <PageHeader
        title="Debt"
        subtitle="Structured debts & avalanche/snowball payoff plans"
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="size-4 mr-1.5" /> Add Debt
          </Button>
        }
      />

      <div className="rounded-2xl border bg-card overflow-hidden mb-6">
        <DataTable
          columns={columns}
          data={debts.data ?? []}
          isLoading={debts.isLoading}
          emptyNode={
            <span className="text-[13px] text-muted-foreground">
              No debts recorded. Add one to see a payoff plan.
            </span>
          }
        />
      </div>

      {(debts.data ?? []).length > 0 && (
        <div className="flex flex-col gap-4">
          <SectionTitle>Payoff Plan</SectionTitle>

          <div className="flex items-center gap-3">
            <PillButton variant={strategy === "avalanche" ? "primary" : "secondary"} onClick={() => setStrategy("avalanche")}>
              Avalanche (highest APR first)
            </PillButton>
            <PillButton variant={strategy === "snowball" ? "primary" : "secondary"} onClick={() => setStrategy("snowball")}>
              Snowball (smallest balance first)
            </PillButton>
            <div className="flex items-center gap-2 ml-auto">
              <Label className="text-[12px] text-muted-foreground whitespace-nowrap">Extra monthly payment</Label>
              <Input
                className="w-28"
                value={extraPayment}
                onChange={(e) => setExtraPayment(e.target.value)}
              />
            </div>
          </div>

          {plan.isLoading ? (
            <div className="grid grid-cols-2 gap-4">
              <BentoTile variant="card" label="" value="" loading />
              <BentoTile variant="card" label="" value="" loading />
            </div>
          ) : plan.data ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <BentoTile variant="teal" label="Months to Payoff" value={String(plan.data.months_to_payoff)} />
                <BentoTile variant="card" label="Total Interest Paid" value={fmt(plan.data.total_interest_paid)} />
              </div>

              <p className="text-[11px] text-muted-foreground -mt-1">
                This is a planning estimate only, not financial advice. Showing the first {visibleSchedule.length} of{" "}
                {plan.data.schedule.length} scheduled payments.
              </p>

              <div className="rounded-2xl border bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Debt</TableHead>
                      <TableHead className="text-right">Payment</TableHead>
                      <TableHead className="text-right">Interest</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleSchedule.map((e, i) => (
                      <TableRow key={i} className="border-b last:border-0">
                        <TableCell className="text-[13px] px-4 py-2.5">{e.month}</TableCell>
                        <TableCell className="text-[13px] px-4 py-2.5">{e.debt_name}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-[13px] px-4 py-2.5">{fmt(e.payment)}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-[13px] px-4 py-2.5">{fmt(e.interest_paid)}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-[13px] px-4 py-2.5">{fmt(e.remaining_balance)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ── Add Debt Dialog ── */}
      <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) setForm(EMPTY_FORM); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Debt</DialogTitle>
            <DialogDescription>Track a structured debt (loan, credit card, etc.)</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Credit Card" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Principal <span className="text-destructive">*</span></Label>
                <Input value={form.principal} onChange={(e) => setForm({ ...form, principal: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>APR % <span className="text-destructive">*</span></Label>
                <Input value={form.apr} onChange={(e) => setForm({ ...form, apr: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Min. Payment <span className="text-destructive">*</span></Label>
                <Input value={form.minimum_payment} onChange={(e) => setForm({ ...form, minimum_payment: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={addDebt.isPending}>
              {addDebt.isPending ? "Adding…" : "Add Debt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Debt Dialog ── */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Debt</DialogTitle>
            <DialogDescription>Update debt details.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label>Name</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Principal</Label>
                <Input value={editForm.principal} onChange={(e) => setEditForm({ ...editForm, principal: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>APR %</Label>
                <Input value={editForm.apr} onChange={(e) => setEditForm({ ...editForm, apr: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Min. Payment</Label>
                <Input value={editForm.minimum_payment} onChange={(e) => setEditForm({ ...editForm, minimum_payment: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateDebt.isPending}>
              {updateDebt.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete debt?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.name}</strong> will be permanently deleted. This cannot be undone.
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
