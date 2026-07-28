"use client";

/**
 * "Can I afford this?" — the pre-purchase decision surface.
 *
 * Two figures carry equal weight on purpose. The months-of-freedom delay is the
 * headline, but for a healthy saver a large purchase often costs only a month or
 * two, while the emergency-fund effect is the genuinely alarming number (8.0 → 5.75
 * months against a 6-month target, or negative outright). Leading on the delay
 * alone would underwhelm exactly the users who can most afford to buy.
 *
 * Every figure comes from the deterministic engine via /fi/simulate-purchase.
 * Nothing here is computed client-side beyond choosing which value to show.
 */

import { useState } from "react";
import { Wallet, TriangleAlert, ArrowRight, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusChip } from "@/components/shared/StatusChip";
import { useSimulatePurchase, type PurchaseImpact, type PurchaseOption } from "@/hooks/useFi";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/** "1 month" / "9 months" / "1 yr 5 mo" — months are the unit users think in. */
function monthsLabel(months: number): string {
  if (months === 0) return "no delay";
  if (months < 12) return `${months} month${months === 1 ? "" : "s"}`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m === 0 ? `${y} yr${y === 1 ? "" : "s"}` : `${y} yr ${m} mo`;
}

function TERM_OPTIONS() {
  return [
    { label: "Cash", months: null },
    { label: "6 mo", months: 6 },
    { label: "12 mo", months: 12 },
    { label: "24 mo", months: 24 },
  ];
}

function OptionRow({
  option,
  currency,
  cheapest,
}: {
  option: PurchaseOption;
  currency: string;
  cheapest: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium">{option.label}</span>
          {cheapest && <StatusChip tone="success">cheapest</StatusChip>}
          {option.exceeds_monthly_surplus && (
            <StatusChip tone="danger">over your surplus</StatusChip>
          )}
        </div>
        <p className="money text-xs text-muted-foreground mt-1">
          {currency} {formatMoney(option.total_cost)}
          {Number(option.interest_cost) > 0 && (
            <> · {currency} {formatMoney(option.interest_cost)} interest</>
          )}
          {option.monthly_payment && (
            <> · {currency} {formatMoney(option.monthly_payment)}/mo</>
          )}
        </p>
      </div>
      <p className="money text-sm font-semibold whitespace-nowrap">
        {option.months_delay === null ? "—" : `+${monthsLabel(option.months_delay)}`}
      </p>
    </div>
  );
}

