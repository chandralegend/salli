import { Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

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
 * Slice colours, brand-first then stepping away from it.
 *
 * Ordered so the largest category — categories are sorted by amount — always
 * lands on the accent. A random or purely decorative order would put the
 * loudest colour on an arbitrary slice.
 */
const SLICE_COLORS = ["#F15A32", "#2E7D6B", "#3A5FC7", "#C77D3A", "#7B4B8A", "#8A8785", "#4B463D"];

/**
 * Where the money went, as a donut.
 *
 * The list this replaces gave each category a name, an amount and a 1.5px bar
 * — six near-identical rows in which the one thing you actually want, the
 * relative size of each slice, had to be read off six separate bars. A donut
 * states it in one shape.
 *
 * Arc maths matches the allocation donut on the Strategy tab rather than
 * inventing a second technique: a 1.2 degree gap between slices so adjacent
 * segments stay distinguishable without a stroke.
 */
function SpendDonut({
  slices,
  size = 168,
}: {
  slices: { label: string; amount: number }[];
  size?: number;
}) {
  const total = slices.reduce((s, x) => s + x.amount, 0);
  if (total <= 0) return null;
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2;
  const rIn = R - 30;
  const pt = (r: number, deg: number): [number, number] => {
    const t = (deg * Math.PI) / 180;
    return [cx + r * Math.sin(t), cy - r * Math.cos(t)];
  };
  const gap = 1.2;
  let cursor = 0;
  return (
    <Svg width={size} height={size}>
      {slices.map((sl, i) => {
        const frac = sl.amount / total;
        const start = cursor + gap;
        const end = cursor + frac * 360 - gap;
        cursor += frac * 360;
        if (end <= start) return null;
        const [ox0, oy0] = pt(R, start);
        const [ox1, oy1] = pt(R, end);
        const [ix1, iy1] = pt(rIn, end);
        const [ix0, iy0] = pt(rIn, start);
        const large = end - start > 180 ? 1 : 0;
        return (
          <Path
            key={sl.label}
            d={`M ${ox0} ${oy0} A ${R} ${R} 0 ${large} 1 ${ox1} ${oy1} L ${ix1} ${iy1} A ${rIn} ${rIn} 0 ${large} 0 ${ix0} ${iy0} Z`}
            fill={SLICE_COLORS[i % SLICE_COLORS.length]}
          />
        );
      })}
    </Svg>
  );
}

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
          <View className="h-[11px] flex-row overflow-hidden rounded-pill border border-foreground">
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

      {/* by category — the donut carries the proportions, the legend carries
          the names and figures. Splitting them that way means neither has to
          do both badly: the shape answers "what dominates" at a glance and the
          legend answers "how much exactly". */}
      <View className="mt-4 flex-row items-center gap-4">
        <SpendDonut slices={categories} />
        <View className="min-w-0 flex-1 gap-2">
          {categories.map((c, i) => (
            <View key={c.label} className="flex-row items-center gap-2">
              <View
                className="h-3 w-3 shrink-0 rounded-[3px] border border-foreground"
                style={{ backgroundColor: SLICE_COLORS[i % SLICE_COLORS.length] }}
              />
              <Text numberOfLines={1} className="min-w-0 flex-1 text-[14px] text-foreground">
                {c.label}
              </Text>
              <Text className="shrink-0 font-sans-bold text-[14px] text-foreground">
                {Math.round((c.amount / categoryTotal) * 100)}%
              </Text>
            </View>
          ))}
        </View>
      </View>
      {/* Amounts under the legend rather than in it: at legend width the name,
          the figure and the share together truncated the names to nothing. */}
      <Text className="mt-3 text-[13.5px] leading-5 text-muted-foreground">
        {categories
          .slice(0, 3)
          .map((c) => `${c.label} Rs. ${formatLKRAbbrev(c.amount)}`)
          .join(" · ")}
        {categories.length > 3 ? ` · +${categories.length - 3} more` : ""}
      </Text>
    </Card>
  );
}
