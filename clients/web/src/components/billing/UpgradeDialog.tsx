"use client";

import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/shared/StatusChip";
import { usePlans, useCheckout, metricLabel, type Plan } from "@/hooks/useBilling";
import { openPaddleCheckout } from "@/lib/paddle";

function planSummary(p: Plan): string {
  const bits = Object.entries(p.limits)
    .slice(0, 3)
    .map(([k, v]) => `${v} ${metricLabel(k).toLowerCase()}`);
  return bits.join(" · ") || p.description;
}

export function UpgradeDialog({
  open,
  onOpenChange,
  currentPlan,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentPlan: string;
}) {
  const plans = usePlans();
  const checkout = useCheckout();

  async function upgrade(planKey: string) {
    try {
      const data = await checkout.mutateAsync(planKey);
      await openPaddleCheckout(data as Parameters<typeof openPaddleCheckout>[0]);
      onOpenChange(false);
    } catch {
      toast.error("Billing is temporarily unavailable — try again shortly.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Change plan</DialogTitle>
          <DialogDescription>Prorated via Paddle. Cancel anytime.</DialogDescription>
        </DialogHeader>
        {plans.isLoading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {(plans.data ?? []).map((p) => {
              const isCurrent = p.key === currentPlan;
              return (
                <div key={p.key} className="flex items-center gap-4 rounded-lg border p-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold">
                      {p.name}
                      <span className="text-[13px] font-normal text-muted-foreground">
                        {" "}
                        — ${p.monthly_price_usd} {p.paid ? "/ month" : ""}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{planSummary(p)}</p>
                  </div>
                  {isCurrent ? (
                    <StatusChip tone="neutral">Current plan</StatusChip>
                  ) : p.paid ? (
                    <Button size="sm" onClick={() => upgrade(p.key)} disabled={checkout.isPending}>
                      {checkout.isPending ? <Loader2 className="size-3.5 animate-spin" /> : "Upgrade"}
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Downgrade via portal</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
