"use client";

import { useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { PageShell, PageHeader, SectionTitle, CardContainer } from "@/components/ui/page-shell";
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
  useSubscriptions,
  useSubscriptionReports,
  useAddSubscription,
  useUpdateSubscription,
  useDeleteSubscription,
  type Subscription,
} from "@/hooks/useSubscriptions";

function fmt(v: string | number) {
  return Number(v).toLocaleString("en-LK", { minimumFractionDigits: 2 });
}

const EMPTY_FORM = { name: "", amount: "", frequency: "monthly", next_due_date: "" };

export default function SubscriptionsPage() {
  const subscriptions = useSubscriptions(false);
  const reports = useSubscriptionReports();
  const addSubscription = useAddSubscription();
  const updateSubscription = useUpdateSubscription();
  const deleteSubscription = useDeleteSubscription();

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editTarget, setEditTarget] = useState<Subscription | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Subscription | null>(null);

  async function handleAdd() {
    if (!form.name || !form.amount || !form.next_due_date) return;
    await addSubscription.mutateAsync({
      name: form.name,
      amount: Number(form.amount),
      frequency: form.frequency,
      next_due_date: form.next_due_date,
    });
    setAddOpen(false);
    setForm(EMPTY_FORM);
  }

  function openEdit(s: Subscription) {
    setEditTarget(s);
    setEditForm({ name: s.name, amount: s.amount, frequency: s.frequency, next_due_date: s.next_due_date });
  }

  async function handleUpdate() {
    if (!editTarget) return;
    await updateSubscription.mutateAsync({
      id: editTarget.id,
      body: {
        name: editForm.name, amount: Number(editForm.amount),
        frequency: editForm.frequency, next_due_date: editForm.next_due_date,
      },
    });
    setEditTarget(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteSubscription.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }

  const columns: ColumnDef<Subscription>[] = [
    { accessorKey: "name", header: "Name", cell: ({ row }) => <span className="text-[13px] font-medium">{row.original.name}</span> },
    { accessorKey: "amount", header: "Amount", cell: ({ row }) => <span className="font-mono tabular-nums text-[13px]">{fmt(row.original.amount)}</span> },
    { accessorKey: "frequency", header: "Frequency", cell: ({ row }) => <span className="text-[12px] text-muted-foreground capitalize">{row.original.frequency}</span> },
    { accessorKey: "next_due_date", header: "Next Due", cell: ({ row }) => <span className="text-[12px] text-muted-foreground">{row.original.next_due_date}</span> },
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

  return (
    <PageShell>
      <PageHeader
        title="Subscriptions"
        subtitle="Recurring charges & missed-charge/price-change alerts"
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="size-4 mr-1.5" /> Add Subscription
          </Button>
        }
      />

      <div className="rounded-2xl border bg-card overflow-hidden mb-6">
        <DataTable
          columns={columns}
          data={subscriptions.data ?? []}
          isLoading={subscriptions.isLoading}
          emptyNode={<span className="text-[13px] text-muted-foreground">No subscriptions tracked yet.</span>}
        />
      </div>

      {(subscriptions.data ?? []).length > 0 && (
        <div className="flex flex-col gap-3">
          <SectionTitle>Alerts</SectionTitle>
          {reports.isLoading ? (
            <p className="text-[13px] text-muted-foreground">Loading…</p>
          ) : (
            (reports.data ?? []).map((r) => (
              <CardContainer key={r.subscription_id} title={r.name}>
                {r.alerts.length === 0 ? (
                  <div className="flex items-center gap-2 text-[13px] text-emerald-600">
                    <CheckCircle2 className="size-4" /> No alerts.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {r.alerts.map((a, i) => (
                      <div key={i} className="flex items-start gap-2 text-[13px]">
                        <AlertTriangle className={`size-4 shrink-0 mt-0.5 ${a.kind === "missed_charge" ? "text-destructive" : "text-amber-500"}`} />
                        <span>{a.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContainer>
            ))
          )}
        </div>
      )}

      {/* ── Add Subscription Dialog ── */}
      <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) setForm(EMPTY_FORM); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Subscription</DialogTitle>
            <DialogDescription>Track a recurring expense to detect missed/changed charges.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Netflix" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Amount <span className="text-destructive">*</span></Label>
                <Input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Frequency</Label>
                <Input value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Next Due <span className="text-destructive">*</span></Label>
                <Input type="date" value={form.next_due_date} onChange={(e) => setForm({ ...form, next_due_date: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={addSubscription.isPending}>
              {addSubscription.isPending ? "Adding…" : "Add Subscription"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Subscription Dialog ── */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subscription</DialogTitle>
            <DialogDescription>Update subscription details.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label>Name</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Amount</Label>
                <Input value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Frequency</Label>
                <Input value={editForm.frequency} onChange={(e) => setEditForm({ ...editForm, frequency: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Next Due</Label>
                <Input type="date" value={editForm.next_due_date} onChange={(e) => setEditForm({ ...editForm, next_due_date: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateSubscription.isPending}>
              {updateSubscription.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete subscription?</AlertDialogTitle>
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
