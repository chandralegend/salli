"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, Loader2 } from "lucide-react";
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
  usePlanChangePreview,
  useChangePlan,
  metricLabel,
  type Plan,
  type BillingCycle,
  type ChangeMode,
  type PlanChangePreview,
} from "@/hooks/useBilling";
import { openPaddleCheckout } from "@/lib/paddle";
import { ApiError } from "@/lib/api-fetch";
import { formatDate, formatMinor } from "@/lib/format";

function planSummary(p: Plan): string {
  const bits = Object.entries(p.limits)
    .slice(0, 3)
    .map(([k, v]) => `${v} ${metricLabel(k).toLowerCase()}`);
  return bits.join(" · ") || p.description;
}

// A quote older than this is re-fetched before we charge. /change recomputes proration
// server-side, so the amount taken is always right — the risk being avoided is having
// shown the user a number we then didn't charge.
const QUOTE_TTL_MS = 5 * 60_000;

// Module scope so the clock read stays out of the component: react-hooks/purity
// rejects Date.now() in anything defined during render, even an async click handler.
const quotedAt = () => Date.now();
const isStaleQuote = (at: number) => Date.now() - at > QUOTE_TTL_MS;

type PendingChange = {
  plan: Plan;
  cycle: BillingCycle;
  preview: PlanChangePreview;
  at: number;
};

// Mirrors the backend's reasons. Kept client-side too so a blocked subscription
// explains itself without first making the user click a button that will 409.
const BLOCKED_COPY: Record<string, string> = {
  past_due:
    "There's an unpaid invoice on your subscription. Settle it in the billing portal first.",
  paused:
    "Your subscription is paused. Resume it in the billing portal to change plans.",
  scheduled_change:
    "Your subscription is already scheduled to cancel. Manage that in the billing portal first.",
  unknown_status: "Manage this subscription in the billing portal.",
};

/** The confirmation copy. Branches on `result` because a credit behaves differently
 *  from a charge: nothing hits the card, and the money is not refunded. */
function confirmLines(pending: PendingChange, isDowngrade: boolean): string[] {
  const { preview, plan } = pending;
  const lines: string[] = [];

  if (preview.result === "credit" && preview.result_amount_minor > 0) {
    lines.push(
      `No charge today. ${formatMinor(preview.result_amount_minor, preview.currency)} will be ` +
        `added to your account credit and applied to future invoices — it is not refunded ` +
        `to your card.`,
    );
  } else if (preview.immediate_charge_minor > 0) {
    const credit =
      preview.credit_applied_minor > 0
        ? ` — includes ${formatMinor(preview.credit_applied_minor, preview.currency)} credit for your unused time`
        : "";
    lines.push(
      `Due today: ${formatMinor(preview.immediate_charge_minor, preview.currency)}${credit}.`,
    );
  } else {
    lines.push("No charge today.");
  }

  if (preview.recurring_amount_minor > 0) {
    const per = pending.cycle === "year" ? "year" : "month";
    const from = preview.next_billed_at
      ? ` starting ${formatDate(preview.next_billed_at)}`
      : "";
    lines.push(
      `Then ${formatMinor(preview.recurring_amount_minor, preview.recurring_currency)} / ${per}${from}.`,
    );
  }

  if (isDowngrade) {
    lines.push(`Your ${plan.name} limits apply immediately.`);
  }
  return lines;
}