function Result({ impact }: { impact: PurchaseImpact }) {
  const { currency } = impact;

  // A stale balance sheet gets no verdict. A confident "yes" from a months-old
  // picture is worse than no answer — the user acts on it and cannot un-spend.
  if (impact.is_stale) {
    return (
      <div className="mt-4 rounded-md border border-dashed p-4">
        <div className="flex items-start gap-2.5">
          <TriangleAlert className="size-4 mt-0.5 text-muted-foreground shrink-0" />
          <div>
            <p className="text-[13px] font-medium">Your ledger is out of date</p>
            <p className="text-xs text-muted-foreground mt-1">
              {impact.data_as_of
                ? `The newest entry is from ${formatDate(impact.data_as_of)}.`
                : "There are no entries yet."}{" "}
              Bring it up to date and ask again — advice from an old balance sheet
              would be worse than none.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const headline = impact.options.find((o) => o.key === impact.cheapest_option_key) ?? impact.options[0];
  const efAfter = Number(impact.emergency_months_after_cash);
  const efTarget = impact.emergency_fund_target_months;
  const efBreached = efAfter < efTarget;

  return (
    <div className="mt-4">
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Months of freedom */}
        <div>
          <p className="eyebrow">Costs you</p>
          {headline?.months_delay === null ? (
            <>
              <p className="money text-3xl font-semibold mt-1.5">Not yet knowable</p>
              <p className="text-xs text-muted-foreground mt-2">
                Your Freedom date isn&rsquo;t reachable on current figures, so this
                purchase can&rsquo;t be costed in months yet — it isn&rsquo;t free.
              </p>
            </>
          ) : (
            <>
              <p className="money text-3xl font-semibold mt-1.5">
                {monthsLabel(headline?.months_delay ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                of freedom, paying the cheapest way
              </p>
            </>
          )}
        </div>

        {/* Emergency fund — deliberately equal billing */}
        <div>
          <p className="eyebrow">Emergency fund</p>
          <p
            className={cn(
              "money text-3xl font-semibold mt-1.5",
              efBreached && "text-destructive",
            )}
          >
            {efAfter.toFixed(1)} mo
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            from {Number(impact.emergency_months_before).toFixed(1)} mo · target {efTarget} mo
          </p>
        </div>
      </div>

      {(efBreached || !impact.payable_from_liquid) && (
        <div className="mt-4 flex items-start gap-2.5 rounded-md border border-destructive/30 bg-destructive/5 p-3">
          <ShieldAlert className="size-4 mt-0.5 text-destructive shrink-0" />
          <p className="text-xs">
            {!impact.payable_from_liquid
              ? "This is more than your liquid savings — paying cash would leave you short."
              : `Paying cash drops your buffer below the ${efTarget}-month target.`}
          </p>
        </div>
      )}

      <div className="mt-4 pt-3 border-t divide-y">
        {impact.options.map((o) => (
          <OptionRow
            key={o.key}
            option={o}
            currency={currency}
            cheapest={o.key === impact.cheapest_option_key && impact.options.length > 1}
          />
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground mt-3">
        Deterministic engine · as of {impact.data_as_of ? formatDate(impact.data_as_of) : "today"} ·
        information, not formal financial advice
      </p>
    </div>
  );
}

export function AffordabilityCard({ id }: { id?: string }) {
  const [amount, setAmount] = useState("");
  const [term, setTerm] = useState<number | null>(null);
  const sim = useSimulatePurchase();

  const clean = amount.replace(/,/g, "").trim();
  const valid = clean !== "" && Number(clean) > 0 && Number.isFinite(Number(clean));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    sim.mutate({
      amount: clean,
      term_months: term,
      // 18% is the common Sri Lankan card-instalment rate; only applied when a
      // term is chosen. Sent as a fraction, never a percentage.
      annual_interest_rate: term ? "0.18" : "0",
    });
  }

  return (
    <div id={id} className="rounded-lg border bg-card p-5">
      <div className="flex items-start justify-between">
        <p className="eyebrow">Can I afford this?</p>
        <Wallet className="size-4 text-muted-foreground" />
      </div>

      <form onSubmit={submit} className="mt-4 flex flex-wrap items-center gap-2">
        <Input
          inputMode="decimal"
          placeholder="Purchase amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="money w-[168px]"
          aria-label="Purchase amount"
        />
        <div className="flex items-center gap-1" role="group" aria-label="How you would pay">
          {TERM_OPTIONS().map((t) => (
            <Button
              key={t.label}
              type="button"
              size="sm"
              variant={term === t.months ? "secondary" : "ghost"}
              onClick={() => setTerm(t.months)}
            >
              {t.label}
            </Button>
          ))}
        </div>
        <Button type="submit" size="sm" disabled={!valid || sim.isPending}>
          {sim.isPending ? "Working…" : "Ask Salli"}
          {!sim.isPending && <ArrowRight className="size-3.5" />}
        </Button>
      </form>

      {!sim.data && !sim.isPending && !sim.isError && (
        <p className="text-xs text-muted-foreground mt-3">
          Salli prices it against what you own, owe and will owe in tax — and tells
          you what it costs your Freedom date.
        </p>
      )}

      {sim.isPending && (
        <div className="mt-4 space-y-3">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
      )}

      {sim.isError && (
        <p className="text-xs text-destructive mt-3">
          Couldn&rsquo;t price that purchase. Check the amount and try again.
        </p>
      )}

      {sim.data && <Result impact={sim.data} />}
    </div>
  );
}
