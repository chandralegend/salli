import { Plus, Trash2 } from "lucide-react-native";
import { useMemo, useRef, useState } from "react";
import { LayoutChangeEvent, PanResponder, Pressable, Text, View } from "react-native";

import { ActionButton } from "@/components/ui/action-button";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { Chip, Hero, Rule, Said, SectionLabel, Strong } from "@/components/ui/blocks";
import { Card } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { PageShell } from "@/components/ui/page-shell";
import { ScreenHeader } from "@/components/ui/screen-header";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { TextField } from "@/components/ui/text-field";
import { useAddDebt, useDebts, useDeleteDebt, usePayoffPlan, useUpdateDebt, type Debt } from "@/hooks/useDebt";
import { confirmDestructive } from "@/lib/confirm";
import { formatLKR, formatLKRAbbrev, formatPct } from "@/lib/format";
import { useHardShadow, useThemeColors } from "@/lib/theme";

const MAX_EXTRA = 30000;
const EXTRA_STEP = 1000;

/** Derives a debt-free month label from "months from now". Honest: computed
 * from the plan's months_to_payoff, since the backend stores no payoff date. */
function debtFreeLabel(months: number | null | undefined): string {
  if (months == null) return "—";
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/**
 * Tap/drag track standing in for a native slider (no slider package installed).
 *
 * Tokenised rather than hardcoded white: it used to sit on the dark hero card
 * and was written as `bg-white/10` with a white thumb, which on the cream
 * canvas is a white track on a white card — invisible.
 */
function ExtraPaymentSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const widthRef = useRef(0);
  const colors = useThemeColors();

  const setFromX = (x: number) => {
    const w = widthRef.current;
    if (w <= 0) return;
    const ratio = Math.max(0, Math.min(1, x / w));
    onChange(Math.round((ratio * MAX_EXTRA) / EXTRA_STEP) * EXTRA_STEP);
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
        className="my-1.5 justify-center"
        style={{ height: 24 }}
      >
        <View className="h-[11px] overflow-hidden rounded-pill bg-foreground/20">
          <View
            className="h-full rounded-pill bg-salli-accent"
            style={{ width: `${pct}%` }}
          />
        </View>
        <View
          className="absolute h-[22px] w-[22px] rounded-full border-2 border-foreground"
          style={{ left: `${pct}%`, marginLeft: -11, backgroundColor: colors.card }}
        />
      </View>
      <View className="flex-row justify-between">
        <Text className="text-[13px] text-muted-foreground">Rs. 0</Text>
        <Text className="text-[13px] text-muted-foreground">Rs. {formatLKRAbbrev(MAX_EXTRA)}</Text>
      </View>
    </View>
  );
}

/**
 * Debt, in one scroll.
 *
 * This screen was three tabs — Overview, Strategy, Schedule — and the first two
 * carried the same two figures: a "Months to Payoff" card and a "Total
 * Interest" card, rendered identically on both, plus a strategy picker on both.
 * One scroll states each figure once.
 *
 * What went, and why:
 * - The search field and All/Active/Paid Off filters. A filter bar over a
 *   handful of loans is more chrome than the list it filters; cleared debts get
 *   their own block at the end instead, so nothing is unreachable.
 * - The floating add button. It drew an accent `+` on an accent circle — an
 *   invisible glyph on a coloured disc — and duplicated the header's own add
 *   button on the same screen.
 */
