import { ChevronRight, Info, Pencil, Plus, Search, Trash2, Zap } from "lucide-react-native";
import { useMemo, useRef, useState } from "react";
import { LayoutChangeEvent, PanResponder, Pressable, Text, TextInput, View } from "react-native";

import { Card } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { FilterChip } from "@/components/ui/filter-chip";
import { PageShell } from "@/components/ui/page-shell";
import { ActionButton } from "@/components/ui/action-button";
import { ScreenHeader } from "@/components/ui/screen-header";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Tabs } from "@/components/ui/tabs";
import { TextField } from "@/components/ui/text-field";
import { useAddDebt, useDebts, useDeleteDebt, usePayoffPlan, useUpdateDebt, type Debt } from "@/hooks/useDebt";
import { confirmDestructive } from "@/lib/confirm";
import { formatLKR, formatLKRAbbrev, formatPct } from "@/lib/format";
import { useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

const TABS = ["Overview", "Strategy", "Schedule"] as const;
const FILTERS = ["All", "Active", "Paid Off"] as const;
const MAX_EXTRA = 30000;
const EXTRA_STEP = 1000;

/** Derives a debt-free month label from "months from now". Honest: computed
 * from the plan's months_to_payoff, since the backend stores no payoff date. */
function debtFreeLabel(months: number | null | undefined): string {
  if (months == null) return "—";
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/** Tap/drag track standing in for a native slider (no slider package installed). */
function ExtraPaymentSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const widthRef = useRef(0);
  const colors = useThemeColors();

  const setFromX = (x: number) => {
    const w = widthRef.current;
    if (w <= 0) return;
    const ratio = Math.max(0, Math.min(1, x / w));
    const raw = ratio * MAX_EXTRA;
    onChange(Math.round(raw / EXTRA_STEP) * EXTRA_STEP);
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => setFromX(e.nativeEvent.locationX),
      onPanResponderMove: (e) => setFromX(e.nativeEvent.locationX),
    }),
  ).current;

  const pct = Math.max(0, Math.min(1, value / MAX_EXTRA)) * 100;

  return (
    <View>
      <View
        {...responder.panHandlers}
        onLayout={(e: LayoutChangeEvent) => (widthRef.current = e.nativeEvent.layout.width)}
        className="mx-1 my-2 justify-center"
        style={{ height: 20 }}
      >
        <View className="h-[5px] rounded-pill bg-white/10">
          <View className="h-full rounded-pill" style={{ width: `${pct}%`, backgroundColor: colors.accent }} />
        </View>
        <View
          className="absolute h-4 w-4 rounded-full bg-white"
          style={{
            left: `${pct}%`,
            marginLeft: -8,
            shadowColor: "#000",
            shadowOpacity: 0.4,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 },
            elevation: 3,
          }}
        />
      </View>
      <View className="flex-row justify-between px-1">
        <Text className="text-[13px] text-white/30">Rs. 0</Text>
        <Text className="text-[13px] text-white/30">Rs. {formatLKRAbbrev(MAX_EXTRA)}</Text>
      </View>
    </View>
  );
}

