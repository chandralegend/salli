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
  currentCycle,
  highlightPlan,
  initialCycle,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentPlan: string;
  // The cycle the user is currently billed on, or null if free/unknown. Distinct
  // from initialCycle, which is only what the toggle opens on.
  currentCycle: BillingCycle | null;
  highlightPlan?: string;
  // Required rather than defaulted to "month": a merge once dropped this prop at
  // the only call site, silently billing annual sign-ups monthly. Required makes
  // that a compile error instead of a wrong charge.
  initialCycle: BillingCycle;
}) {
  const plans = usePlans();
  const checkout = useCheckout();
  const queryClient = useQueryClient();
  // Track the user's toggle as an override rather than seeding state from
  // initialCycle: this component stays mounted while the subscription query is
  // still loading, so a useState seed would freeze on the "month" fallback and
  // never pick up the real cycle once it arrives.
  const [cycleOverride, setCycleOverride] = useState<BillingCycle | null>(null);
  const cycle = cycleOverride ?? initialCycle;

  async function upgrade(planKey: string) {
    try {
      const data = await checkout.mutateAsync({ plan: planKey, cycle });
      await openPaddleCheckout(data as Parameters<typeof openPaddleCheckout>[0], () => {
        // Checkout finished — refresh plan + usage so Settings reflects it immediately.
        queryClient.invalidateQueries({ queryKey: ["billing"] });
        toast.success("Subscription updated");
      });
      onOpenChange(false);
    } catch (err) {
      // Surface the real reason. apiFetch has already run the response body
      // through messageFrom, and openPaddleCheckout throws plain Errors with
      // operator-actionable text ("Billing not configured", "No price for this
      // plan"), so err.message is the useful line in both cases. The generic
      // fallback stays for genuinely unknown throws — it previously covered
      // everything, which told users to retry a failure that could never resolve.
      toast.error(
        err instanceof Error
          ? err.message
          : "Billing is temporarily unavailable — try again shortly.",
      );
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
              onClick={() => setCycleOverride("month")}
              className={`rounded-md px-3 py-1 font-medium transition ${
                cycle === "month" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setCycleOverride("year")}
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
              const isCurrentPlan = p.key === currentPlan;
              // Same plan on the other cycle is a real, purchasable change, so it
              // must not render as "Current plan" with no way to act on it.
              const isCycleSwitch = isCurrentPlan && currentCycle !== null && cycle !== currentCycle;
              const isCurrent = isCurrentPlan && !isCycleSwitch;
              const isHighlighted = p.key === highlightPlan;
              return (
                <div
                  key={p.key}
                  className={
                    "flex items-center gap-4 rounded-lg border p-4" +
                    (isHighlighted ? " border-primary ring-1 ring-primary" : "")
                  }
                >
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
                      {checkout.isPending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : isCycleSwitch ? (
                        cycle === "year" ? "Switch to annual" : "Switch to monthly"
                      ) : (
                        "Upgrade"
                      )}
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
