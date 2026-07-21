"use client";

import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatementFlow } from "./StatementFlow";

/** The dashboard's upload button runs the exact same flow, in a dialog. */
export function StatementUploadDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload statement</DialogTitle>
          <DialogDescription>Parse a bank statement and post approved rows to your ledger.</DialogDescription>
        </DialogHeader>
        {open && (
          <StatementFlow
            onViewLedger={() => {
              onOpenChange(false);
              router.push("/ledger");
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
