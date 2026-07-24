"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/shared/StatusChip";
import {
  usePlans,
  useCheckout,
  metricLabel,
  type Plan,
  type BillingCycle,
} from "@/hooks/useBilling";
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
  const queryClient = useQueryClient();
  const [cycle, setCycle] = useState<BillingCycle>("month");

  async function upgrade(planKey: string) {
    try {
      const data = await checkout.mutateAsync({ plan: planKey, cycle });
      await openPaddleCheckout(data as Parameters<typeof openPaddleCheckout>[0], () => {
        // Checkout finished — refresh plan + usage so Settings reflects it immediately.
        queryClient.invalidateQueries({ queryKey: ["billing"] });
        toast.success("Subscription updated");
      });
      onOpenChange(false);
    } catch {
      toast.error("Billing is temporarily unavailable — try again shortly.");
    }
  }

  function priceLabel(p: Plan): string {
    if (!p.paid) return "";
    return cycle === "year"
      ? `— $${p.yearly_price_usd} / year`
      : `— $${p.monthly_price_usd} / month`;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Change plan</DialogTitle>
          <DialogDescription>Prorated via Paddle. Cancel anytime.</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center">
          <div className="inline-flex rounded-lg border p-0.5 text-[13px]">
            <button
              type="button"
              onClick={() => setCycle("month")}
              className={`rounded-md px-3 py-1 font-medium transition ${
                cycle === "month" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setCycle("year")}
              className={`rounded-md px-3 py-1 font-medium transition ${
                cycle === "year" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              Annual
            </button>
          </div>
        </div>
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
                        {priceLabel(p)}
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
