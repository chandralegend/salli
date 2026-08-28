"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { useCreditCheckout, type CreditPack } from "@/hooks/useBilling";
import { openPaddleCheckout } from "@/lib/paddle";

/**
 * One-time credit packs.
 *
 * Reuses the plan checkout's Paddle.js overlay — the server returns the same
 * shape for both — so there is one purchase path to keep working rather than
 * two. Prices are shown as guidance only; Paddle charges whatever the price id
 * is actually configured at, and its overlay is the thing the user agrees to.
 */
const PACKS: { pack: CreditPack; credits: number; blurb: string }[] = [
  { pack: "10k", credits: 10_000, blurb: "About 330 Sonnet conversations" },
  { pack: "25k", credits: 25_000, blurb: "About 830 Sonnet conversations" },
  { pack: "60k", credits: 60_000, blurb: "About 2,000 Sonnet conversations" },
];

export function TopUpCard() {
  const checkout = useCreditCheckout();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<CreditPack | null>(null);

  async function buy(pack: CreditPack) {
    setBusy(pack);
    try {
      const data = await checkout.mutateAsync({ pack });
      await openPaddleCheckout(data, () => {
        // The grant lands via webhook, which may arrive after the overlay
        // closes — so refetch rather than assume, and say so plainly instead of
        // claiming credits have already been added.
        qc.invalidateQueries({ queryKey: ["billing"] });
        toast.success("Payment received — your credits will appear shortly.");
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't start checkout.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-lg border bg-card p-5">
      <h2 className="mb-1 text-[15px] font-semibold">Top up</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        A one-off purchase, not a subscription. Purchased credits never expire and are used only
        after your monthly allowance runs out.
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        {PACKS.map(({ pack, credits, blurb }) => (
          <button
            key={pack}
            onClick={() => buy(pack)}
            disabled={busy !== null}
            className="rounded-md border p-3 text-left transition-colors hover:border-primary/50 hover:bg-muted/40 disabled:opacity-60"
          >
            <div className="text-sm font-semibold tabular-nums">
              {credits.toLocaleString()} credits
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">{blurb}</div>
            <div className="mt-2 text-xs font-medium text-primary">
              {busy === pack ? "Opening…" : "Buy"}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
