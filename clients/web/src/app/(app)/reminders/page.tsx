"use client";

import { useState } from "react";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { useReminders, type Reminder } from "@/hooks/useReminders";
import { PageShell, PageHeader, PillButton, CardContainer } from "@/components/ui/page-shell";

// ── Status chip ────────────────────────────────────────────────────────────────

function statusChip(dueDate: string, done: boolean) {
  if (done) return { label: "Done", bg: "#DCFCE7", color: "#16A34A" };
  const d = new Date(dueDate);
  const now = new Date();
  const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return { label: "Overdue", bg: "#FEE2E2", color: "#DC2626" };
  if (diff <= 14) return { label: "Due Soon", bg: "#FEF3C7", color: "#D97706" };
  return { label: "Upcoming", bg: "#F1F7F7", color: "#7DA6A9" };
}

// ── Reminder row ───────────────────────────────────────────────────────────────

function ReminderRow({
  r, done, onMarkDone, onDelete, markDonePending,
}: {
  r: Reminder; done: boolean; onMarkDone?: (id: string) => void;
  onDelete: (r: Reminder) => void; markDonePending?: boolean;
}) {
  const chip = statusChip(r.due_date, done);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 130px 110px 150px",
        padding: "14px 22px",
        borderBottom: "1px solid var(--border)",
        alignItems: "center",
        opacity: done ? 0.6 : 1,
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: done ? 600 : 700,
          textDecoration: done ? "line-through" : "none",
          color: done ? "var(--muted-foreground)" : "var(--foreground)",
        }}
      >
        {r.kind}
      </div>
      <div style={{ fontSize: 13, color: "#7DA6A9" }}>
        {new Date(r.due_date).toLocaleDateString("en-LK", { day: "numeric", month: "short", year: "numeric" })}
      </div>
      <div>
        <span style={{ fontSize: 11, fontWeight: 800, color: chip.color, background: chip.bg, padding: "3px 10px", borderRadius: 999 }}>
          {chip.label}
        </span>
      </div>
      <div style={{ textAlign: "right", display: "flex", gap: 8, justifyContent: "flex-end" }}>
        {!done && onMarkDone && (
          <button
            onClick={() => onMarkDone(r.id)}
            disabled={markDonePending}
            style={{ fontSize: 12.5, fontWeight: 700, color: "#16A34A", border: "1.5px solid #16A34A", background: "transparent", cursor: "pointer", fontFamily: "inherit", padding: "5px 12px", borderRadius: 999 }}
          >
            {markDonePending ? <Loader2 className="inline size-3 mr-1 animate-spin" /> : <Check className="inline size-3 mr-1" />}
            Done
          </button>
        )}
        <button
          onClick={() => onDelete(r)}
          style={{ fontSize: 12.5, color: "#DC2626", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RemindersPage() {
  const { reminders, markDone, deleteReminder, seedCalendar, createReminder } = useReminders();
  const [createOpen, setCreateOpen] = useState(false);
  const [kind, setKind] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Reminder | null>(null);

  const items = reminders.data ?? [];
  const pending = items.filter((r) => r.status !== "done");
  const done = items.filter((r) => r.status === "done");

  // Count by urgency
  const overdue = pending.filter((r) => {
    const d = new Date(r.due_date);
    return d.getTime() < Date.now();
  });
  const dueSoon = pending.filter((r) => {
    const d = new Date(r.due_date);
    const diff = (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 14;
  });
  const upcoming = pending.filter((r) => {
    const d = new Date(r.due_date);
    const diff = (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff > 14;
  });

  async function handleCreate() {
    if (!kind || !dueDate) return;
    await createReminder.mutateAsync({ kind, due_date: dueDate });
    setCreateOpen(false);
    setKind(""); setDueDate("");
  }

  return (
    <PageShell>
      <PageHeader
        title="Reminders"
        subtitle="Filing deadlines and financial obligations"
        className="mb-6"
        actions={
          <>
            <PillButton onClick={() => seedCalendar.mutateAsync(undefined)} disabled={seedCalendar.isPending} variant="secondary">
              {seedCalendar.isPending && <Loader2 className="inline size-3.5 mr-1.5 animate-spin" />}
              Seed IRD Calendar
            </PillButton>
            <PillButton onClick={() => setCreateOpen(true)} variant="primary">+ New</PillButton>
          </>
        }
      />

      {/* Status bento (only show when there are items) */}
      {!reminders.isLoading && items.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
          <div style={{ background: "#FEE2E2", borderRadius: 18, padding: "20px 22px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(220,38,38,0.55)", marginBottom: 8 }}>Overdue</div>
            <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: "-0.06em", color: "#DC2626", lineHeight: 1 }}>{overdue.length}</div>
          </div>
          <div style={{ background: "#FEF3C7", borderRadius: 18, padding: "20px 22px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(217,119,6,0.55)", marginBottom: 8 }}>Due Soon</div>
            <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: "-0.06em", color: "#D97706", lineHeight: 1 }}>{dueSoon.length}</div>
          </div>
          <div style={{ background: "#F1F7F7", borderRadius: 18, padding: "20px 22px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#7DA6A9", marginBottom: 8 }}>Upcoming</div>
            <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: "-0.06em", color: "var(--foreground)", lineHeight: 1 }}>{upcoming.length}</div>
          </div>
        </div>
      )}

      {reminders.isLoading ? (
        <CardContainer overflow="hidden" padding={0}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 130px 110px 150px", padding: "14px 22px", borderBottom: "1px solid var(--border)" }}>
              <div className="h-4 bg-muted rounded animate-pulse" />
              <div className="h-4 bg-muted rounded animate-pulse" />
              <div className="h-5 bg-muted rounded animate-pulse w-16" />
              <div className="h-7 bg-muted rounded animate-pulse w-16 ml-auto" />
            </div>
          ))}
        </CardContainer>
      ) : items.length === 0 ? (
        <CardContainer style={{ textAlign: "center" }} padding="64px 24px">
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--foreground)", marginBottom: 8 }}>No reminders yet</p>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 20 }}>Seed the IRD filing calendar or create your own reminders.</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <Button onClick={() => seedCalendar.mutateAsync(undefined)} disabled={seedCalendar.isPending}>
              {seedCalendar.isPending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
              Seed filing calendar
            </Button>
            <Button variant="outline" onClick={() => setCreateOpen(true)}>
              <Plus className="size-3.5 mr-1.5" /> Add reminder
            </Button>
          </div>
        </CardContainer>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {pending.length > 0 && (
            <CardContainer overflow="hidden" padding={0}>
              <div style={{ padding: "14px 22px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted-foreground)" }}>
                  Pending ({pending.length})
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 130px 110px 150px", padding: "10px 22px", borderBottom: "1px solid var(--border)" }}>
                {["Obligation", "Due Date", "Status", "Actions"].map((h, i) => (
                  <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", letterSpacing: "0.06em", textTransform: "uppercase", textAlign: i === 3 ? "right" : "left" }}>
                    {h}
                  </div>
                ))}
              </div>
              {pending.map((r) => (
                <ReminderRow
                  key={r.id}
                  r={r}
                  done={false}
                  onMarkDone={(id) => markDone.mutate(id)}
                  onDelete={(r) => setDeleteTarget(r)}
                  markDonePending={markDone.isPending}
                />
              ))}
            </CardContainer>
          )}

          {done.length > 0 && (
            <CardContainer overflow="hidden" padding={0} style={{ opacity: 0.6 }}>
              <div style={{ padding: "14px 22px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted-foreground)" }}>
                  Completed ({done.length})
                </div>
              </div>
              {done.map((r) => (
                <ReminderRow
                  key={r.id}
                  r={r}
                  done={true}
                  onDelete={(r) => setDeleteTarget(r)}
                />
              ))}
            </CardContainer>
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
              <Input placeholder="e.g. File VAT return Quarter 2" value={kind} onChange={(e) => setKind(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Due Date <span className="text-destructive">*</span></Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createReminder.isPending || !kind || !dueDate}>
              {createReminder.isPending ? "Saving…" : "Create Reminder"}
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
                if (deleteTarget) { await deleteReminder.mutateAsync(deleteTarget.id); setDeleteTarget(null); }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