export default function DebtScreen() {
  const colors = useThemeColors();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [search, setSearch] = useState("");
  const [strategy, setStrategy] = useState<"avalanche" | "snowball">("avalanche");
  const [extra, setExtra] = useState(10000);
  const [showAllRows, setShowAllRows] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const debts = useDebts();

  const openAdd = () => {
    setEditingDebt(null);
    setDrawerOpen(true);
  };
  const openEdit = (debt: Debt) => {
    setEditingDebt(debt);
    setDrawerOpen(true);
  };
  const plan = usePayoffPlan(extra, strategy);
  // Baseline (no extra payment) — lets us show interest & months saved by paying extra.
  const basePlan = usePayoffPlan(0, strategy);

  const allDebts = debts.data ?? [];
  const totalOutstanding = allDebts.reduce((sum, d) => sum + Number(d.principal), 0);
  const totalMinPayment = allDebts.reduce((sum, d) => sum + Number(d.minimum_payment), 0);
  const interestSaved =
    basePlan.data && plan.data
      ? Math.max(0, Number(basePlan.data.total_interest_paid) - Number(plan.data.total_interest_paid))
      : null;
  const monthsSaved =
    basePlan.data?.months_to_payoff != null && plan.data?.months_to_payoff != null
      ? basePlan.data.months_to_payoff - plan.data.months_to_payoff
      : null;

  const visibleDebts = allDebts.filter((d) => {
    if (filter === "Active" && !d.is_active) return false;
    if (filter === "Paid Off" && d.is_active) return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Priority order for the chosen strategy: avalanche = highest APR first,
  // snowball = smallest balance first (mirrors the domain engine's ordering).
  const orderedDebts = useMemo(() => {
    const active = allDebts.filter((d) => d.is_active);
    return [...active].sort((a, b) =>
      strategy === "avalanche"
        ? Number(b.apr) - Number(a.apr)
        : Number(a.principal) - Number(b.principal),
    );
  }, [allDebts, strategy]);

  // Aggregate the per-debt-per-month schedule into one row per month.
  const monthlyRows = useMemo(() => {
    const map = new Map<number, { month: number; payment: number; interest: number; balance: number }>();
    for (const e of plan.data?.schedule ?? []) {
      const cur = map.get(e.month) ?? { month: e.month, payment: 0, interest: 0, balance: 0 };
      cur.payment += Number(e.payment);
      cur.interest += Number(e.interest_paid);
      cur.balance += Number(e.remaining_balance);
      map.set(e.month, cur);
    }
    return [...map.values()].sort((a, b) => a.month - b.month);
  }, [plan.data]);

  const strategyLabel = strategy.charAt(0).toUpperCase() + strategy.slice(1);
  const totalMonths = plan.data?.months_to_payoff ?? null;
  const visibleRows = showAllRows ? monthlyRows : monthlyRows.slice(0, 12);

  return (
    <View className="flex-1">
      <PageShell
        animateOn={tab}
        header={
          <>
            <ScreenHeader
              title="Debt"
              back
              trailing={
                <Pressable onPress={openAdd} className="h-11 w-11 items-center justify-center rounded-full border-2 border-foreground bg-salli-accent">
                  <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
                </Pressable>
              }
            />

            <Tabs className="mt-3" items={TABS} value={tab} onChange={setTab} />
          </>
        }
      >

        {allDebts.length === 0 ? (
          <View className="items-center gap-2 px-8 pt-16">
            <Text className="text-center font-sans-semibold text-[17px] text-foreground">No debts tracked</Text>
            <Text className="text-center text-[15px] text-muted-foreground">
              Add a loan with the ＋ above to see a payoff plan here.
            </Text>
          </View>
        ) : tab === "Overview" ? (
          <View className="px-4 pt-3">
            <Card className="bg-salli-hero p-[18px]">
              <Text className="mb-2 text-[14px] font-sans-medium uppercase tracking-wide text-white/50">
                Total Outstanding
              </Text>
              <View className="mb-1 flex-row items-baseline gap-1">
                <Text className="font-sans-semibold text-[22px] text-white/40">Rs.</Text>
                <Text className="font-sans-extrabold text-[44px] tracking-tighter text-white">
                  {formatLKRAbbrev(totalOutstanding)}
                </Text>
              </View>
              <Text className="mb-3.5 text-[14px] text-white/30">
                {allDebts.length} active loan{allDebts.length === 1 ? "" : "s"} · {strategyLabel} strategy
              </Text>
              <View className="flex-row gap-1.5">
                <View className="flex-1 rounded-card bg-white/[0.06] p-2.5">
                  <Text className="mb-1 text-[13px] text-white/35">Monthly Min</Text>
                  <Text className="font-sans-bold text-[15px] text-white">Rs. {formatLKRAbbrev(totalMinPayment)}</Text>
                </View>
                <View className="flex-1 rounded-card bg-white/[0.06] p-2.5">
                  <Text className="mb-1 text-[13px] text-white/35">Payoff</Text>
                  <Text className="font-sans-bold text-[15px] text-white">{totalMonths ?? "—"} mo</Text>
                </View>
                <View className="flex-1 rounded-card bg-white/[0.06] p-2.5">
                  <Text className="mb-1 text-[13px] text-white/35">Interest Saved</Text>
                  <Text className="font-sans-bold text-[15px] text-salli-accent">
                    Rs. {interestSaved !== null ? formatLKRAbbrev(interestSaved) : "—"}
                  </Text>
                </View>
              </View>
            </Card>

            <View className="mt-3 flex-row items-center gap-2">
              <View className="h-[38px] flex-1 flex-row items-center gap-2 rounded-card border-2 border-foreground bg-card px-3">
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

            <View className="mt-2.5 flex-row gap-1.5">
              {FILTERS.map((f) => (
                <FilterChip key={f} label={f} active={filter === f} onPress={() => setFilter(f)} />
              ))}
            </View>

            <Text className="mb-2 mt-3 pl-0.5 text-[14px] font-sans-semibold uppercase tracking-wide text-muted-foreground">
              {filter === "Paid Off" ? "Paid Off" : "Active Debts"}
            </Text>
            <View className="gap-1.5">
              {visibleDebts.length === 0 ? (
                <Card className="p-4">
                  <Text className="text-center text-[15px] text-muted-foreground">No debts match this filter.</Text>
                </Card>
              ) : (
                visibleDebts.map((debt) => (
                  <Card key={debt.id} className="flex-row gap-2.5 p-3.5">
                    <View
                      className="mt-0.5 h-[54px] w-[3px] rounded-pill"
                      style={{ backgroundColor: debt.is_active ? colors.accent : "rgba(128,128,128,0.4)" }}
                    />
                    <View className="flex-1">
                      <View className="mb-1 flex-row items-start justify-between">
                        <View>
                          <Text className="font-sans-semibold text-[15px] text-foreground">{debt.name}</Text>
                          <Text className="mt-0.5 text-[14px] text-muted-foreground">APR {formatPct(debt.apr, 1)}</Text>
                        </View>
                        <View className={cn("rounded-badge border-[1.5px] border-foreground px-2 py-0.5", debt.is_active ? "bg-salli-accent/15" : "bg-foreground/10")}>
                          <Text className={cn("text-[14px] font-sans-semibold", debt.is_active ? "text-salli-accent" : "text-muted-foreground")}>
                            {debt.is_active ? "Active" : "Paid Off"}
                          </Text>
                        </View>
                      </View>
                      <View className="mt-1.5 flex-row gap-3">
                        <View className="flex-1">
                          <Text className="mb-0.5 text-[13px] text-muted-foreground">Principal</Text>
                          <Text className="font-sans-semibold text-[15px] text-foreground">Rs. {formatLKRAbbrev(debt.principal)}</Text>
                        </View>
                        <View className="flex-1">
                          <Text className="mb-0.5 text-[13px] text-muted-foreground">Min/mo</Text>
                          <Text className="font-sans-semibold text-[15px] text-foreground">Rs. {formatLKRAbbrev(debt.minimum_payment)}</Text>
                        </View>
                        <View className="flex-1">
                          <Text className="mb-0.5 text-[13px] text-muted-foreground">Extra/mo</Text>
                          <Text className="font-sans-semibold text-[15px] text-salli-accent">+Rs. {formatLKRAbbrev(extra)}</Text>
                        </View>
                      </View>
                    </View>
                    <Pressable onPress={() => openEdit(debt)} className="mt-0.5">
                      <Pencil size={16} color={colors.mutedForeground} strokeWidth={2} />
                    </Pressable>
                  </Card>
                ))
              )}
            </View>

            <Card className="mt-2.5 p-4">
              <Text className="mb-2.5 text-[14px] font-sans-semibold uppercase tracking-wide text-muted-foreground">
                Payoff Strategy
              </Text>
              <SegmentedControl
                className="mb-3"
                options={["avalanche", "snowball"] as const}
                value={strategy}
                onChange={setStrategy}
                capitalize
              />
              <Pressable onPress={() => setTab("Strategy")} className="flex-row items-center justify-between rounded-card border border-foreground/[0.07] bg-muted px-3.5 py-2.5">
                <View>
                  <Text className="mb-0.5 text-[13px] font-sans-medium uppercase tracking-wide text-muted-foreground">
                    Extra Monthly Payment
                  </Text>
                  <Text className="font-sans-semibold text-[18px] text-foreground">Rs. {formatLKR(extra, 0)}</Text>
                </View>
                <ChevronRight size={15} color={colors.mutedForeground} strokeWidth={2} />
              </Pressable>
            </Card>

            <View className="mt-2.5 flex-row gap-2">
              <Card className="flex-1 p-3.5">
                <Text className="mb-1.5 text-[14px] text-muted-foreground">Months to Payoff</Text>
                <Text className="font-sans-extrabold text-[32px] tracking-tight text-foreground">
                  {totalMonths ?? "—"}
                </Text>
                {totalMonths ? (
                  <Text className="mt-0.5 text-[14px] text-muted-foreground">{(totalMonths / 12).toFixed(1)} years</Text>
                ) : null}
              </Card>
              <Card className="flex-1 p-3.5">
                <Text className="mb-1.5 text-[14px] text-muted-foreground">Total Interest</Text>
                <Text className="font-sans-bold text-[22px] tracking-tight text-foreground">
                  Rs. {plan.data ? formatLKRAbbrev(plan.data.total_interest_paid) : "—"}
                </Text>
                <Text className="mt-0.5 text-[14px] text-salli-accent">
                  {interestSaved !== null && interestSaved > 0
                    ? `saved Rs. ${formatLKRAbbrev(interestSaved)}`
                    : "with extra payments"}
                </Text>
              </Card>
            </View>

            <Text className="mt-3 px-2 text-center text-[14px] leading-5 text-muted-foreground">
              Planning estimate only · Assumes fixed APR and on-time payments
            </Text>
          </View>
        ) : tab === "Strategy" ? (
          <View className="px-4 pt-3">
            <Text className="mb-2 pl-0.5 text-[14px] font-sans-semibold uppercase tracking-wide text-muted-foreground">
              Payoff Method
            </Text>
            <SegmentedControl
              options={["avalanche", "snowball"] as const}
              value={strategy}
              onChange={setStrategy}
              capitalize
            />
            <View className="mt-2 flex-row items-start gap-2 rounded-card border border-salli-accent/20 bg-salli-accent/[0.08] px-3.5 py-2.5">
              <Zap size={16} color={colors.accent} strokeWidth={2} style={{ marginTop: 1 }} />
              <Text className="flex-1 text-[14px] leading-5 text-foreground/55">
                {strategy === "avalanche" ? (
                  <>
                    <Text className="font-sans-semibold text-salli-accent">Avalanche</Text> targets the highest APR
                    first — mathematically saves the most interest.
                  </>
                ) : (
                  <>
                    <Text className="font-sans-semibold text-salli-accent">Snowball</Text> clears the smallest
                    balance first — fastest early wins for momentum.
                  </>
                )}
              </Text>
            </View>

            <Card className="mt-3 bg-salli-hero p-4">
              <View className="mb-3 flex-row items-start justify-between">
                <View>
                  <Text className="mb-1.5 text-[13px] font-sans-medium uppercase tracking-wide text-white/40">
                    Extra Monthly Payment
                  </Text>
                  <View className="flex-row items-baseline gap-1">
                    <Text className="font-sans-semibold text-[20px] text-white/35">Rs.</Text>
                    <Text className="font-sans-extrabold text-[38px] tracking-tighter text-white">
                      {formatLKR(extra, 0)}
                    </Text>
                  </View>
                </View>
                <View className="mt-1 rounded-card border border-salli-accent/30 bg-salli-accent/20 px-2.5 py-1">
                  <Text className="text-[14px] font-sans-semibold text-salli-accent">
                    On top of Rs. {formatLKRAbbrev(totalMinPayment)} min
                  </Text>
                </View>
              </View>
              <ExtraPaymentSlider value={extra} onChange={setExtra} />
            </Card>

            <View className="mt-3 flex-row gap-2">
              <Card className="flex-1 p-3.5">
                <Text className="mb-1.5 text-[14px] text-muted-foreground">Months to Payoff</Text>
                <View className="flex-row items-baseline gap-1.5">
                  <Text className="font-sans-extrabold text-[32px] tracking-tight text-foreground">
                    {totalMonths ?? "—"}
                  </Text>
                  {monthsSaved !== null && monthsSaved > 0 ? (
                    <Text className="text-[14px] font-sans-semibold text-salli-accent">−{monthsSaved} mo</Text>
                  ) : null}
                </View>
                {basePlan.data?.months_to_payoff != null ? (
                  <Text className="mt-0.5 text-[14px] text-muted-foreground">
                    vs {basePlan.data.months_to_payoff} at minimum
                  </Text>
                ) : null}
              </Card>
              <Card className="flex-1 p-3.5">
                <Text className="mb-1.5 text-[14px] text-muted-foreground">Total Interest</Text>
                <Text className="font-sans-bold text-[22px] tracking-tight text-foreground">
                  Rs. {plan.data ? formatLKRAbbrev(plan.data.total_interest_paid) : "—"}
                </Text>
                <Text className="mt-0.5 text-[14px] text-salli-accent">
                  {interestSaved !== null && interestSaved > 0
                    ? `saves Rs. ${formatLKRAbbrev(interestSaved)}`
                    : "with extra payments"}
                </Text>
              </Card>
            </View>

            <Text className="mb-2 mt-4 pl-0.5 text-[14px] font-sans-semibold uppercase tracking-wide text-muted-foreground">
              Payoff Order · {strategyLabel}
            </Text>
            <View className="gap-1.5">
              {orderedDebts.map((debt, i) => {
                const focus = i === 0;
                return (
                  <View
                    key={debt.id}
                    className={cn(
                      "flex-row items-center gap-2.5 rounded-card border bg-card px-3.5 py-3",
                      focus ? "border-salli-accent/25" : "border-foreground/[0.08] opacity-60",
                    )}
                  >
                    <View
                      className={cn("h-[26px] w-[26px] items-center justify-center rounded-full", focus ? "bg-salli-accent" : "bg-foreground/10")}
                    >
                      <Text className={cn("text-[15px] font-sans-bold", focus ? "text-white" : "text-foreground/50")}>{i + 1}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="font-sans-semibold text-[15px] text-foreground">{debt.name}</Text>
                      <Text className="mt-0.5 text-[14px] text-muted-foreground">
                        APR {formatPct(debt.apr, 1)} · {focus ? "targeting now" : "minimum only"}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="font-sans-bold text-[15px] text-foreground">Rs. {formatLKRAbbrev(debt.principal)}</Text>
                      {focus ? (
                        <View className="mt-0.5 rounded-badge border-[1.5px] border-salli-accent bg-salli-accent/15 px-1.5 py-0.5">
                          <Text className="text-[13px] font-sans-medium text-salli-accent">Focus</Text>
                        </View>
                      ) : (
                        <Text className="mt-0.5 text-[13px] text-muted-foreground">Queued</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>

            <View className="mt-3 flex-row items-start gap-2 rounded-card border border-foreground/[0.06] bg-foreground/[0.04] px-3.5 py-2.5">
              <Info size={15} color={colors.mutedForeground} strokeWidth={2} style={{ marginTop: 1 }} />
              <Text className="flex-1 text-[14px] leading-5 text-muted-foreground">
                Planning estimate · assumes fixed APR &amp; on-time payments
              </Text>
            </View>
          </View>
        ) : (
          // Schedule
          <View className="px-4 pt-3">
            <Card className="bg-salli-hero p-4">
              <View className="flex-row items-start justify-between">
                <View>
                  <Text className="mb-1.5 text-[13px] font-sans-medium uppercase tracking-wide text-white/40">
                    Debt-Free Date
                  </Text>
                  <Text className="font-sans-extrabold text-[30px] tracking-tight text-white">
                    {debtFreeLabel(totalMonths)}
                  </Text>
                  <Text className="mt-1 text-[14px] text-white/30">
                    {totalMonths != null ? `${totalMonths} payments remaining` : "Not paid off within horizon"}
                  </Text>
                </View>
                <View className="mt-1 rounded-card border border-salli-accent/30 bg-salli-accent/20 px-2.5 py-1">
                  <Text className="text-[14px] font-sans-semibold text-salli-accent">{strategyLabel}</Text>
                </View>
              </View>
              <View className="mt-3 flex-row justify-between border-t border-white/[0.08] pt-3">
                <View>
                  <Text className="mb-0.5 text-[13px] text-white/30">Balance now</Text>
                  <Text className="font-sans-semibold text-[15px] text-white">Rs. {formatLKRAbbrev(totalOutstanding)}</Text>
                </View>
                <View className="items-end">
                  <Text className="mb-0.5 text-[13px] text-white/30">Projected interest</Text>
                  <Text className="font-sans-semibold text-[15px] text-white">
                    Rs. {plan.data ? formatLKRAbbrev(plan.data.total_interest_paid) : "—"}
                  </Text>
                </View>
              </View>
            </Card>

            <Text className="mb-2 mt-4 pl-0.5 text-[14px] font-sans-semibold uppercase tracking-wide text-muted-foreground">
              {showAllRows
                ? `Amortization · all ${monthlyRows.length}`
                : `Amortization · first ${Math.min(12, monthlyRows.length)} of ${monthlyRows.length}`}
            </Text>

            {monthlyRows.length === 0 ? (
              <Card className="p-4">
                <Text className="text-center text-[15px] text-muted-foreground">No schedule to display.</Text>
              </Card>
            ) : (
              <>
                <View className="flex-row px-2 pb-1.5">
                  <Text className="w-[42px] text-[13px] font-sans-semibold tracking-wide text-muted-foreground">MO</Text>
                  <Text className="flex-1 text-right text-[13px] font-sans-semibold tracking-wide text-muted-foreground">PAYMENT</Text>
                  <Text className="flex-1 text-right text-[13px] font-sans-semibold tracking-wide text-muted-foreground">INTEREST</Text>
                  <Text className="flex-[1.1] text-right text-[13px] font-sans-semibold tracking-wide text-muted-foreground">BALANCE</Text>
                </View>
                <Card className="overflow-hidden p-0">
                  {visibleRows.map((row, i) => (
                    <View
                      key={row.month}
                      className={cn("flex-row items-center px-2 py-2.5", i !== visibleRows.length - 1 && "border-b border-foreground/[0.06]")}
                    >
                      <Text className="w-[42px] pl-2 text-[15px] font-sans-semibold text-foreground">{row.month}</Text>
                      <Text className="flex-1 text-right text-[15px] font-sans-medium text-foreground">Rs. {formatLKRAbbrev(row.payment)}</Text>
                      <Text className="flex-1 text-right text-[15px] text-muted-foreground">Rs. {formatLKRAbbrev(row.interest)}</Text>
                      <Text className="flex-[1.1] pr-2 text-right text-[15px] font-sans-semibold text-foreground">Rs. {formatLKRAbbrev(row.balance)}</Text>
                    </View>
                  ))}
                </Card>

                {monthlyRows.length > 12 ? (
                  <Pressable
                    onPress={() => setShowAllRows((v) => !v)}
                    className="mt-3 h-[50px] flex-row items-center justify-center gap-2 rounded-pill border border-foreground/10 bg-foreground/5"
                  >
                    <Text className="font-sans-semibold text-[17px] text-foreground/60">
                      {showAllRows ? "Show Less" : `View All ${monthlyRows.length} Payments`}
                    </Text>
                    <ChevronRight size={16} color={colors.mutedForeground} strokeWidth={2} />
                  </Pressable>
                ) : null}
              </>
            )}
          </View>
        )}
      </PageShell>

      {allDebts.length > 0 ? (
        <Pressable
          onPress={openAdd}
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

      <AddEditDebtDrawer visible={drawerOpen} debt={editingDebt} onClose={() => setDrawerOpen(false)} />
    </View>
  );
}

/** Add/edit a debt as a themed bottom-sheet. Reused for both modes: when `debt`
 * is passed it prefills and shows a Delete affordance. APR is stored as a
 * fraction (0.24 = 24%) but shown/entered as a percentage. */
function AddEditDebtDrawer({
  visible,
  debt,
  onClose,
}: {
  visible: boolean;
  debt: Debt | null;
  onClose: () => void;
}) {
  const addDebt = useAddDebt();
  const updateDebt = useUpdateDebt();
  const deleteDebt = useDeleteDebt();

  const isEdit = debt !== null;

  const [name, setName] = useState("");
  const [principal, setPrincipal] = useState("");
  const [aprPct, setAprPct] = useState("");
  const [minPayment, setMinPayment] = useState("");
  // Track which debt the fields were prefilled for, so the form re-syncs when
  // the drawer is opened for a different debt (or switched to add mode).
  const [prefillId, setPrefillId] = useState<string | null>(null);

  const currentId = debt?.id ?? null;
  if (visible && prefillId !== currentId) {
    setPrefillId(currentId);
    setName(debt?.name ?? "");
    setPrincipal(debt ? String(Number(debt.principal)) : "");
    // Fraction -> percent for display (0.24 -> "24").
    setAprPct(debt ? String(Number(debt.apr) * 100) : "");
    setMinPayment(debt ? String(Number(debt.minimum_payment)) : "");
  }

  const principalNum = Number(principal) || 0;
  const aprNum = Number(aprPct) || 0;
  const minNum = Number(minPayment) || 0;
  const canSubmit = Boolean(name.trim() && principal && aprPct && minPayment && principalNum > 0);
  const saving = addDebt.isPending || updateDebt.isPending;
  const isError = addDebt.isError || updateDebt.isError;

  const close = () => {
    setPrefillId(null);
    onClose();
  };

  const submit = () => {
    if (!canSubmit) return;
    // Percent -> fraction for the backend ("24" -> 0.24).
    const apr = aprNum / 100;
    if (isEdit && debt) {
      updateDebt.mutate(
        { id: debt.id, body: { name: name.trim(), principal: principalNum, apr, minimum_payment: minNum } },
        { onSuccess: close },
      );
    } else {
      addDebt.mutate(
        { name: name.trim(), principal: principalNum, apr, minimum_payment: minNum },
        { onSuccess: close },
      );
    }
  };

  const confirmDelete = () => {
    if (!debt) return;
    confirmDestructive({
      title: "Delete debt",
      message: `Delete "${debt.name}"? This can't be undone.`,
      onConfirm: () => deleteDebt.mutate(debt.id, { onSuccess: close }),
    });
  };

  return (
    <Drawer
      visible={visible}
      onClose={close}
      title={isEdit ? "Edit Debt" : "New Debt"}
      footer={
        <ActionButton variant="accent" loading={saving} disabled={!canSubmit} onPress={submit}>
          {isEdit ? "Save Changes" : "Add Debt"}
        </ActionButton>
      }
    >
      <TextField className="mb-2.5" label="Name *" value={name} onChangeText={setName} placeholder="Housing Loan" />

      <TextField
        className="mb-2.5"
        label="Principal Outstanding *"
        value={principal}
        onChangeText={setPrincipal}
        keyboardType="decimal-pad"
        placeholder="0"
      />

      <View className="mb-3 flex-row gap-2">
        <TextField
          className="flex-1"
          label="APR % *"
          value={aprPct}
          onChangeText={setAprPct}
          keyboardType="decimal-pad"
          placeholder="24"
        />
        <TextField
          className="flex-1"
          label="Min Payment / mo *"
          value={minPayment}
          onChangeText={setMinPayment}
          keyboardType="decimal-pad"
          placeholder="0"
        />
      </View>

      {principal && aprPct ? (
        <View className="mb-4 flex-row items-center justify-between rounded-card border-2 border-foreground bg-card px-3.5 py-2.5">
          <Text className="text-[15px] text-foreground/50">Interest / mo (approx)</Text>
          <Text className="font-sans-bold text-[16px] text-foreground">
            Rs. {formatLKR((principalNum * (aprNum / 100)) / 12, 0)}
          </Text>
        </View>
      ) : null}

      {isEdit ? (
        <Pressable
          onPress={confirmDelete}
          disabled={deleteDebt.isPending}
          className="mt-2.5 h-[50px] flex-row items-center justify-center gap-2 rounded-pill border border-destructive/20 bg-destructive/[0.08]"
        >
          <Trash2 size={17} color="#EF4444" strokeWidth={2} />
          <Text className="font-sans-semibold text-[17px] text-destructive">
            {deleteDebt.isPending ? "Deleting…" : "Delete Debt"}
          </Text>
        </Pressable>
      ) : null}

      {isError ? (
        <Text className="mt-2 text-center text-[14px] text-destructive">Could not save debt. Please try again.</Text>
      ) : null}
    </Drawer>
  );
}