export function UpgradeDialog({
  open,
  onOpenChange,
  currentPlan,
  currentCycle,
  changeMode,
  blockedReason,
  highlightPlan,
  initialCycle,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentPlan: string;
  // The cycle the user is currently billed on, or null if free/unknown. Distinct
  // from initialCycle, which is only what the toggle opens on.
  currentCycle: BillingCycle | null;
  // How a change must be routed. Server-owned; see Subscription.change_mode.
  changeMode: ChangeMode;
  blockedReason: string | null;
  highlightPlan?: string;
  // Required rather than defaulted to "month": a merge once dropped this prop at
  // the only call site, silently billing annual sign-ups monthly. Required makes
  // that a compile error instead of a wrong charge.
  initialCycle: BillingCycle;
}) {
  const plans = usePlans();
  const checkout = useCheckout();
  const previewChange = usePlanChangePreview();
  const changePlan = useChangePlan();
  const queryClient = useQueryClient();
  // Track the user's toggle as an override rather than seeding state from
  // initialCycle: this component stays mounted while the subscription query is
  // still loading, so a useState seed would freeze on the "month" fallback and
  // never pick up the real cycle once it arrives.
  const [cycleOverride, setCycleOverride] = useState<BillingCycle | null>(null);
  const cycle = cycleOverride ?? initialCycle;
  const [pending, setPending] = useState<PendingChange | null>(null);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const blockedMessage = blockedReason
    ? (BLOCKED_COPY[blockedReason] ?? BLOCKED_COPY.unknown_status)
    : "";

  /** Dismissing the dialog also drops any half-finished confirmation, so reopening
   *  lands on the plan list rather than a stale quote. */
  function closeAll(next: boolean) {
    if (!next) setPending(null);
    onOpenChange(next);
  }

  function reportError(err: unknown) {
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

  async function startCheckout(planKey: string) {
    const data = await checkout.mutateAsync({ plan: planKey, cycle });
    await openPaddleCheckout(
      data as Parameters<typeof openPaddleCheckout>[0],
      () => {
        // Checkout finished — refresh plan + usage so Settings reflects it immediately.
        queryClient.invalidateQueries({ queryKey: ["billing"] });
        toast.success("Subscription updated");
      },
    );
    onOpenChange(false);
  }

  async function choosePlan(plan: Plan) {
    setBusyPlan(plan.key);
    try {
      if (changeMode !== "in_place") {
        await startCheckout(plan.key);
        return;
      }
      // Resolve the preview *before* switching to the confirm step. Advancing first
      // and filling the amount in afterwards invites a click on a figure that isn't
      // final yet — and confirming charges a card with no Paddle overlay in front
      // of it.
      const preview = await previewChange.mutateAsync({
        plan: plan.key,
        cycle,
      });
      setPending({ plan, cycle, preview, at: quotedAt() });
    } catch (err) {
      // The server owns change_mode, but this client may be holding a stale copy —
      // a subscription that lapsed since the page loaded. Fall through to checkout
      // rather than dead-ending the user.
      if (err instanceof ApiError && err.code === "checkout_required") {
        try {
          await startCheckout(plan.key);
        } catch (checkoutErr) {
          reportError(checkoutErr);
        }
      } else {
        reportError(err);
      }
    } finally {
      setBusyPlan(null);
    }
  }

  async function confirmChange() {
    if (!pending) return;
    const { plan } = pending;
    setBusyPlan(plan.key);
    try {
      // Re-quote a stale preview rather than charging against a number the user saw
      // five minutes ago. The dialog stays open showing the fresh figures.
      if (isStaleQuote(pending.at)) {
        const preview = await previewChange.mutateAsync({
          plan: plan.key,
          cycle: pending.cycle,
        });
        setPending({ ...pending, preview, at: quotedAt() });
        return;
      }
      const updated = await changePlan.mutateAsync({
        plan: plan.key,
        cycle: pending.cycle,
      });
      // Seed the cache from the response so the card updates without waiting for a
      // refetch to race the webhook.
      queryClient.setQueryData(["billing", "subscription"], updated);
      toast.success(`Switched to ${plan.name}`);
      setPending(null);
      onOpenChange(false);
    } catch (err) {
      setPending(null);
      reportError(err);
    } finally {
      // Whatever happened, the server is now the authority — a rejection may mean
      // the subscription changed underneath us (cancelled in another tab).
      queryClient.invalidateQueries({ queryKey: ["billing"] });
      setBusyPlan(null);
    }
  }

  /** Moving to a cheaper tier. Drives the "limits apply immediately" warning — the new
   *  allowances take effect now, so a user already over them is blocked until reset. */
  function isDowngradeTo(p: Plan): boolean {
    const current = (plans.data ?? []).find((x) => x.key === currentPlan);
    return !!current && p.monthly_price_usd < current.monthly_price_usd;
  }

  function priceLabel(p: Plan): string {
    if (!p.paid) return "";
    return cycle === "year"
      ? `— $${p.yearly_price_usd} / year`
      : `— $${p.monthly_price_usd} / month`;
  }

  return (
    <Dialog open={open} onOpenChange={closeAll}>
      <DialogContent className="sm:max-w-lg">
        {/* Two steps in one dialog rather than a confirm modal stacked on this one.
            The confirmation isn't a separate decision — it's the second half of
            picking a plan — and layering a second scrim over the first reads as a
            glitch and buries the list the user was just reading. */}
        {pending ? (
          <>
            <DialogHeader>
              <DialogTitle>
                Switch to {pending.plan.name}
                {pending.cycle === "year" ? " (annual)" : " (monthly)"}
              </DialogTitle>
              <DialogDescription>
                Confirm the change to your subscription.
              </DialogDescription>
            </DialogHeader>
            {/* min-w-0 for the same grid reason as the plan list below. */}
            <div className="min-w-0 space-y-2 rounded-lg border bg-muted/40 p-4 text-[13px]">
              {confirmLines(pending, isDowngradeTo(pending.plan)).map(
                (line) => (
                  <p
                    key={line}
                    className="text-muted-foreground first:text-foreground"
                  >
                    {line}
                  </p>
                ),
              )}
            </div>
            {/* Wraps rather than overflows: "Confirm and pay LKR 12,345.00" is a
                wide label in a currency with long formatting. */}
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setPending(null)}
                disabled={changePlan.isPending}
              >
                <ChevronLeft className="size-4" />
                Back
              </Button>
              <Button onClick={confirmChange} disabled={changePlan.isPending}>
                {changePlan.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : pending.preview.immediate_charge_minor > 0 ? (
                  `Confirm and pay ${formatMinor(pending.preview.immediate_charge_minor, pending.preview.currency)}`
                ) : (
                  "Confirm change"
                )}
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Change plan</DialogTitle>
              <DialogDescription>
                {changeMode === "in_place"
                  ? "Changes are prorated — you'll see the exact amount before you confirm."
                  : changeMode === "blocked"
                    ? blockedMessage
                    : "Cancel anytime."}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center">
              <div className="inline-flex rounded-lg border p-0.5 text-[13px]">
                <button
                  type="button"
                  onClick={() => setCycleOverride("month")}
                  className={`rounded-md px-3 py-1 font-medium transition ${
                    cycle === "month"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setCycleOverride("year")}
                  className={`rounded-md px-3 py-1 font-medium transition ${
                    cycle === "year"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground"
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
              // min-w-0 is load-bearing: DialogContent is a grid, and a grid item
              // defaults to min-width:auto, so without this the list refuses to
              // shrink below the widest row's intrinsic width — long plan summaries
              // and a nowrap button push the whole dialog into horizontal overflow
              // and the `truncate` below never engages.
              <div className="min-w-0 space-y-3">
                {(plans.data ?? []).map((p) => {
                  const isCurrentPlan = p.key === currentPlan;
                  // Same plan on the other cycle is a real, purchasable change, so it
                  // must not render as "Current plan" with no way to act on it.
                  const isCycleSwitch =
                    isCurrentPlan &&
                    currentCycle !== null &&
                    cycle !== currentCycle;
                  const isCurrent = isCurrentPlan && !isCycleSwitch;
                  const isHighlighted = p.key === highlightPlan;
                  // Annual isn't offered for every plan; plans.py documents 0 as "no
                  // annual price". Showing the CTA anyway would 503 on an unset price ID.
                  const unavailableCycle =
                    cycle === "year" && p.paid && !p.yearly_price_usd;
                  const busy = busyPlan === p.key;
                  return (
                    <div
                      key={p.key}
                      className={
                        "flex items-center gap-4 rounded-lg border p-4" +
                        (isHighlighted
                          ? " border-primary ring-1 ring-primary"
                          : "")
                      }
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-semibold text-balance">
                          {p.name}
                          <span className="text-[13px] font-normal text-muted-foreground">
                            {" "}
                            {priceLabel(p)}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {planSummary(p)}
                        </p>
                      </div>
                      {/* shrink-0: the row shrinks by truncating the summary, never
                          by crushing the action. */}
                      <div className="shrink-0">
                        {isCurrent ? (
                          <StatusChip tone="neutral">Current plan</StatusChip>
                        ) : unavailableCycle ? (
                          <span className="text-xs text-muted-foreground">
                            No annual price
                          </span>
                        ) : p.paid ? (
                          <Button
                            size="sm"
                            onClick={() => choosePlan(p)}
                            disabled={
                              busyPlan !== null || changeMode === "blocked"
                            }
                            title={
                              changeMode === "blocked"
                                ? blockedMessage
                                : undefined
                            }
                          >
                            {busy ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : isCycleSwitch ? (
                              cycle === "year" ? (
                                "Switch to annual"
                              ) : (
                                "Switch to monthly"
                              )
                            ) : changeMode === "in_place" ? (
                              // Pro→Starter is a legitimate in-place change, so the label
                              // can't assume the move is upward.
                              `Switch to ${p.name}`
                            ) : (
                              "Upgrade"
                            )}
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Downgrade via portal
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
