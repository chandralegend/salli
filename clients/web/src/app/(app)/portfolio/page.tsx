"use client";

import { useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { PageShell, PageHeader, BentoTile, SectionTitle, CardContainer } from "@/components/ui/page-shell";
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
  useHoldings,
  usePortfolioSummary,
  useAddHolding,
  useUpdateHolding,
  useDeleteHolding,
  type Holding,
} from "@/hooks/usePortfolio";

function fmt(v: string | number) {
  return Number(v).toLocaleString("en-LK", { minimumFractionDigits: 2 });
}

const EMPTY_FORM = { symbol: "", name: "", asset_class: "", cost_basis: "", current_value: "" };

const ALLOCATION_COLORS = ["#E8FC85", "#A5FFB9", "#D5E9EA", "#132b40", "#7668be", "#e7bd61"];

export default function PortfolioPage() {
  const holdings = useHoldings(false);
  const summary = usePortfolioSummary({});
  const addHolding = useAddHolding();
  const updateHolding = useUpdateHolding();
  const deleteHolding = useDeleteHolding();

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editTarget, setEditTarget] = useState<Holding | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Holding | null>(null);

  async function handleAdd() {
    if (!form.symbol || !form.name || !form.asset_class || !form.cost_basis || !form.current_value) return;
    await addHolding.mutateAsync({
      symbol: form.symbol,
      name: form.name,
      asset_class: form.asset_class,
      cost_basis: Number(form.cost_basis),
      current_value: Number(form.current_value),
    });
    setAddOpen(false);
    setForm(EMPTY_FORM);
  }

  function openEdit(h: Holding) {
    setEditTarget(h);
    setEditForm({
      symbol: h.symbol,
      name: h.name,
      asset_class: h.asset_class,
      cost_basis: h.cost_basis,
      current_value: h.current_value,
    });
  }

  async function handleUpdate() {
    if (!editTarget) return;
    await updateHolding.mutateAsync({
      id: editTarget.id,
      body: {
        symbol: editForm.symbol,
        name: editForm.name,
        asset_class: editForm.asset_class,
        cost_basis: Number(editForm.cost_basis),
        current_value: Number(editForm.current_value),
      },
    });
    setEditTarget(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteHolding.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }

  const columns: ColumnDef<Holding>[] = [
    { accessorKey: "symbol", header: "Symbol", cell: ({ row }) => <span className="text-[13px] font-mono font-medium">{row.original.symbol}</span> },
    { accessorKey: "name", header: "Name", cell: ({ row }) => <span className="text-[13px]">{row.original.name}</span> },
    { accessorKey: "asset_class", header: "Asset Class", cell: ({ row }) => <span className="text-[12px] text-muted-foreground capitalize">{row.original.asset_class}</span> },
    { accessorKey: "cost_basis", header: "Cost Basis", cell: ({ row }) => <span className="font-mono tabular-nums text-[13px]">{fmt(row.original.cost_basis)}</span> },
    { accessorKey: "current_value", header: "Current Value", cell: ({ row }) => <span className="font-mono tabular-nums text-[13px]">{fmt(row.original.current_value)}</span> },
    {
      id: "gain",
      header: "Gain",
      cell: ({ row }) => {
        const gain = Number(row.original.current_value) - Number(row.original.cost_basis);
        return (
          <span className={`font-mono tabular-nums text-[13px] ${gain < 0 ? "text-destructive" : "text-emerald-600"}`}>
            {gain >= 0 ? "+" : ""}{fmt(gain)}
          </span>
        );
      },
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

  return (
    <PageShell>
      <PageHeader
        title="Portfolio"
        subtitle="Holdings, allocation & ROI — manually entered, no live market feed"
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="size-4 mr-1.5" /> Add Holding
          </Button>
        }
      />

      {(holdings.data ?? []).length > 0 && summary.data && (
        <div className="flex flex-col gap-4 mb-6">
          <div className="grid grid-cols-3 gap-4">
            <BentoTile variant="teal" label="Total Value" value={fmt(summary.data.total_value)} />
            <BentoTile variant="card" label="Total Cost Basis" value={fmt(summary.data.total_cost_basis)} />
            <BentoTile
              variant={Number(summary.data.total_gain) < 0 ? "dark" : "mint"}
              label="Total Gain"
              value={fmt(summary.data.total_gain)}
              badge={`${Number(summary.data.total_gain_pct) >= 0 ? "+" : ""}${(Number(summary.data.total_gain_pct) * 100).toFixed(1)}%`}
              badgeVariant={Number(summary.data.total_gain) < 0 ? "red" : "green"}
            />
          </div>

          <CardContainer title="Allocation by Asset Class">
            <div className="flex flex-col gap-3">
              {summary.data.allocation.map((a, i) => (
                <div key={a.asset_class} className="flex items-center gap-3">
                  <span className="text-[12px] font-medium capitalize w-28 shrink-0">{a.asset_class}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, Number(a.pct_of_portfolio) * 100)}%`,
                        background: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length],
                      }}
                    />
                  </div>
                  <span className="text-[12px] font-mono tabular-nums w-16 text-right">
                    {(Number(a.pct_of_portfolio) * 100).toFixed(1)}%
                  </span>
                  <span className="text-[12px] font-mono tabular-nums text-muted-foreground w-24 text-right">
                    {fmt(a.current_value)}
                  </span>
                </div>
              ))}
            </div>
          </CardContainer>
        </div>
      )}

      <div className="rounded-2xl border bg-card overflow-hidden">
        <DataTable
          columns={columns}
          data={holdings.data ?? []}
          isLoading={holdings.isLoading}
          emptyNode={
            <span className="text-[13px] text-muted-foreground">
              No holdings yet. Add one to see allocation and ROI.
            </span>
          }
        />
      </div>

      {/* ── Add Holding Dialog ── */}
      <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) setForm(EMPTY_FORM); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Holding</DialogTitle>
            <DialogDescription>Manually declare an investment holding.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Symbol <span className="text-destructive">*</span></Label>
                <Input placeholder="e.g. VOO" value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Asset Class <span className="text-destructive">*</span></Label>
                <Input placeholder="e.g. equity" value={form.asset_class} onChange={(e) => setForm({ ...form, asset_class: e.target.value })} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Vanguard S&P 500 ETF" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Cost Basis <span className="text-destructive">*</span></Label>
                <Input value={form.cost_basis} onChange={(e) => setForm({ ...form, cost_basis: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Current Value <span className="text-destructive">*</span></Label>
                <Input value={form.current_value} onChange={(e) => setForm({ ...form, current_value: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={addHolding.isPending}>
              {addHolding.isPending ? "Adding…" : "Add Holding"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Holding Dialog ── */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Holding</DialogTitle>
            <DialogDescription>Update holding details.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Symbol</Label>
                <Input value={editForm.symbol} onChange={(e) => setEditForm({ ...editForm, symbol: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Asset Class</Label>
                <Input value={editForm.asset_class} onChange={(e) => setEditForm({ ...editForm, asset_class: e.target.value })} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Name</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Cost Basis</Label>
                <Input value={editForm.cost_basis} onChange={(e) => setEditForm({ ...editForm, cost_basis: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Current Value</Label>
                <Input value={editForm.current_value} onChange={(e) => setEditForm({ ...editForm, current_value: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateHolding.isPending}>
              {updateHolding.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete holding?</AlertDialogTitle>
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
