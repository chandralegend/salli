"use client";

import { useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { PageShell, PageHeader, CardContainer } from "@/components/ui/page-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import {
  usePolicies,
  useCoverageTargets,
  useCoverageReport,
  useAddPolicy,
  useUpdatePolicy,
  useDeletePolicy,
  useSetCoverageTarget,
  useDeleteCoverageTarget,
  type Policy,
} from "@/hooks/useInsurance";

function fmt(v: string | number) {
  return Number(v).toLocaleString("en-LK", { minimumFractionDigits: 2 });
}

const EMPTY_FORM = {
  name: "", policy_type: "", provider: "", coverage_amount: "",
  premium_amount: "", premium_frequency: "annual", expiry_date: "",
};

export default function InsurancePage() {
  const [tab, setTab] = useState("policies");

  const policies = usePolicies(false);
  const addPolicy = useAddPolicy();
  const updatePolicy = useUpdatePolicy();
  const deletePolicy = useDeletePolicy();

  const targets = useCoverageTargets();
  const setTarget = useSetCoverageTarget();
  const deleteTarget2 = useDeleteCoverageTarget();

  const report = useCoverageReport();

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editTarget, setEditTarget] = useState<Policy | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [deleteTargetPolicy, setDeleteTargetPolicy] = useState<Policy | null>(null);

  const [targetType, setTargetType] = useState("");
  const [targetAmount, setTargetAmount] = useState("");

  async function handleAdd() {
    const { name, policy_type, provider, coverage_amount, premium_amount, premium_frequency, expiry_date } = form;
    if (!name || !policy_type || !provider || !coverage_amount || !premium_amount || !expiry_date) return;
    await addPolicy.mutateAsync({
      name, policy_type, provider,
      coverage_amount: Number(coverage_amount),
      premium_amount: Number(premium_amount),
      premium_frequency, expiry_date,
    });
    setAddOpen(false);
    setForm(EMPTY_FORM);
  }

  function openEdit(p: Policy) {
    setEditTarget(p);
    setEditForm({
      name: p.name, policy_type: p.policy_type, provider: p.provider,
      coverage_amount: p.coverage_amount, premium_amount: p.premium_amount,
      premium_frequency: p.premium_frequency, expiry_date: p.expiry_date,
    });
  }

  async function handleUpdate() {
    if (!editTarget) return;
    await updatePolicy.mutateAsync({
      id: editTarget.id,
      body: {
        name: editForm.name, policy_type: editForm.policy_type, provider: editForm.provider,
        coverage_amount: Number(editForm.coverage_amount), premium_amount: Number(editForm.premium_amount),
        premium_frequency: editForm.premium_frequency, expiry_date: editForm.expiry_date,
      },
    });
    setEditTarget(null);
  }

  async function handleDelete() {
    if (!deleteTargetPolicy) return;
    await deletePolicy.mutateAsync(deleteTargetPolicy.id);
    setDeleteTargetPolicy(null);
  }

  async function handleSetTarget() {
    if (!targetType || !targetAmount) return;
    await setTarget.mutateAsync({ policy_type: targetType, target_amount: Number(targetAmount) });
    setTargetType("");
    setTargetAmount("");
  }

  const columns: ColumnDef<Policy>[] = [
    { accessorKey: "name", header: "Name", cell: ({ row }) => <span className="text-[13px] font-medium">{row.original.name}</span> },
    { accessorKey: "policy_type", header: "Type", cell: ({ row }) => <span className="text-[12px] text-muted-foreground capitalize">{row.original.policy_type}</span> },
    { accessorKey: "provider", header: "Provider", cell: ({ row }) => <span className="text-[13px]">{row.original.provider}</span> },
    { accessorKey: "coverage_amount", header: "Coverage", cell: ({ row }) => <span className="font-mono tabular-nums text-[13px]">{fmt(row.original.coverage_amount)}</span> },
    { accessorKey: "expiry_date", header: "Expiry", cell: ({ row }) => <span className="text-[12px] text-muted-foreground">{row.original.expiry_date}</span> },
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
          <Button variant="ghost" size="icon" title="Delete" onClick={() => setDeleteTargetPolicy(row.original)}>
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageShell>
      <PageHeader title="Insurance" subtitle="Policies, coverage targets & gap report" />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="targets">Targets</TabsTrigger>
          <TabsTrigger value="report">Coverage Report</TabsTrigger>
        </TabsList>

        <TabsContent value="policies" className="mt-4">
          <div className="flex justify-end mb-3">
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="size-4 mr-1.5" /> Add Policy
            </Button>
          </div>
          <div className="rounded-2xl border bg-card overflow-hidden">
            <DataTable
              columns={columns}
              data={policies.data ?? []}
              isLoading={policies.isLoading}
              emptyNode={<span className="text-[13px] text-muted-foreground">No policies yet.</span>}
            />
          </div>
        </TabsContent>

        <TabsContent value="targets" className="mt-4">
          <CardContainer title="Declared Coverage Targets">
            <div className="flex flex-col gap-2 mb-4">
              {(targets.data ?? []).map((t) => (
                <div key={t.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/40">
                  <span className="text-[13px] font-medium capitalize">{t.policy_type}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono tabular-nums text-[13px]">{fmt(t.target_amount)}</span>
                    <Button variant="ghost" size="icon" onClick={() => deleteTarget2.mutate(t.policy_type)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              {(targets.data ?? []).length === 0 && (
                <p className="text-[13px] text-muted-foreground py-2">No targets declared yet.</p>
              )}
            </div>
            <div className="flex items-end gap-2">
              <div className="flex flex-col gap-1.5 flex-1">
                <Label>Policy Type</Label>
                <Input placeholder="e.g. life" value={targetType} onChange={(e) => setTargetType(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5 flex-1">
                <Label>Target Amount</Label>
                <Input value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} />
              </div>
              <Button onClick={handleSetTarget} disabled={setTarget.isPending}>Save</Button>
            </div>
          </CardContainer>
        </TabsContent>

        <TabsContent value="report" className="mt-4">
          {report.isLoading ? (
            <p className="text-[13px] text-muted-foreground">Loading…</p>
          ) : report.data ? (
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl border bg-card overflow-hidden">
                <Table>
                  <TableBody>
                    {report.data.lines.length === 0 ? (
                      <TableRow><TableCell className="text-center text-muted-foreground py-6 text-[13px]">No coverage targets declared.</TableCell></TableRow>
                    ) : (
                      report.data.lines.map((line) => {
                        const gapNegative = Number(line.gap) < 0;
                        return (
                          <TableRow key={line.policy_type} className="border-b last:border-0">
                            <TableCell className="text-[13px] font-medium capitalize px-4 py-3">{line.policy_type}</TableCell>
                            <TableCell className="text-right font-mono tabular-nums text-[13px] px-4 py-3">
                              {fmt(line.actual_coverage)} / {fmt(line.target_amount)}
                            </TableCell>
                            <TableCell className="text-right px-4 py-3">
                              <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${gapNegative ? "badge-danger" : "badge-success"}`}>
                                {fmt(line.gap)}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {report.data.missing_types.length > 0 && (
                <CardContainer title="Missing Coverage Types">
                  <div className="flex flex-wrap gap-2">
                    {report.data.missing_types.map((t) => (
                      <span key={t} className="badge-warning text-[11px] font-bold px-2 py-0.5 rounded-full capitalize">{t}</span>
                    ))}
                  </div>
                </CardContainer>
              )}

              {report.data.expiring_soon.length > 0 && (
                <CardContainer title="Expiring Soon">
                  <div className="flex flex-col gap-2">
                    {report.data.expiring_soon.map((a) => (
                      <div key={a.policy_name} className="flex items-center gap-2 text-[13px]">
                        <AlertTriangle className="size-4 text-amber-500 shrink-0" />
                        <span className="font-medium">{a.policy_name}</span>
                        <span className="text-muted-foreground">expires {a.expiry_date} ({a.days_until_expiry} days)</span>
                      </div>
                    ))}
                  </div>
                </CardContainer>
              )}
            </div>
          ) : null}
        </TabsContent>
      </Tabs>

      {/* ── Add Policy Dialog ── */}
      <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) setForm(EMPTY_FORM); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Policy</DialogTitle>
            <DialogDescription>Add an insurance policy to your inventory.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Name <span className="text-destructive">*</span></Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Type <span className="text-destructive">*</span></Label>
                <Input placeholder="e.g. life" value={form.policy_type} onChange={(e) => setForm({ ...form, policy_type: e.target.value })} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Provider <span className="text-destructive">*</span></Label>
              <Input value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Coverage <span className="text-destructive">*</span></Label>
                <Input value={form.coverage_amount} onChange={(e) => setForm({ ...form, coverage_amount: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Premium <span className="text-destructive">*</span></Label>
                <Input value={form.premium_amount} onChange={(e) => setForm({ ...form, premium_amount: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Frequency</Label>
                <Input value={form.premium_frequency} onChange={(e) => setForm({ ...form, premium_frequency: e.target.value })} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Expiry Date <span className="text-destructive">*</span></Label>
              <Input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={addPolicy.isPending}>
              {addPolicy.isPending ? "Adding…" : "Add Policy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Policy Dialog ── */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Policy</DialogTitle>
            <DialogDescription>Update policy details.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Name</Label>
                <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Type</Label>
                <Input value={editForm.policy_type} onChange={(e) => setEditForm({ ...editForm, policy_type: e.target.value })} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Provider</Label>
              <Input value={editForm.provider} onChange={(e) => setEditForm({ ...editForm, provider: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Coverage</Label>
                <Input value={editForm.coverage_amount} onChange={(e) => setEditForm({ ...editForm, coverage_amount: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Premium</Label>
                <Input value={editForm.premium_amount} onChange={(e) => setEditForm({ ...editForm, premium_amount: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Frequency</Label>
                <Input value={editForm.premium_frequency} onChange={(e) => setEditForm({ ...editForm, premium_frequency: e.target.value })} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Expiry Date</Label>
              <Input type="date" value={editForm.expiry_date} onChange={(e) => setEditForm({ ...editForm, expiry_date: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updatePolicy.isPending}>
              {updatePolicy.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ── */}
      <AlertDialog open={!!deleteTargetPolicy} onOpenChange={(open) => { if (!open) setDeleteTargetPolicy(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete policy?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTargetPolicy?.name}</strong> will be permanently deleted. This cannot be undone.
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
