import { Text, View } from "react-native";

import { Card } from "@/components/ui/card";
import { InfoButton } from "@/components/ui/info-button";
import type { FiSurplus } from "@/hooks/useFi";
import { useTags } from "@/hooks/useTags";
import { formatLKRAbbrev } from "@/lib/format";
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
export function SpendingBreakdown({ surplus }: { surplus: FiSurplus | undefined }) {
  // The server groups by tag *slug*, so "bank-charge" would render raw. Map
  // back to the tag's display name; anything unmatched is already a display
  // name (untagged spending falls back to its account name).
  const categoryTags = useTags("category");

  if (!surplus) return null;

  const nameFor = (slug: string) =>
    (categoryTags.data ?? []).find((t) => t.slug === slug)?.name ?? slug;

  const categories = Object.entries(surplus.expense_by_category ?? {})
    .map(([slug, amount]) => ({ label: nameFor(slug), amount: Number(amount) }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const needs = NEED_ORDER.map((slug) => ({
    slug,
    amount: Number(surplus.expense_by_need?.[slug] ?? 0),
  })).filter((n) => n.amount > 0);

  const needTotal = needs.reduce((s, n) => s + n.amount, 0);
  const categoryTotal = categories.reduce((s, c) => s + c.amount, 0);

  if (categories.length === 0) {
    return (
      <Card className="p-4">
        <Text className="font-sans-semibold text-[16px] text-foreground">Where it goes</Text>
        <Text className="mt-1 text-[15px] leading-5 text-muted-foreground">
          No spending in the last year yet. Once you have some, it&rsquo;ll break down here.
        </Text>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <View className="flex-row items-center gap-2">
        <Text className="font-sans-semibold text-[16px] text-foreground">Where it goes</Text>
        <InfoButton
          title="Where it goes"
          description={
            "Your average monthly spending over the last year, split two ways.\n\n" +
            "The first split is what you spent it on. The second is how necessary it was — the 50/30/20 idea: needs, wants, and what you put away.\n\n" +
            "Tag your spending from any transaction to fill these in. Anything untagged still shows up, grouped under its account."
          }
        />
      </View>
      <Text className="mt-0.5 text-[14px] text-muted-foreground">Monthly average</Text>

      {/* needs vs wants */}
      {needs.length > 0 ? (
        <View className="mt-3.5">
          <View className="h-2.5 flex-row overflow-hidden rounded-pill">
            {needs.map((n) => (
              <View
                key={n.slug}
                className={NEED_META[n.slug].bar}
                style={{ flex: n.amount / needTotal }}
              />
            ))}
          </View>
          <View className="mt-2 flex-row flex-wrap gap-x-3.5 gap-y-1">
            {needs.map((n) => (
              <View key={n.slug} className="flex-row items-center gap-1.5">
                <View className={cn("h-2 w-2 rounded-full", NEED_META[n.slug].bar)} />
                <Text className="text-[14px] text-muted-foreground">{NEED_META[n.slug].label}</Text>
                <Text className={cn("text-[14px] font-sans-semibold", NEED_META[n.slug].text)}>
                  {Math.round((n.amount / needTotal) * 100)}%
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View className="mt-3 rounded-card bg-foreground/[0.04] px-3 py-2.5">
          <Text className="text-[14px] leading-5 text-muted-foreground">
            Tag a few expenses as Needs, Wants or Savings to see how your spending splits.
          </Text>
        </View>
      )}

      {/* by category */}
      <View className="mt-4 gap-2">
        {categories.map((c) => (
          <View key={c.label}>
            <View className="mb-1 flex-row items-baseline justify-between">
              <Text className="flex-1 text-[15px] text-foreground/60" numberOfLines={1}>
                {c.label}
              </Text>
              <Text className="font-sans-semibold text-[15px] text-foreground">
                Rs. {formatLKRAbbrev(c.amount)}
              </Text>
            </View>
            <View className="h-1.5 overflow-hidden rounded-pill bg-foreground/[0.06]">
              <View
                className="h-full rounded-pill bg-salli-accent"
                style={{ width: `${Math.max(2, (c.amount / categoryTotal) * 100)}%` }}
              />
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}
