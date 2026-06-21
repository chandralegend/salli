"use client";

import { useState } from "react";
import { Check, Loader2, Calendar, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { DeadlineChip } from "@/components/DeadlineChip";
import { useReminders, type Reminder } from "@/hooks/useReminders";

function ReminderTable({
  items,
  done,
  onMarkDone,
  onDelete,
  markDonePending,
}: {
  items: Reminder[];
  done: boolean;
  onMarkDone?: (id: string) => void;
  onDelete: (r: Reminder) => void;
  markDonePending?: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/40 hover:bg-muted/40 border-b">
          <TableHead className="h-9 px-4">
            <span className="text-secondary-label">Obligation</span>
          </TableHead>
          <TableHead className="h-9 px-4 w-28">
            <span className="text-secondary-label">Due Date</span>
          </TableHead>
          <TableHead className="h-9 px-4 w-28">
            <span className="text-secondary-label">Status</span>
          </TableHead>
          <TableHead className="h-9 px-4 w-20 text-right">
            <span className="text-secondary-label">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((r) => (
          <TableRow
            key={r.id}
            className={`border-b last:border-0 ${done ? "opacity-55" : ""}`}
          >
            <TableCell className="px-4 py-3">
              <span className={`text-[13px] font-medium ${done ? "line-through text-muted-foreground" : ""}`}>
                {r.kind}
              </span>
            </TableCell>
            <TableCell className="px-4 py-3">
              <span className="text-[12px] font-mono text-muted-foreground tabular-nums">{r.due_date}</span>
            </TableCell>
            <TableCell className="px-4 py-3">
              <DeadlineChip dueDate={r.due_date} done={done} />
            </TableCell>
            <TableCell className="px-4 py-3">
              <div className="flex gap-1 justify-end">
                {!done && onMarkDone && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50"
                    onClick={() => onMarkDone(r.id)}
                    disabled={markDonePending}
                    title="Mark as done"
                  >
                    {markDonePending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => onDelete(r)}
                  title="Delete reminder"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function RemindersPage() {
  const { reminders, markDone, deleteReminder, seedCalendar, createReminder } = useReminders();
  const [createOpen, setCreateOpen] = useState(false);
  const [kind, setKind] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Reminder | null>(null);

  const items = reminders.data ?? [];
  const pending = items.filter((r) => r.status !== "done");
  const done = items.filter((r) => r.status === "done");

  async function handleCreate() {
    if (!kind || !dueDate) return;
    await createReminder.mutateAsync({ kind, due_date: dueDate });
    setCreateOpen(false);
    setKind(""); setDueDate("");
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[18px] font-semibold tracking-tight">Reminders</h1>
          <p className="text-meta mt-0.5">IRD filing deadlines and tax obligations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> New Reminder
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => seedCalendar.mutateAsync(undefined)}
            disabled={seedCalendar.isPending}
          >
            {seedCalendar.isPending ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Calendar className="w-4 h-4 mr-1.5" />
            )}
            Seed Calendar
          </Button>
        </div>
      </div>

      {reminders.isLoading ? (
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30 h-10" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b last:border-0">
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-16 rounded-md" />
              <Skeleton className="h-7 w-16" />
            </div>
          ))}
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <div className="p-12 text-center">
            <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h2 className="text-[15px] font-semibold mb-1">No reminders yet</h2>
            <p className="text-[13px] text-muted-foreground mb-4">
              Seed the IRD filing calendar or create your own reminders.
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => seedCalendar.mutateAsync(undefined)} disabled={seedCalendar.isPending}>
                {seedCalendar.isPending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Calendar className="w-4 h-4 mr-1.5" />}
                Seed filing calendar
              </Button>
              <Button variant="outline" onClick={() => setCreateOpen(true)}>
                <Plus className="w-4 h-4 mr-1.5" /> Add reminder
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {pending.length > 0 && (
            <Card className="overflow-hidden">
              <div className="px-4 py-2.5 border-b">
                <p className="text-secondary-label">Pending · {pending.length}</p>
              </div>
              <ReminderTable
                items={pending}
                done={false}
                onMarkDone={(id) => markDone.mutate(id)}
                onDelete={(r) => setDeleteTarget(r)}
                markDonePending={markDone.isPending}
              />
            </Card>
          )}

          {done.length > 0 && (
            <Card className="overflow-hidden">
              <div className="px-4 py-2.5 border-b bg-muted/20">
                <p className="text-secondary-label">Completed · {done.length}</p>
              </div>
              <ReminderTable
                items={done}
                done={true}
                onDelete={(r) => setDeleteTarget(r)}
              />
            </Card>
          )}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Reminder</DialogTitle>
            <DialogDescription>Create a custom filing deadline or tax obligation reminder.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label>Description <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. Quarterly SVAT return"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Due Date <span className="text-destructive">*</span></Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createReminder.isPending || !kind || !dueDate}>
              {createReminder.isPending ? "Saving…" : "Save Reminder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete reminder?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.kind}</strong> (due {deleteTarget?.due_date}) will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (deleteTarget) {
                  await deleteReminder.mutateAsync(deleteTarget.id);
                  setDeleteTarget(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
