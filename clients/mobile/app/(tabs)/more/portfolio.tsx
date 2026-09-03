import { Plus, Trash2 } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { ActionButton } from "@/components/ui/action-button";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { Hero, Rule, Said, SectionLabel, Strong } from "@/components/ui/blocks";
import { Card } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { ChipSelect } from "@/components/ui/filter-chip";
import { PageShell } from "@/components/ui/page-shell";
import { ScreenHeader } from "@/components/ui/screen-header";
import { TextField } from "@/components/ui/text-field";
import {
  type Holding,
  useAddHolding,
  useDeleteHolding,
  useHoldings,
  usePortfolioSummary,
  useUpdateHolding,
} from "@/hooks/usePortfolio";
import { chartColor } from "@/lib/chartColors";
import { confirmDestructive } from "@/lib/confirm";
import { formatLKR, formatLKRAbbrev, formatPct } from "@/lib/format";
import { useHardShadow, useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** Asset classes the backend accepts (free-form string); these mirror the
 * mockup's New Holding chips. Stored lowercase. */
const ASSET_CLASSES = ["equity", "commodity", "bond", "cash", "property"] as const;

const titleCase = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Donut of allocation slices with tappable annular sectors.
 *
 * Stays local to this screen rather than joining blocks.tsx because its slices
 * are pressable — the other two donuts in the app are read-only, and merging
 * them would mean giving them a press target they have nothing to open.
 */
function AllocationDonut({
  slices,
  onSelect,
}: {
  slices: { frac: number; color: string }[];
  onSelect: (i: number) => void;
}) {
  const size = 168;
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2;
  const rIn = R - 30;
  const pt = (r: number, deg: number): [number, number] => {
    const t = (deg * Math.PI) / 180;
    return [cx + r * Math.sin(t), cy - r * Math.cos(t)];
  };
  const gap = 1.4; // degrees between slices
  let d0 = 0;
  return (
    <Svg width={size} height={size}>
      {slices.map((s, i) => {
        const frac = Math.max(0, Math.min(1, s.frac));
        const start = d0 + gap;
        const end = d0 + frac * 360 - gap;
        d0 += frac * 360;
        if (end <= start) return null;
        const [ox0, oy0] = pt(R, start);
        const [ox1, oy1] = pt(R, end);
        const [ix1, iy1] = pt(rIn, end);
        const [ix0, iy0] = pt(rIn, start);
        const large = end - start > 180 ? 1 : 0;
        const dPath = `M ${ox0} ${oy0} A ${R} ${R} 0 ${large} 1 ${ox1} ${oy1} L ${ix1} ${iy1} A ${rIn} ${rIn} 0 ${large} 0 ${ix0} ${iy0} Z`;
        return <Path key={i} d={dPath} fill={s.color} onPress={() => onSelect(i)} />;
      })}
    </Svg>
  );
}

/**
 * Portfolio, in one scroll.
 *
 * Not in the mockup, so it takes Tax's and Debt's grammar: a sentence, then
 * rules separating labelled blocks.
 *
 * It was two tabs, Holdings and Allocation, sharing one dark hero whose caption
 * changed depending on which tab you were on — so the same figure meant two
 * things. Allocation then said each asset class twice: once as a donut with a
 * legend, and again directly underneath as a card per class with the same value
 * and share. The legend rows carry the value now and are tappable, which is
 * what the cards were for.
 */
export default function PortfolioScreen() {
  const colors = useThemeColors();
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editHolding, setEditHolding] = useState<Holding | null>(null);

  const holdings = useHoldings();
  const summary = usePortfolioSummary();

  const allHoldings = holdings.data ?? [];
  const allocation = summary.data?.allocation ?? [];
  const totalValue = Number(summary.data?.total_value ?? 0);
  const totalCost = Number(summary.data?.total_cost_basis ?? 0);
  const totalGain = Number(summary.data?.total_gain ?? 0);

  // Stable colour per asset class, keyed off the summary's allocation order so
  // the donut, legend and per-holding swatches all agree. Uses the shared chart
  // palette — this screen was the last holdout on a warm grey-brown ramp that
  // rendered as seven near-identical browns, none of them the brand accent.
  const colorForClass = useMemo(() => {
    const map: Record<string, string> = {};
    allocation.forEach((a, i) => {
      map[a.asset_class] = chartColor(i);
    });
    return map;
  }, [allocation]);

  // Largest first: the ordering question a holdings list is actually asked.
  const byValue = useMemo(
    () => [...allHoldings].sort((a, b) => Number(b.current_value) - Number(a.current_value)),
    [allHoldings],
  );

  // #holdings per asset class.
  const countByClass = allHoldings.reduce<Record<string, number>>((acc, h) => {
    acc[h.asset_class] = (acc[h.asset_class] ?? 0) + 1;
    return acc;
  }, {});

  // Concentration: the largest single asset class, surfaced only when it
  // dominates (>50%). Honest, derived from real allocation — no advice engine.
  const topSlice = [...allocation].sort(
    (a, b) => Number(b.pct_of_portfolio) - Number(a.pct_of_portfolio),
  )[0];
  const concentrated = topSlice && Number(topSlice.pct_of_portfolio) > 0.5 ? topSlice : null;

  const empty = allHoldings.length === 0;
  const up = totalGain >= 0;

  return (
    <View className="flex-1">
      <PageShell
        header={
          <ScreenHeader
            title="Portfolio"
            back
            trailing={
              <AnimatedPressable
                onPress={() => setAddOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Add a holding"
                className="h-11 w-11 items-center justify-center rounded-[11px] border-2 border-foreground bg-card"
              >
                <Plus size={21} color={colors.accent} strokeWidth={2.4} />
              </AnimatedPressable>
            }
          />
        }
      >
        {empty ? (
          <View className="px-5 pt-2">
            <Hero>You haven&rsquo;t added any holdings.</Hero>
            <Text className="mt-2 text-[16px] leading-[23px] text-muted-foreground">
              Add what you own — shares, gold, a fixed deposit — and we will track its value, cost
              and allocation. Values are entered by you; there is no live market feed.
            </Text>
            <ActionButton className="mt-5" onPress={() => setAddOpen(true)}>
              Add a holding
            </ActionButton>
          </View>
        ) : (
          <View>
            <View className="px-5">
              <Hero>
                Your holdings are worth <Strong>Rs. {formatLKRAbbrev(totalValue)}</Strong>.
              </Hero>
              <Text className="mt-2 text-[16px] leading-[23px] text-muted-foreground">
                <Text className={up ? "font-sans-semibold text-salli-accent" : "font-sans-semibold text-destructive"}>
                  {up ? "Up" : "Down"} Rs. {formatLKRAbbrev(Math.abs(totalGain))} (
                  {formatPct(Math.abs(Number(summary.data?.total_gain_pct ?? 0)), 1)})
                </Text>{" "}
                on Rs. {formatLKRAbbrev(totalCost)} invested.
              </Text>
            </View>

            {allocation.length > 0 ? (
              <>
                <Rule />
                <SectionLabel>Allocation</SectionLabel>
                {/* Donut carries the proportions, the legend carries the names
                    and figures — neither has to do both badly. Both the slices
                    and the legend rows open the asset-class detail. */}
                <View className="mt-3.5 flex-row items-center gap-4 px-5">
                  <AllocationDonut
                    slices={allocation.map((a) => ({
                      frac: Number(a.pct_of_portfolio),
                      color: colorForClass[a.asset_class] ?? chartColor(0),
                    }))}
                    onSelect={setSelectedClass}
                  />
                  <View className="min-w-0 flex-1 gap-2.5">
                    {allocation.map((a, i) => {
                      const count = countByClass[a.asset_class] ?? 0;
                      return (
                        <Pressable
                          key={a.asset_class}
                          onPress={() => setSelectedClass(i)}
                          hitSlop={4}
                          accessibilityRole="button"
                          accessibilityLabel={`${titleCase(a.asset_class)} detail`}
                        >
                          <View className="flex-row items-center gap-2">
                            <View
                              className="h-3 w-3 shrink-0 rounded-[3px] border border-foreground"
                              style={{ backgroundColor: colorForClass[a.asset_class] }}
                            />
                            <Text
                              numberOfLines={1}
                              className="min-w-0 flex-1 text-[14px] text-foreground"
                            >
                              {titleCase(a.asset_class)}
                            </Text>
                            <Text className="shrink-0 font-sans-bold text-[14px] text-foreground">
                              {formatPct(a.pct_of_portfolio, 0)}
                            </Text>
                          </View>
                          <Text className="ml-5 text-[13px] text-muted-foreground">
                            Rs. {formatLKRAbbrev(a.current_value)} · {count}{" "}
                            {count === 1 ? "holding" : "holdings"}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </>
            ) : null}

            <Rule />

            <SectionLabel>Holdings</SectionLabel>
            {/* Flat and largest-first. It used to be grouped under a heading per
                asset class, which restated the allocation block directly above
                it; the swatch says which class a row belongs to. */}
            <View className="mt-3 gap-[9px] px-5">
              {byValue.map((h) => {
                const gain = Number(h.current_value) - Number(h.cost_basis);
                const color = colorForClass[h.asset_class] ?? chartColor(0);
                return (
                  <AnimatedPressable
                    key={h.id}
                    onPress={() => setEditHolding(h)}
                    press="sink"
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${h.name}`}
                    className="flex-row items-center gap-[11px] rounded-card border-2 border-foreground bg-card px-3.5 py-3"
                  >
                    <View
                      className="h-3.5 w-3.5 shrink-0 rounded-[4px] border border-foreground"
                      style={{ backgroundColor: color }}
                    />
                    <View className="min-w-0 flex-1">
                      <Text numberOfLines={1} className="font-sans-bold text-[16px] text-foreground">
                        {h.name}
                      </Text>
                      <Text className="mt-0.5 font-mono text-[12px] uppercase text-muted-foreground">
                        {h.symbol}
                      </Text>
                    </View>
                    <View className="shrink-0 items-end">
                      <Text className="font-sans-extrabold text-[15px] text-foreground">
                        {formatLKRAbbrev(h.current_value)}
                      </Text>
                      <Text
                        className={cn(
                          "mt-0.5 text-[13px]",
                          gain >= 0 ? "text-muted-foreground" : "text-destructive",
                        )}
                      >
                        {gain >= 0 ? "+" : "−"}
                        {formatLKRAbbrev(Math.abs(gain))}
                      </Text>
                    </View>
                  </AnimatedPressable>
                );
              })}
            </View>

            {concentrated ? (
              <>
                <Rule />
                <View className="px-5">
                  <Said>
                    <Strong className="text-salli-accent">
                      {formatPct(concentrated.pct_of_portfolio, 0)} of this sits in{" "}
                      {titleCase(concentrated.asset_class).toLowerCase()}
                    </Strong>
                    .
                  </Said>
                  <Text className="mt-1.5 text-[15px] leading-[21px] text-muted-foreground">
                    One asset class carrying more than half the portfolio moves it on its own.
                  </Text>
                </View>
              </>
            ) : null}

            <Rule />
            <View className="px-5">
              <Text className="text-[13.5px] leading-5 text-muted-foreground">
                Values are the ones you entered. There is no live market feed.
              </Text>
            </View>
            <View className="h-7" />
          </View>
        )}
      </PageShell>

      {/* Asset-class detail drawer */}
      <Drawer
        visible={selectedClass !== null}
        onClose={() => setSelectedClass(null)}
        title={
          selectedClass !== null && allocation[selectedClass]
            ? titleCase(allocation[selectedClass].asset_class)
            : undefined
        }
        keyboardAvoiding={false}
      >
        {selectedClass !== null && allocation[selectedClass]
          ? (() => {
              const a = allocation[selectedClass];
              const color = colorForClass[a.asset_class] ?? chartColor(0);
              const items = allHoldings.filter((h) => h.asset_class === a.asset_class);
              const cost = items.reduce((s, h) => s + Number(h.cost_basis), 0);
              const gain = Number(a.current_value) - cost;
              return (
                <>
                  <Text className="text-[20px] leading-[26px] tracking-tight text-foreground">
                    <Text className="font-sans-extrabold">Rs. {formatLKRAbbrev(a.current_value)}</Text>{" "}
                    — <Text className="font-sans-extrabold" style={{ color }}>
                      {formatPct(a.pct_of_portfolio, 1)}
                    </Text>{" "}
                    of the portfolio.
                  </Text>
                  <Text
                    className={cn(
                      "mt-1.5 text-[15px] leading-[21px]",
                      gain >= 0 ? "text-muted-foreground" : "text-destructive",
                    )}
                  >
                    {gain >= 0 ? "Up" : "Down"} Rs. {formatLKRAbbrev(Math.abs(gain))}
                    {cost > 0 ? ` (${formatPct(Math.abs(gain / cost), 1)})` : ""} on Rs.{" "}
                    {formatLKRAbbrev(cost)} invested.
                  </Text>

                  <View className="my-4 h-px bg-foreground/15" />

                  <Text className="mb-2.5 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                    {items.length} {items.length === 1 ? "holding" : "holdings"}
                  </Text>
                  <View className="gap-2.5">
                    {items.map((h) => {
                      const hGain = Number(h.current_value) - Number(h.cost_basis);
                      return (
                        <View key={h.id} className="flex-row items-baseline justify-between gap-3">
                          <Text numberOfLines={1} className="min-w-0 flex-1 text-[16px] text-foreground">
                            {h.name}
                          </Text>
                          <Text className="shrink-0 font-sans-extrabold text-[16px] text-foreground">
                            Rs. {formatLKRAbbrev(h.current_value)}
                          </Text>
                          <Text
                            className={cn(
                              "w-[74px] shrink-0 text-right text-[13px]",
                              hGain >= 0 ? "text-muted-foreground" : "text-destructive",
                            )}
                          >
                            {hGain >= 0 ? "+" : "−"}
                            {formatLKRAbbrev(Math.abs(hGain))}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </>
              );
            })()
          : null}
      </Drawer>

      <HoldingDrawer visible={addOpen} onClose={() => setAddOpen(false)} />
      <HoldingDrawer
        visible={editHolding !== null}
        holding={editHolding}
        onClose={() => setEditHolding(null)}
      />
    </View>
  );
}

/** Holding bottom-sheet — adds a new manually-declared holding (POST /portfolio)
 * or, when a `holding` is passed, edits it (PATCH /portfolio/{id}) and offers a
 * confirm-gated Delete. Only sends the fields the request types accept (symbol,
 * name, asset_class, cost_basis, current_value). */
function HoldingDrawer({
  visible,
  holding,
  onClose,
}: {
  visible: boolean;
  holding?: Holding | null;
  onClose: () => void;
}) {
  const addHolding = useAddHolding();
  const updateHolding = useUpdateHolding();
  const deleteHolding = useDeleteHolding();
  const shadow = useHardShadow();

  const isEdit = Boolean(holding);

  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [assetClass, setAssetClass] = useState<(typeof ASSET_CLASSES)[number]>("equity");
  const [cost, setCost] = useState("");
  const [value, setValue] = useState("");

  // Prefill from the holding whenever an edit sheet opens (or clear for add).
  useEffect(() => {
    if (!visible) return;
    if (holding) {
      setSymbol(holding.symbol);
      setName(holding.name);
      setAssetClass(
        (ASSET_CLASSES as readonly string[]).includes(holding.asset_class)
          ? (holding.asset_class as (typeof ASSET_CLASSES)[number])
          : "equity",
      );
      setCost(String(holding.cost_basis));
      setValue(String(holding.current_value));
    } else {
      setSymbol("");
      setName("");
      setAssetClass("equity");
      setCost("");
      setValue("");
    }
  }, [visible, holding]);

  const costNum = Number(cost) || 0;
  const valueNum = Number(value) || 0;
  const gain = valueNum - costNum;
  const gainPct = costNum > 0 ? gain / costNum : 0;

  const busy = addHolding.isPending || updateHolding.isPending || deleteHolding.isPending;
  const isError = addHolding.isError || updateHolding.isError || deleteHolding.isError;

  const canSubmit = Boolean(symbol.trim() && name.trim() && cost && value) && !busy;

  const submit = () => {
    if (!canSubmit) return;
    if (holding) {
      updateHolding.mutate(
        {
          id: holding.id,
          patch: {
            symbol: symbol.trim().toUpperCase(),
            name: name.trim(),
            asset_class: assetClass,
            cost_basis: costNum,
            current_value: valueNum,
          },
        },
        { onSuccess: onClose },
      );
    } else {
      addHolding.mutate(
        {
          symbol: symbol.trim().toUpperCase(),
          name: name.trim(),
          asset_class: assetClass,
          cost_basis: costNum,
          current_value: valueNum,
        },
        { onSuccess: onClose },
      );
    }
  };

  const confirmDelete = () => {
    if (!holding) return;
    confirmDestructive({
      title: "Delete holding?",
      message: `${holding.name} (${holding.symbol.toUpperCase()}) will be permanently removed from your portfolio.`,
      onConfirm: () => deleteHolding.mutate(holding.id, { onSuccess: onClose }),
    });
  };

  const footer = (
    <>
      <ActionButton
        variant="accent"
        loading={addHolding.isPending || updateHolding.isPending}
        disabled={!canSubmit}
        onPress={submit}
      >
        {isEdit ? "Save changes" : "Add holding"}
      </ActionButton>
      {isEdit ? (
        <Pressable
          onPress={confirmDelete}
          disabled={busy}
          style={shadow}
          className="mt-2.5 h-12 flex-row items-center justify-center gap-2 rounded-card border-2 border-destructive bg-card"
        >
          <Trash2 size={17} color="#EF4444" strokeWidth={2} />
          <Text className="font-sans-bold text-[16px] text-destructive">
            {deleteHolding.isPending ? "Deleting…" : "Delete holding"}
          </Text>
        </Pressable>
      ) : null}
      {isError ? (
        <Text className="mt-2 text-center text-[14px] text-destructive">
          Could not save holding. Please try again.
        </Text>
      ) : null}
    </>
  );

  return (
    <Drawer visible={visible} onClose={onClose} title={isEdit ? "Edit holding" : "New holding"} footer={footer}>
      <View className="mb-2.5 flex-row gap-2">
        <TextField
          className="w-[120px]"
          label="Symbol *"
          value={symbol}
          onChangeText={setSymbol}
          autoCapitalize="characters"
          placeholder="COMB"
        />
        <TextField
          className="flex-1"
          label="Name *"
          value={name}
          onChangeText={setName}
          placeholder="Commercial Bank"
        />
      </View>

      <Text className="mb-2 pl-0.5 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
        Asset class *
      </Text>
      <ChipSelect
        className="mb-3"
        options={ASSET_CLASSES}
        value={assetClass}
        onChange={setAssetClass}
        capitalize
      />

      <View className="mb-3 flex-row gap-2">
        <TextField
          className="flex-1"
          label="Cost basis *"
          value={cost}
          onChangeText={setCost}
          keyboardType="decimal-pad"
          placeholder="0"
        />
        <TextField
          className="flex-1"
          label="Current value *"
          value={value}
          onChangeText={setValue}
          keyboardType="decimal-pad"
          placeholder="0"
        />
      </View>

      {cost && value ? (
        <View className="mb-4 flex-row items-center justify-between rounded-card border-2 border-foreground bg-card px-3.5 py-2.5">
          <Text className="text-[15px] text-muted-foreground">Unrealized gain</Text>
          <Text
            className={cn(
              "font-sans-bold text-[16px]",
              gain >= 0 ? "text-salli-accent" : "text-destructive",
            )}
          >
            {gain >= 0 ? "+" : "−"}Rs. {formatLKR(Math.abs(gain), 0)} · {formatPct(Math.abs(gainPct), 1)}
          </Text>
        </View>
      ) : null}
    </Drawer>
  );
}
