import {
  ArrowUpRight,
  Info,
  Plus,
  Search,
  Trash2,
  TriangleAlert,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { Card } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { ChipSelect } from "@/components/ui/filter-chip";
import { PageShell } from "@/components/ui/page-shell";
import { ActionButton } from "@/components/ui/action-button";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Tabs } from "@/components/ui/tabs";
import { TextField } from "@/components/ui/text-field";
import {
  type AllocationSlice,
  type Holding,
  useAddHolding,
  useDeleteHolding,
  useHoldings,
  usePortfolioSummary,
  useUpdateHolding,
} from "@/hooks/usePortfolio";
import { confirmDestructive } from "@/lib/confirm";
import { formatLKR, formatLKRAbbrev, formatPct } from "@/lib/format";
import { useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

const TABS = ["Holdings", "Allocation"] as const;

/** Distinct-but-on-brand colours for allocation slices (shared by donut, legend,
 * per-holding accent bars, and asset-class cards so everything reads as one). */
const SLICE_COLORS = ["#16130f", "#b7b1a5", "#4b463d", "#e4e0d6", "#6b6459", "#2c2822", "#8c877c"];

/** Asset classes the backend accepts (free-form string); these mirror the
 * mockup's New Holding chips. Stored lowercase. */
const ASSET_CLASSES = ["equity", "commodity", "bond", "cash", "property"] as const;

const titleCase = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** Donut of allocation slices with tappable annular sectors (same technique as
 * financial-independence.tsx). Each slice opens the asset-class detail drawer. */
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

export default function PortfolioScreen() {
  const colors = useThemeColors();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Holdings");
  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editHolding, setEditHolding] = useState<Holding | null>(null);

  const holdings = useHoldings();
  const summary = usePortfolioSummary();

  const allHoldings = holdings.data ?? [];
  const allocation = summary.data?.allocation ?? [];
  const totalValue = Number(summary.data?.total_value ?? 0);

  // Stable colour per asset class, keyed off the summary's allocation order so
  // the donut, legend, cards and per-holding bars all agree.
  const colorForClass = useMemo(() => {
    const map: Record<string, string> = {};
    allocation.forEach((a, i) => {
      map[a.asset_class] = SLICE_COLORS[i % SLICE_COLORS.length];
    });
    return map;
  }, [allocation]);

  const visible = allHoldings.filter(
    (h) =>
      !search ||
      h.name.toLowerCase().includes(search.toLowerCase()) ||
      h.symbol.toLowerCase().includes(search.toLowerCase()),
  );

  const grouped = visible.reduce<Record<string, Holding[]>>((acc, h) => {
    (acc[h.asset_class] ??= []).push(h);
    return acc;
  }, {});

  // #holdings per asset class (from the full, unfiltered list).
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

  return (
    <View className="flex-1">
      <PageShell
        animateOn={tab}
        header={
          <ScreenHeader
            title="Portfolio"
            back
            trailing={
              <View className="flex-row items-center gap-2">
                <View className="rounded-pill border border-foreground/[0.08] bg-card px-3 py-1.5">
                  <Text className="text-[14px] text-foreground/40">Manual values only</Text>
                </View>
                <Pressable
                  onPress={() => setAddOpen(true)}
                  className="h-11 w-11 items-center justify-center rounded-full bg-salli-accent"
                >
                  <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
                </Pressable>
              </View>
            }
          />
        }
      >
        {empty ? (
          <View className="items-center gap-2 px-8 pt-16">
            <Text className="text-center font-sans-semibold text-[17px] text-foreground">No holdings yet</Text>
            <Text className="text-center text-[15px] text-foreground/35">
              Add your first holding to track value, cost and allocation.
            </Text>
            <ActionButton className="mt-3" variant="accent" onPress={() => setAddOpen(true)}>
              <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
              <Text className="font-sans-semibold text-[16px] text-white">New Holding</Text>
            </ActionButton>
          </View>
        ) : (
          <>
            <View className="px-4 pt-3">
            {/* Navy hero — total value + cost/gain */}
            <Card className="bg-salli-hero p-[18px]">
              <Text className="mb-2 text-[14px] font-sans-medium uppercase tracking-wide text-white/50">
                Total Portfolio Value
              </Text>
              <View className="mb-1.5 flex-row items-baseline gap-1">
                <Text className="font-sans-semibold text-[22px] text-white/40">Rs.</Text>
                <Text className="font-sans-extrabold text-[44px] tracking-tighter text-white">
                  {summary.data ? formatLKRAbbrev(summary.data.total_value) : "—"}
                </Text>
              </View>
              <View className="flex-row items-center gap-2.5">
                <Text className="text-[14px] text-white/30">
                  {tab === "Allocation"
                    ? `${allocation.length} asset ${allocation.length === 1 ? "class" : "classes"}`
                    : `Cost Rs. ${summary.data ? formatLKRAbbrev(summary.data.total_cost_basis) : "—"}`}
                </Text>
                {summary.data ? (
                  <View
                    className={cn(
                      "flex-row items-center gap-1 rounded-pill border px-2.5 py-1",
                      Number(summary.data.total_gain) >= 0
                        ? "border-salli-accent/30 bg-salli-accent/15"
                        : "border-destructive/30 bg-destructive/15",
                    )}
                  >
                    {Number(summary.data.total_gain) >= 0 ? (
                      <ArrowUpRight size={9} color={colors.accent} strokeWidth={2.5} />
                    ) : null}
                    <Text
                      className={cn(
                        "text-[14px] font-sans-semibold",
                        Number(summary.data.total_gain) >= 0 ? "text-salli-accent" : "text-destructive",
                      )}
                    >
                      {tab === "Allocation"
                        ? `${formatPct(summary.data.total_gain_pct, 1)} overall`
                        : `${Number(summary.data.total_gain) >= 0 ? "+" : "-"}Rs. ${formatLKRAbbrev(summary.data.total_gain)} (${formatPct(summary.data.total_gain_pct, 1)})`}
                    </Text>
                  </View>
                ) : null}
              </View>
            </Card>
            </View>

            {/* Tabs */}
            <Tabs className="mt-3" items={TABS} value={tab} onChange={setTab} />

            <View className="px-4">
            {tab === "Holdings" ? (
              <>
                <View className="mt-2.5 flex-row gap-2">
                  <View className="h-[38px] flex-1 flex-row items-center gap-2 rounded-card border border-foreground/[0.08] bg-card px-3">
                    <Search size={15} color={colors.mutedForeground} strokeWidth={2} />
                    <TextInput
                      value={search}
                      onChangeText={setSearch}
                      placeholder="Search..."
                      placeholderTextColor="rgba(128,128,128,0.4)"
                      className="flex-1 text-[15px] text-foreground"
                    />
                  </View>
                </View>

                <View className="mt-3 gap-3">
                  {Object.entries(grouped).map(([assetClass, items]) => (
                    <View key={assetClass}>
                      <Text className="mb-1.5 pl-0.5 text-[14px] font-sans-semibold uppercase tracking-wide text-foreground/30">
                        {titleCase(assetClass)}
                      </Text>
                      <View className="gap-1.5">
                        {items.map((h) => {
                          const gain = Number(h.current_value) - Number(h.cost_basis);
                          const pct = totalValue > 0 ? Number(h.current_value) / totalValue : 0;
                          const color = colorForClass[h.asset_class] ?? SLICE_COLORS[0];
                          return (
                            <Pressable key={h.id} onPress={() => setEditHolding(h)}>
                              <Card className="flex-row items-center gap-2.5 p-3">
                                <View className="h-[42px] w-[3px] rounded-pill" style={{ backgroundColor: color }} />
                                <View
                                  className="h-[38px] w-[38px] items-center justify-center rounded-card"
                                  style={{ backgroundColor: `${color}1F`, borderWidth: 0.5, borderColor: `${color}33` }}
                                >
                                  <Text className="font-sans-bold text-[13px]" style={{ color }}>
                                    {h.symbol.slice(0, 4).toUpperCase()}
                                  </Text>
                                </View>
                                <View className="flex-1">
                                  <Text className="font-sans-semibold text-[15px] text-foreground">{h.name}</Text>
                                  <Text className="text-[14px] text-foreground/30">{formatPct(pct, 0)} of portfolio</Text>
                                </View>
                                <View className="items-end">
                                  <Text className="font-sans-semibold text-[15px] text-foreground">
                                    Rs. {formatLKRAbbrev(h.current_value)}
                                  </Text>
                                  <Text className={cn("text-[14px]", gain >= 0 ? "text-foreground/50" : "text-destructive")}>
                                    {gain >= 0 ? "+" : "-"}Rs. {formatLKRAbbrev(gain)}
                                  </Text>
                                </View>
                              </Card>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                  {visible.length === 0 ? (
                    <Text className="pt-6 text-center text-[15px] text-foreground/35">No holdings match “{search}”.</Text>
                  ) : null}
                </View>
              </>
            ) : (
              <>
                {/* Donut hero — tappable slices open the asset-class drawer */}
                <Card className="mt-3 p-4">
                  <Text className="text-[14px] font-sans-semibold uppercase tracking-wide text-foreground/30">
                    Allocation by asset class
                  </Text>
                  <View className="my-3 h-[168px] w-[168px] items-center justify-center self-center">
                    <AllocationDonut
                      slices={allocation.map((a) => ({
                        frac: Number(a.pct_of_portfolio),
                        color: colorForClass[a.asset_class] ?? SLICE_COLORS[0],
                      }))}
                      onSelect={setSelectedClass}
                    />
                    <View pointerEvents="none" style={{ position: "absolute", alignItems: "center" }}>
                      <Text className="font-sans-extrabold text-[20px] leading-6 text-foreground">
                        {summary.data ? `Rs. ${formatLKRAbbrev(summary.data.total_value)}` : "—"}
                      </Text>
                      <Text className="text-[13px] text-foreground/35">total value</Text>
                    </View>
                  </View>
                  <Text className="mb-3 text-center text-[14px] text-foreground/30">Tap a slice for asset-class detail</Text>
                  <View className="flex-row flex-wrap justify-center gap-x-4 gap-y-1.5">
                    {allocation.map((a) => (
                      <View key={a.asset_class} className="flex-row items-center gap-1.5">
                        <View
                          style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: colorForClass[a.asset_class] }}
                        />
                        <Text className="text-[14px] font-sans-medium text-foreground/50">
                          {titleCase(a.asset_class)} {formatPct(a.pct_of_portfolio, 0)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </Card>

                {/* By asset class — value, share, progress */}
                <Text className="mb-2 mt-3.5 pl-0.5 text-[14px] font-sans-semibold uppercase tracking-wide text-foreground/30">
                  By Asset Class
                </Text>
                <View className="gap-2">
                  {allocation.map((a, i) => {
                    const color = colorForClass[a.asset_class] ?? SLICE_COLORS[0];
                    const count = countByClass[a.asset_class] ?? 0;
                    return (
                      <Pressable key={a.asset_class} onPress={() => setSelectedClass(i)}>
                        <Card className="p-3.5">
                          <View className="mb-2 flex-row items-center justify-between">
                            <View className="flex-1 flex-row items-center gap-2">
                              <View
                                className="h-8 w-8 items-center justify-center rounded-card"
                                style={{ backgroundColor: `${color}1F`, borderWidth: 0.5, borderColor: `${color}33` }}
                              >
                                <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: color }} />
                              </View>
                              <View>
                                <Text className="font-sans-semibold text-[15px] text-foreground">{titleCase(a.asset_class)}</Text>
                                <Text className="text-[14px] text-foreground/30">
                                  {count} {count === 1 ? "holding" : "holdings"}
                                </Text>
                              </View>
                            </View>
                            <View className="items-end">
                              <Text className="font-sans-bold text-[16px] text-foreground">
                                Rs. {formatLKRAbbrev(a.current_value)}
                              </Text>
                              <Text className="font-sans-semibold text-[14px]" style={{ color }}>
                                {formatPct(a.pct_of_portfolio, 0)}
                              </Text>
                            </View>
                          </View>
                          <View className="h-1.5 overflow-hidden rounded-pill bg-foreground/[0.06]">
                            <View
                              className="h-full rounded-pill"
                              style={{
                                width: `${Math.min(100, Number(a.pct_of_portfolio) * 100)}%`,
                                backgroundColor: color,
                              }}
                            />
                          </View>
                        </Card>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Concentration note — only when one class dominates */}
                {concentrated ? (
                  <View className="mt-3 flex-row items-start gap-2 rounded-card border border-salli-accent/20 bg-salli-accent/[0.08] px-3.5 py-2.5">
                    <TriangleAlert size={16} color={colors.accent} strokeWidth={2} style={{ marginTop: 1 }} />
                    <Text className="flex-1 text-[14px] leading-5 text-foreground/55">
                      <Text className="font-sans-semibold text-salli-accent">
                        {formatPct(concentrated.pct_of_portfolio, 0)} in {titleCase(concentrated.asset_class).toLowerCase()}
                      </Text>{" "}
                      — a single asset class is a large share of this portfolio.
                    </Text>
                  </View>
                ) : null}

                {/* Disclaimer */}
                <View className="mt-2.5 flex-row items-start gap-2 rounded-card border border-foreground/[0.06] bg-foreground/[0.04] px-3.5 py-2.5">
                  <Info size={15} color={colors.mutedForeground} strokeWidth={2} style={{ marginTop: 1 }} />
                  <Text className="flex-1 text-[14px] leading-5 text-foreground/30">
                    Values are manually entered · no live market feed
                  </Text>
                </View>
              </>
            )}
            </View>
          </>
        )}
      </PageShell>

      {!empty ? (
        <Pressable
          onPress={() => setAddOpen(true)}
          className="absolute bottom-28 right-5 h-12 w-12 items-center justify-center rounded-full"
          style={{
            backgroundColor: colors.accent,
            shadowColor: colors.accent,
            shadowOpacity: 0.4,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 4 },
            elevation: 6,
          }}
        >
          <Plus size={22} color="#FFFFFF" strokeWidth={2.5} />
        </Pressable>
      ) : null}

      {/* Asset-class detail drawer */}
      <Drawer
        visible={selectedClass !== null}
        onClose={() => setSelectedClass(null)}
        title={selectedClass !== null && allocation[selectedClass] ? titleCase(allocation[selectedClass].asset_class) : undefined}
        keyboardAvoiding={false}
      >
        {selectedClass !== null && allocation[selectedClass]
              ? (() => {
                  const a = allocation[selectedClass];
                  const color = colorForClass[a.asset_class] ?? SLICE_COLORS[0];
                  const items = allHoldings.filter((h) => h.asset_class === a.asset_class);
                  const cost = items.reduce((s, h) => s + Number(h.cost_basis), 0);
                  const gain = Number(a.current_value) - cost;
                  return (
                    <>
                      <View className="mb-3 flex-row gap-2">
                        <View className="flex-1 rounded-card border border-foreground/[0.08] bg-card p-3">
                          <Text className="mb-1 text-[13px] font-sans-medium uppercase tracking-wide text-foreground/35">Value</Text>
                          <Text className="font-sans-extrabold text-[22px] leading-6 text-foreground">
                            Rs. {formatLKRAbbrev(a.current_value)}
                          </Text>
                        </View>
                        <View className="flex-1 rounded-card border border-foreground/[0.08] bg-card p-3">
                          <Text className="mb-1 text-[13px] font-sans-medium uppercase tracking-wide text-foreground/35">Share</Text>
                          <Text className="font-sans-extrabold text-[22px] leading-6" style={{ color }}>
                            {formatPct(a.pct_of_portfolio, 1)}
                          </Text>
                        </View>
                      </View>
                      <View className="mb-3 flex-row items-center justify-between rounded-card border border-foreground/[0.08] bg-card px-3.5 py-2.5">
                        <Text className="text-[15px] text-foreground/50">Unrealized gain</Text>
                        <Text className={cn("font-sans-bold text-[15px]", gain >= 0 ? "text-salli-accent" : "text-destructive")}>
                          {gain >= 0 ? "+" : "-"}Rs. {formatLKRAbbrev(gain)}
                          {cost > 0 ? ` · ${formatPct(gain / cost, 1)}` : ""}
                        </Text>
                      </View>
                      <Text className="mb-1.5 text-[13px] font-sans-medium uppercase tracking-wide text-foreground/35">
                        {items.length} {items.length === 1 ? "holding" : "holdings"}
                      </Text>
                      <View className="gap-1.5">
                        {items.map((h) => {
                          const hGain = Number(h.current_value) - Number(h.cost_basis);
                          return (
                            <View key={h.id} className="flex-row items-center justify-between rounded-card bg-card px-3 py-2.5">
                              <View>
                                <Text className="font-sans-semibold text-[15px] text-foreground">{h.name}</Text>
                                <Text className="text-[14px] text-foreground/30">{h.symbol.toUpperCase()}</Text>
                              </View>
                              <View className="items-end">
                                <Text className="font-sans-semibold text-[15px] text-foreground">Rs. {formatLKRAbbrev(h.current_value)}</Text>
                                <Text className={cn("text-[14px]", hGain >= 0 ? "text-foreground/50" : "text-destructive")}>
                                  {hGain >= 0 ? "+" : "-"}Rs. {formatLKRAbbrev(hGain)}
                                </Text>
                              </View>
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
        {isEdit ? "Save Changes" : "Add Holding"}
      </ActionButton>
      {isEdit ? (
        <Pressable
          onPress={confirmDelete}
          disabled={busy}
          className="mt-2.5 h-12 flex-row items-center justify-center gap-2 rounded-pill border border-destructive/25 bg-destructive/[0.08]"
        >
          <Trash2 size={17} color="#EF4444" strokeWidth={2} />
          <Text className="font-sans-semibold text-[16px] text-destructive">
            {deleteHolding.isPending ? "Deleting…" : "Delete Holding"}
          </Text>
        </Pressable>
      ) : null}
      {isError ? (
        <Text className="mt-2 text-center text-[14px] text-destructive">Could not save holding. Please try again.</Text>
      ) : null}
    </>
  );

  return (
    <Drawer visible={visible} onClose={onClose} title={isEdit ? "Edit Holding" : "New Holding"} footer={footer}>
              {/* symbol + name */}
              <View className="mb-2.5 flex-row gap-2">
                <TextField
                  className="w-[120px]"
                  label="Symbol *"
                  value={symbol}
                  onChangeText={setSymbol}
                  autoCapitalize="characters"
                  placeholder="COMB"
                />
                <TextField className="flex-1" label="Name *" value={name} onChangeText={setName} placeholder="Commercial Bank" />
              </View>

              {/* asset class chips */}
              <Text className="mb-2 pl-0.5 text-[13px] font-sans-medium uppercase tracking-wide text-foreground/40">Asset Class *</Text>
              <ChipSelect
                className="mb-3"
                options={ASSET_CLASSES}
                value={assetClass}
                onChange={setAssetClass}
                capitalize
              />

              {/* cost + current value */}
              <View className="mb-3 flex-row gap-2">
                <TextField
                  className="flex-1"
                  label="Cost Basis *"
                  value={cost}
                  onChangeText={setCost}
                  keyboardType="decimal-pad"
                  placeholder="0"
                />
                <TextField
                  className="flex-1"
                  label="Current Value *"
                  value={value}
                  onChangeText={setValue}
                  keyboardType="decimal-pad"
                  placeholder="0"
                />
              </View>

              {/* computed gain */}
              {cost && value ? (
                <View
                  className={cn(
                    "mb-4 flex-row items-center justify-between rounded-card border px-3.5 py-2.5",
                    gain >= 0 ? "border-salli-accent/20 bg-salli-accent/[0.08]" : "border-destructive/20 bg-destructive/[0.08]",
                  )}
                >
                  <Text className="text-[15px] text-foreground/50">Unrealized gain</Text>
                  <Text className={cn("font-sans-bold text-[16px]", gain >= 0 ? "text-salli-accent" : "text-destructive")}>
                    {gain >= 0 ? "+" : "-"}Rs. {formatLKR(Math.abs(gain), 0)} · {formatPct(gainPct, 1)}
                  </Text>
                </View>
              ) : null}
    </Drawer>
  );
}
