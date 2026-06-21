"use client";

import { useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePlans, useCheckout, type Plan } from "@/hooks/useBilling";
import { openPaddleCheckout } from "@/lib/paddle";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function PlanColumn({
  plan,
  current,
  onChoose,
  busy,
}: {
  plan: Plan;
  current: boolean;
  onChoose: (key: string) => void;
  busy: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border p-4 bg-card",
        current ? "border-primary ring-1 ring-primary/30" : "border-border",
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-semibold">{plan.name}</h3>
        {current && (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
            Current
          </span>
        )}
      </div>
      <p className="font-ledger text-[20px] mt-1">
        {plan.monthly_price_usd === 0 ? (
          "Free"
        ) : (
          <>
            <span className="text-[0.6em] text-muted-foreground mr-0.5 align-baseline">$</span>
            {plan.monthly_price_usd}
            <span className="text-[11px] text-muted-foreground font-sans"> /mo</span>
          </>
        )}
      </p>
      <p className="text-[11px] text-muted-foreground mt-1 mb-3">{plan.description}</p>
      <ul className="space-y-1.5 flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-1.5 text-[12px] text-foreground/80">
            <Check className="size-3 text-primary shrink-0 mt-0.5" />
            {f}
          </li>
        ))}
      </ul>
      {plan.paid && !current && (
        <Button
          size="sm"
          className="mt-4 w-full"
          disabled={busy}
          onClick={() => onChoose(plan.key)}
        >
          {busy && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
          Upgrade to {plan.name}
        </Button>
      )}
      {current && (
        <Button size="sm" variant="outline" className="mt-4 w-full" disabled>
          Your plan
        </Button>
      )}
    </div>
  );
}

export function UpgradeDialog({
  currentPlan,
  open,
  onOpenChange,
}: {
  currentPlan: string;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}) {
  const { data: plans } = usePlans();
  const checkout = useCheckout();
  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function choose(planKey: string) {
    setBusyKey(planKey);
    try {
      const data = await checkout.mutateAsync(planKey);
      await openPaddleCheckout(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Checkout unavailable";
      toast.error(
        msg.includes("503") || msg.toLowerCase().includes("not configured")
          ? "Billing isn't configured yet. Add Paddle keys to enable checkout."
          : `Couldn't start checkout: ${msg}`,
      );
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[15px]">
            <Sparkles className="size-4 text-primary" />
            Choose your plan
          </DialogTitle>
          <DialogDescription>
            Upgrade for a larger monthly allowance of AI messages and statement uploads.
            Billing is handled securely by Paddle; cancel anytime.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1">
          {(plans ?? []).map((p) => (
            <PlanColumn
              key={p.key}
              plan={p}
              current={p.key === currentPlan}
              onChoose={choose}
              busy={busyKey === p.key}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
