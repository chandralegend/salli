"use client";

import Link from "next/link";
import { Coins } from "lucide-react";

import type { CreditBalance as Balance } from "@/hooks/useBilling";
import { formatDate } from "@/lib/format";

/**
 * The credit balance, split into what resets and what does not.
 *
 * Showing one merged number would be simpler and worse: the two halves behave
 * differently at month end, and a user who has paid for credits needs to see
 * that those survive the reset. The bar tracks the allowance only, because that
 * is the part with a denominator — purchased credits have no "out of".
 */
export function CreditBalance({
  balance,
  planName,
  byok,
}: {
  balance: Balance;
  planName: string;
  byok: boolean;
}) {
  const { allowance_remaining, allowance_total, purchased_remaining, total, resets_at } = balance;
  const pct = allowance_total > 0 ? Math.min(100, (allowance_remaining / allowance_total) * 100) : 0;
  const low = pct <= 20;
  const empty = total <= 0;

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <Coins className="size-4 self-center text-muted-foreground" />
          <span className="text-2xl font-semibold tabular-nums">{total.toLocaleString()}</span>
          <span className="text-sm text-muted-foreground">credits left</span>
        </div>
        {!empty && low && !byok && (
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-600 dark:text-amber-400">
            Running low
          </span>
        )}
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${low ? "bg-amber-500" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <dl className="space-y-1.5 text-xs">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">
            Monthly allowance{resets_at ? ` · resets ${formatDate(resets_at)}` : ""}
          </dt>
          <dd className="tabular-nums">
            {allowance_remaining.toLocaleString()} / {allowance_total.toLocaleString()}
          </dd>
        </div>
        {purchased_remaining > 0 && (
          <div className="flex justify-between">
            {/* Stated explicitly because it is the reassurance someone wants
                before buying a second pack. */}
            <dt className="text-muted-foreground">Purchased · never expires</dt>
            <dd className="tabular-nums">{purchased_remaining.toLocaleString()}</dd>
          </div>
        )}
      </dl>

      {byok ? (
        <p className="text-xs text-muted-foreground">
          You&rsquo;re on your own API key, so this is a safety ceiling rather than an allowance.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Your allowance resets each month on the {planName} plan. Purchased credits carry over and
          are only used once the allowance runs out.
        </p>
      )}

      {empty && (
        <Link
          href="/settings?upgrade=1"
          className="inline-block text-xs font-medium text-primary hover:underline"
        >
          Out of credits — top up or upgrade →
        </Link>
      )}
    </div>
  );
}
