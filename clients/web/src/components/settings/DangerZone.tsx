"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Download, Loader2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { useDeleteAccount, useExportData, useProfile } from "@/hooks/useAccountData";

/**
 * Irreversible account actions, kept apart from the everyday settings so they
 * can never be triggered by a stray click. Export downloads a JSON snapshot;
 * delete requires an explicit dialog confirm before it wipes everything.
 */
export function DangerZone({ onDeleted }: { onDeleted: () => void | Promise<void> }) {
  const profile = useProfile();
  const exportData = useExportData();
  const deleteAccount = useDeleteAccount();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const email = profile.data?.email ?? null;

  async function handleExport() {
    try {
      const data = await exportData.mutateAsync();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "salli-export.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Your data was exported");
    } catch {
      toast.error("Could not export your data — try again shortly.");
    }
  }

  async function handleDelete() {
    if (!email) return;
    try {
      await deleteAccount.mutateAsync(email);
      setConfirmOpen(false);
      await onDeleted();
    } catch {
      toast.error("Could not delete your account — try again shortly.");
    }
  }

  return (
    <div className="rounded-lg border border-destructive/30 bg-card p-5 lg:col-span-2">
      <h2 className="text-[15px] font-semibold text-destructive">Danger zone</h2>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Export a full copy of your data, or permanently delete your account.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <Button variant="outline" onClick={handleExport} disabled={exportData.isPending}>
          {exportData.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          Export my data
        </Button>

        <Button
          variant="destructive"
          onClick={() => setConfirmOpen(true)}
          disabled={profile.isLoading || !email}
        >
          <AlertTriangle className="size-4" />
          Delete my account
        </Button>
      </div>

      {!profile.isLoading && !email && (
        <p className="mt-2 text-xs text-muted-foreground">
          We couldn&apos;t confirm your account email, so deletion is unavailable here.
        </p>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete my account?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes all data for{" "}
              <span className="font-medium text-foreground">{email}</span>, including your accounts,
              entries, and reports. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAccount.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
              disabled={deleteAccount.isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteAccount.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Delete forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
