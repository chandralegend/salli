"use client";

import { useState } from "react";
import { AlertTriangle, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatCard } from "@/components/shared/StatCard";
import { StatusChip } from "@/components/shared/StatusChip";
import { MoneyText } from "@/components/shared/MoneyText";
import {
  SubscriptionDialog,
  type SubscriptionFormData,
} from "@/components/subscriptions/SubscriptionDialog";
import { monthlyEquivalent, useSubscriptions, type Subscription } from "@/hooks/useSubscriptions";
import { formatDate, formatMoney } from "@/lib/format";

export default function SubscriptionsPage() {
  const { subscriptions, reports, addSubscription, updateSubscription, deleteSubscription } =
    useSubscriptions();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [deleting, setDeleting] = useState<Subscription | null>(null);

  const rows = subscriptions.data ?? [];
  const active = rows.filter((s) => s.is_active);
  const monthlyTotal = active.reduce(
    (sum, s) => sum + monthlyEquivalent(Number(s.amount), s.frequency),
    0
  );
  const alertCount = (reports.data ?? []).reduce((n, r) => n + r.alerts.length, 0);

  const reportFor = (id: string) => reports.data?.find((r) => r.subscription_id === id);

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(s: Subscription) {
    setEditing(s);
    setDialogOpen(true);
  }

  function submit(data: SubscriptionFormData) {
    const close = () => {
      setDialogOpen(false);
      setEditing(null);
    };
    if (editing) {
      updateSubscription.mutate({ id: editing.id, body: data }, { onSuccess: close });
    } else {
      addSubscription.mutate(data, { onSuccess: close });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscriptions"
        subtitle="Recurring charges, normalised to a monthly cost"
        actions={
          <Button onClick={openAdd}>
            <Plus className="size-4" /> Add subscription
          </Button>
        }
      />

      {/* Hero stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          emphasis
          label="Monthly Recurring"
          value={`LKR ${formatMoney(String(monthlyTotal))}`}
          badge={
            <StatusChip tone={alertCount > 0 ? "danger" : "success"}>
              {alertCount > 0
                ? `${alertCount} alert${alertCount === 1 ? "" : "s"}`
                : "All healthy"}
            </StatusChip>
          }
          caption={`${active.length} active`}
          loading={subscriptions.isLoading}
        />
        <StatCard
          label="Active"
          value={String(active.length)}
          caption="tracked subscriptions"
          icon={RefreshCw}
          loading={subscriptions.isLoading}
        />
        <StatCard
          label="Annualised"
          value={`LKR ${formatMoney(String(monthlyTotal * 12))}`}
          caption="projected 12-month spend"
          loading={subscriptions.isLoading}
        />
      </div>

      {/* List */}
      <div className="rounded-lg border bg-card">
        {subscriptions.isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={RefreshCw}
            title="No subscriptions tracked yet"
            body="Add a recurring charge to see its monthly-equivalent cost and catch price changes."
            action={
              <Button size="sm" variant="outline" onClick={openAdd}>
                Add subscription
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead className="w-32">Next due</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Monthly eq.</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s) => {
                const report = reportFor(s.id);
                const alerts = report?.alerts ?? [];
                const monthly = monthlyEquivalent(Number(s.amount), s.frequency);
                return (
                  <TableRow key={s.id} className="group">
                    <TableCell className="font-medium">
                      {s.name}
                      {!s.is_active && (
                        <StatusChip tone="neutral" className="ml-2">
                          inactive
                        </StatusChip>
                      )}
                      {alerts.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {alerts.map((a, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-1 text-[11px] text-[var(--status-danger-text)]"
                            >
                              <AlertTriangle className="size-3" />
                              <span>{a.message}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusChip tone="neutral" className="capitalize">
                        {s.frequency}
                      </StatusChip>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-[13px]">
                      {formatDate(s.next_due_date)}
                    </TableCell>
                    <TableCell className="text-right">
                      <MoneyText value={s.amount} prefix="LKR" />
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      <MoneyText value={String(monthly)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Edit subscription"
                          onClick={() => openEdit(s)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Delete subscription"
                          onClick={() => setDeleting(s)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <SubscriptionDialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) setEditing(null);
        }}
        subscription={editing}
        onSubmit={submit}
        pending={addSubscription.isPending || updateSubscription.isPending}
      />

      <AlertDialog open={Boolean(deleting)} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting ? `“${deleting.name}” ` : ""}
              will stop being tracked and its alerts will be cleared. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleting) deleteSubscription.mutate(deleting.id);
                setDeleting(null);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
