"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useFireSurplus } from "@/hooks/useFi";
import { useTags } from "@/hooks/useTags";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

/** The seeded `need` axis, in the order the 50/30/20 rule is usually stated. */
const NEED_ORDER = ["essential", "discretionary", "savings"] as const;

const NEED_META: Record<string, { label: string; bar: string; text: string }> = {
  essential: { label: "Needs", bar: "bg-[#2E7D6B]", text: "text-[#2E7D6B]" },
  discretionary: { label: "Wants", bar: "bg-[#C77D3A]", text: "text-[#C77D3A]" },
  savings: { label: "Savings & Debt", bar: "bg-[#3A5FC7]", text: "text-[#3A5FC7]" },
};

/**
 * Where the money goes, along both tag axes.
 *
 * Onboarding seeds a single personal expense account, so grouping by account
 * gave every new user a one-bar breakdown. Tags give the detail without anyone
 * having to build a chart of accounts first — and untagged spending still
 * appears, grouped under its account name, so nothing goes missing.
 */
export function SpendingBreakdown() {
  const surplus = useFireSurplus();
  // The server groups by tag *slug*, so "bank-charge" would render raw. Map
  // back to the tag's display name; anything unmatched is already a display
  // name (untagged spending falls back to its account name).
  const categoryTags = useTags("category");

  if (surplus.isLoading) return <Skeleton className="h-56" />;
  if (!surplus.data) return null;

  const nameFor = (slug: string) =>
    (categoryTags.data ?? []).find((t) => t.slug === slug)?.name ?? slug;

  const categories = Object.entries(surplus.data.expense_by_category ?? {})
    .map(([slug, amount]) => ({ label: nameFor(slug), amount: Number(amount) }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const needs = NEED_ORDER.map((slug) => ({
    slug,
    amount: Number(surplus.data?.expense_by_need?.[slug] ?? 0),
  })).filter((n) => n.amount > 0);

  const needTotal = needs.reduce((s, n) => s + n.amount, 0);
  const categoryTotal = categories.reduce((s, c) => s + c.amount, 0);

  return (
    <div className="rounded-lg border bg-card p-5">
      <h2 className="text-[15px] font-semibold">Where it goes</h2>
      <p className="mt-0.5 text-[12px] text-muted-foreground">
        Monthly average over the last year — what you spent it on, and how necessary it was. Tag
        spending from any transaction to fill this in.
      </p>

      {categories.length === 0 ? (
        <p className="mt-3 text-[13px] text-muted-foreground">
          No spending in the last year yet. Once you have some, it&rsquo;ll break down here.
        </p>
      ) : (
        <>
          {needs.length > 0 ? (
            <div className="mt-4">
              <div className="flex h-2.5 overflow-hidden rounded-full">
                {needs.map((n) => (
                  <div
                    key={n.slug}
                    className={NEED_META[n.slug].bar}
                    style={{ flex: n.amount / needTotal }}
                  />
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {needs.map((n) => (
                  <span key={n.slug} className="flex items-center gap-1.5 text-[12px]">
                    <span className={cn("size-2 rounded-full", NEED_META[n.slug].bar)} />
                    <span className="text-muted-foreground">{NEED_META[n.slug].label}</span>
                    <span className={cn("font-semibold", NEED_META[n.slug].text)}>
                      {Math.round((n.amount / needTotal) * 100)}%
                    </span>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-3 rounded-md bg-muted/50 px-3 py-2.5 text-[12px] text-muted-foreground">
              Tag a few expenses as Needs, Wants or Savings to see how your spending splits.
            </p>
          )}

          <div className="mt-5 space-y-2.5">
            {categories.map((c) => (
              <div key={c.label}>
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <span className="truncate text-[13px] text-muted-foreground">{c.label}</span>
                  <span className="money text-[13px] font-semibold">
                    LKR {formatMoney(String(c.amount), 0)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.max(2, (c.amount / categoryTotal) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