export default function DebtScreen() {
  const colors = useThemeColors();
  const [strategy, setStrategy] = useState<"avalanche" | "snowball">("avalanche");
  // Starts at zero, not at a guess. It used to default to Rs. 10,000, so the
  // headline read "clear in 55 months" for someone paying the minimum -- and
  // disagreed with the 63 months the More tile computes from the real plan.
  // The slider is for asking "what if"; the sentence above it states what is.
  const [extra, setExtra] = useState(0);
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
  const activeDebts = allDebts.filter((d) => d.is_active);
  const clearedDebts = allDebts.filter((d) => !d.is_active);
  const totalOutstanding = activeDebts.reduce((sum, d) => sum + Number(d.principal), 0);
  const totalMinPayment = activeDebts.reduce((sum, d) => sum + Number(d.minimum_payment), 0);

  const interestSaved =
    basePlan.data && plan.data
      ? Math.max(0, Number(basePlan.data.total_interest_paid) - Number(plan.data.total_interest_paid))
      : null;
  const monthsSaved =
    basePlan.data?.months_to_payoff != null && plan.data?.months_to_payoff != null
      ? basePlan.data.months_to_payoff - plan.data.months_to_payoff
      : null;

  // Priority order for the chosen strategy: avalanche = highest APR first,
  // snowball = smallest balance first (mirrors the domain engine's ordering).
  const orderedDebts = useMemo(
    () =>
      allDebts
        .filter((d) => d.is_active)
        .sort((a, b) =>
          strategy === "avalanche" ? Number(b.apr) - Number(a.apr) : Number(a.principal) - Number(b.principal),
        ),
    [allDebts, strategy],
  );

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

  const totalMonths = plan.data?.months_to_payoff ?? null;
  const visibleRows = showAllRows ? monthlyRows : monthlyRows.slice(0, 12);

  return (
    <View className="flex-1">
      <PageShell
        header={
          <ScreenHeader
            title="Debt"
            back
            trailing={
              <AnimatedPressable
                onPress={openAdd}
                accessibilityRole="button"
                accessibilityLabel="Add a debt"
                className="h-11 w-11 items-center justify-center rounded-[11px] border-2 border-foreground bg-card"
              >
                <Plus size={21} color={colors.accent} strokeWidth={2.4} />
              </AnimatedPressable>
            }
          />
        }
      >
        {allDebts.length === 0 ? (
          <View className="px-5 pt-2">
            <Hero>You aren&rsquo;t tracking any debt.</Hero>
            <Text className="mt-2 text-[16px] leading-[23px] text-muted-foreground">
              Add a loan and we will work out the order to clear them in, what paying extra saves,
              and when you would be free of it.
            </Text>
            <ActionButton className="mt-5" onPress={openAdd}>
              Add a loan
            </ActionButton>
          </View>
        ) : (
          <View>
            <View className="px-5">
              <Hero>
                You owe <Strong>Rs. {formatLKRAbbrev(totalOutstanding)}</Strong> across{" "}
                {activeDebts.length} loan{activeDebts.length === 1 ? "" : "s"}.
              </Hero>
              <Text className="mt-2 text-[16px] leading-[23px] text-muted-foreground">
                {totalMonths != null
                  ? `Clear in ${totalMonths} months — ${debtFreeLabel(totalMonths)} — paying Rs. ${formatLKRAbbrev(
                      totalMinPayment + extra,
                    )} a month.`
                  : "Not paid off within the planning horizon on the current payment."}
              </Text>
            </View>

            <Rule />

            <SectionLabel>Payoff plan</SectionLabel>
            <View className="mt-3 px-5">
              <SegmentedControl
                options={["avalanche", "snowball"] as const}
                value={strategy}
                onChange={setStrategy}
                capitalize
              />
              <Text className="mt-3 text-[15px] leading-[21px] text-muted-foreground">
                {strategy === "avalanche"
                  ? "Avalanche targets the highest rate first, which costs the least interest overall."
                  : "Snowball clears the smallest balance first, which gives you a win sooner."}
              </Text>

              <Card className="mt-3.5 p-[15px]">
                <View className="flex-row items-baseline justify-between gap-2.5">
                  <Text className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                    Extra per month
                  </Text>
                  <Text className="font-sans-extrabold text-[19px] text-foreground">
                    Rs. {formatLKR(extra, 0)}
                  </Text>
                </View>
                <ExtraPaymentSlider value={extra} onChange={setExtra} />
              </Card>
            </View>

            <View className="mt-4 px-5">
              <Said>
                {extra > 0 && monthsSaved != null && monthsSaved > 0 ? (
                  <>
                    That clears it <Strong>{monthsSaved} months</Strong> sooner and saves{" "}
                    <Strong>Rs. {formatLKRAbbrev(interestSaved ?? 0)}</Strong> in interest.
                  </>
                ) : (
                  <>
                    Interest over the life of the plan:{" "}
                    <Strong>
                      Rs. {plan.data ? formatLKRAbbrev(plan.data.total_interest_paid) : "—"}
                    </Strong>
                    .
                  </>
                )}
              </Said>
            </View>

            <Rule />

            <SectionLabel>Order · {strategy}</SectionLabel>
            <View className="mt-3 gap-[9px] px-5">
              {orderedDebts.map((debt, i) => {
                const focus = i === 0;
                return (
                  <AnimatedPressable
                    key={debt.id}
                    onPress={() => openEdit(debt)}
                    press="sink"
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${debt.name}`}
                    className={`flex-row items-center gap-[11px] rounded-card border-2 bg-card px-3.5 py-3 ${
                      focus ? "border-salli-accent" : "border-foreground"
                    }`}
                  >
                    <Chip tone={focus ? "accent" : "plain"} className="min-w-[30px]">
                      {i + 1}
                    </Chip>
                    <View className="min-w-0 flex-1">
                      <Text numberOfLines={1} className="font-sans-bold text-[16px] text-foreground">
                        {debt.name}
                      </Text>
                      <Text className="mt-0.5 text-[13.5px] text-muted-foreground">
                        {formatPct(debt.apr, 1)} APR · {focus ? "targeting now" : "minimum only"}
                      </Text>
                    </View>
                    <Text className="shrink-0 font-sans-extrabold text-[15px] text-foreground">
                      {formatLKRAbbrev(debt.principal)}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>

            {clearedDebts.length > 0 ? (
              <>
                <Rule />
                <SectionLabel>Cleared</SectionLabel>
                <View className="mt-3 gap-[9px] px-5">
                  {clearedDebts.map((debt) => (
                    <AnimatedPressable
                      key={debt.id}
                      onPress={() => openEdit(debt)}
                      press="sink"
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${debt.name}`}
                      className="flex-row items-center gap-[11px] rounded-card border-2 border-foreground/25 px-3.5 py-3"
                    >
                      <Text numberOfLines={1} className="min-w-0 flex-1 text-[16px] text-muted-foreground">
                        {debt.name}
                      </Text>
                      <Text className="shrink-0 text-[13.5px] text-muted-foreground">paid off</Text>
                    </AnimatedPressable>
                  ))}
                </View>
              </>
            ) : null}

            {monthlyRows.length > 0 ? (
              <>
                <Rule />
                <SectionLabel>
                  Schedule · {showAllRows ? `all ${monthlyRows.length}` : `first ${visibleRows.length}`}
                </SectionLabel>
                <View className="mt-3 px-5">
                  <Card className="overflow-hidden p-0">
                    <View className="flex-row border-b-2 border-foreground px-3.5 py-2">
                      <Text className="w-[34px] text-[10.5px] font-mono uppercase tracking-widest text-muted-foreground">
                        Mo
                      </Text>
                      <Text className="flex-1 text-right text-[10.5px] font-mono uppercase tracking-widest text-muted-foreground">
                        Paid
                      </Text>
                      <Text className="flex-1 text-right text-[10.5px] font-mono uppercase tracking-widest text-muted-foreground">
                        Interest
                      </Text>
                      <Text className="flex-[1.15] text-right text-[10.5px] font-mono uppercase tracking-widest text-muted-foreground">
                        Left
                      </Text>
                    </View>
                    {visibleRows.map((row, i) => (
                      <View
                        key={row.month}
                        className={`flex-row items-center px-3.5 py-2.5 ${
                          i !== visibleRows.length - 1 ? "border-b border-foreground/15" : ""
                        }`}
                      >
                        <Text className="w-[34px] font-mono text-[13px] text-muted-foreground">
                          {row.month}
                        </Text>
                        <Text className="flex-1 text-right font-sans-bold text-[14px] text-foreground">
                          {formatLKRAbbrev(row.payment)}
                        </Text>
                        <Text className="flex-1 text-right text-[14px] text-muted-foreground">
                          {formatLKRAbbrev(row.interest)}
                        </Text>
                        <Text className="flex-[1.15] text-right font-sans-bold text-[14px] text-foreground">
                          {formatLKRAbbrev(row.balance)}
                        </Text>
                      </View>
                    ))}
                  </Card>
                  {monthlyRows.length > 12 ? (
                    <Pressable
                      onPress={() => setShowAllRows((v) => !v)}
                      className="mt-3 items-center py-1"
                    >
                      <Text className="font-sans-semibold text-[15px] text-salli-accent">
                        {showAllRows ? "Show fewer" : `Show all ${monthlyRows.length} months`}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </>
            ) : null}

            <Rule />
            <View className="px-5">
              <Text className="text-[13.5px] leading-5 text-muted-foreground">
                A planning estimate. Assumes a fixed rate and on-time payments.
              </Text>
            </View>
            <View className="h-7" />
          </View>
        )}
      </PageShell>

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
  const shadow = useHardShadow();

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
      title={isEdit ? "Edit debt" : "New debt"}
      footer={
        <ActionButton variant="accent" loading={saving} disabled={!canSubmit} onPress={submit}>
          {isEdit ? "Save changes" : "Add debt"}
        </ActionButton>
      }
    >
      <TextField className="mb-2.5" label="Name *" value={name} onChangeText={setName} placeholder="Housing Loan" />

      <TextField
        className="mb-2.5"
        label="Principal outstanding *"
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
          label="Min payment / mo *"
          value={minPayment}
          onChangeText={setMinPayment}
          keyboardType="decimal-pad"
          placeholder="0"
        />
      </View>

      {principal && aprPct ? (
        <View className="mb-4 flex-row items-center justify-between rounded-card border-2 border-foreground bg-card px-3.5 py-2.5">
          <Text className="text-[15px] text-muted-foreground">Interest / mo (approx)</Text>
          <Text className="font-sans-bold text-[16px] text-foreground">
            Rs. {formatLKR((principalNum * (aprNum / 100)) / 12, 0)}
          </Text>
        </View>
      ) : null}

      {isEdit ? (
        <Pressable
          onPress={confirmDelete}
          disabled={deleteDebt.isPending}
          style={shadow}
          className="mt-2.5 h-[50px] flex-row items-center justify-center gap-2 rounded-card border-2 border-destructive bg-card"
        >
          <Trash2 size={17} color="#EF4444" strokeWidth={2} />
          <Text className="font-sans-bold text-[17px] text-destructive">
            {deleteDebt.isPending ? "Deleting…" : "Delete debt"}
          </Text>
        </Pressable>
      ) : null}

      {isError ? (
        <Text className="mt-2 text-center text-[14px] text-destructive">Could not save debt. Please try again.</Text>
      ) : null}
    </Drawer>
  );
}
