import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Modal, ScrollView } from "react-native";
import { Plus, Trash2, BarChart3, X } from "lucide-react-native";
import { ScreenShell, CardContainer, SectionTitle } from "@/components/ui/page-shell";
import { PillButton } from "@/components/ui/pill-button";
import { TextField } from "@/components/ui/text-field";
import { BentoTile } from "@/components/ui/bento-tile";
import { useLedger } from "@/hooks/useLedger";
import {
  useBudgets,
  useBudgetSummary,
  useCreateBudget,
  useDeleteBudget,
  type Budget,
  type BudgetLine,
} from "@/hooks/useBudget";
import { useThemeColors, useThemeVars } from "@/lib/theme";

const MONO_MEDIUM = { fontFamily: "IBMPlexMono_500Medium" };

function fmt(v: string | number) {
  return Number(v).toLocaleString("en-LK", { minimumFractionDigits: 2 });
}

const EMPTY_LINE: BudgetLine = { account_id: "", limit_amount: "" };

export default function BudgetScreen() {
  const theme = useThemeColors();
  const { accounts } = useLedger();
  const expenseAccounts = (accounts.data ?? []).filter((a) => a.type === "expense" && a.is_active);

  const budgets = useBudgets();
  const createBudget = useCreateBudget();
  const deleteBudget = useDeleteBudget();

  const [addOpen, setAddOpen] = useState(false);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [lines, setLines] = useState<BudgetLine[]>([{ ...EMPTY_LINE }]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Budget | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const summary = useBudgetSummary(selectedId);
  const budgetsList = budgets.data ?? [];

  function resetAddForm() {
    setPeriodStart("");
    setPeriodEnd("");
    setLines([{ ...EMPTY_LINE }]);
    setErrorMessage(null);
  }

  async function handleCreate() {
    const validLines = lines.filter((l) => l.account_id && l.limit_amount);
    if (!periodStart || !periodEnd || validLines.length === 0) return;
    try {
      await createBudget.mutateAsync({ period_start: periodStart, period_end: periodEnd, lines: validLines });
      setAddOpen(false);
      resetAddForm();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Failed to create budget");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteBudget.mutateAsync(deleteTarget.id);
    if (selectedId === deleteTarget.id) setSelectedId(null);
    setDeleteTarget(null);
  }

  return (
    <ScreenShell edges={["left", "right"]}>
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-muted-foreground text-[12.5px] flex-1 pr-3">
          Category limits vs. actual ledger spend
        </Text>
        <Pressable
          onPress={() => setAddOpen(true)}
          className="w-9 h-9 rounded-full bg-primary items-center justify-center active:opacity-85"
        >
          <Plus color={theme.primaryForeground} size={18} />
        </Pressable>
      </View>

      <CardContainer className="p-0" style={{ padding: 0, overflow: "hidden" }}>
        {budgets.isLoading ? (
          <View className="py-8"><ActivityIndicator color={theme.foreground} /></View>
        ) : budgetsList.length === 0 ? (
          <View className="items-center gap-2 py-8">
            <Text className="text-[13px] font-medium text-foreground">No budgets yet</Text>
            <Pressable onPress={() => setAddOpen(true)}>
              <Text className="text-[12px] text-primary underline">Create one to track category spend</Text>
            </Pressable>
          </View>
        ) : (
          budgetsList.map((b, i) => (
            <Pressable
              key={b.id}
              onPress={() => setSelectedId(b.id)}
              className={`flex-row items-center gap-3 px-5 py-3.5 active:bg-muted ${
                i === budgetsList.length - 1 ? "" : "border-b border-border"
              } ${selectedId === b.id ? "bg-muted" : ""}`}
            >
              <View className="flex-1 min-w-0">
                <Text className="text-foreground text-[13.5px]" style={{ fontFamily: "DMSans_700Bold" }}>
                  {b.period_start} → {b.period_end}
                </Text>
                <Text className="text-muted-foreground text-[11.5px] mt-0.5">
                  {b.lines.length} categories · limit {fmt(b.lines.reduce((s, l) => s + Number(l.limit_amount), 0))}
                </Text>
              </View>
              <Pressable
                onPress={() => setSelectedId(b.id)}
                hitSlop={8}
                className="w-8 h-8 rounded-full items-center justify-center active:bg-muted"
              >
                <BarChart3 color={theme.mutedForeground} size={15} />
              </Pressable>
              <Pressable
                onPress={() => setDeleteTarget(b)}
                hitSlop={8}
                className="w-8 h-8 rounded-full items-center justify-center active:bg-muted"
              >
                <Trash2 color={theme.mutedForeground} size={15} />
              </Pressable>
            </Pressable>
          ))
        )}
      </CardContainer>

      {selectedId && (
        <View className="mt-5 gap-3">
          <SectionTitle>Summary</SectionTitle>
          {summary.isLoading ? (
            <ActivityIndicator color={theme.foreground} />
          ) : summary.data ? (
            <>
              <View className="flex-row gap-3">
                <BentoTile variant="teal" label="Total Limit" value={fmt(summary.data.total_limit)} style={{ flex: 1 }} />
                <BentoTile
                  variant={Number(summary.data.total_variance) < 0 ? "dark" : "mint"}
                  label="Variance"
                  value={fmt(summary.data.total_variance)}
                  badge={Number(summary.data.total_variance) < 0 ? "Over budget" : "On track"}
                  badgeVariant={Number(summary.data.total_variance) < 0 ? "red" : "green"}
                  style={{ flex: 1 }}
                />
              </View>
              <CardContainer className="p-0" style={{ padding: 0, overflow: "hidden" }}>
                {summary.data.lines.map((line, i) => {
                  const over = Number(line.variance) < 0;
                  return (
                    <View
                      key={line.account_id}
                      className={`flex-row items-center justify-between px-4 py-3 ${
                        i === summary.data!.lines.length - 1 ? "" : "border-b border-border"
                      }`}
                    >
                      <Text className="text-[13px] text-foreground flex-1 pr-2" numberOfLines={1}>
                        {line.category}
                      </Text>
                      <Text className="text-[12px] text-muted-foreground mr-2" style={MONO_MEDIUM}>
                        {fmt(line.actual_amount)} / {fmt(line.limit_amount)}
                      </Text>
                      <View className={`px-2 py-0.5 rounded-full ${over ? "bg-rose-100" : "bg-emerald-100"}`}>
                        <Text className={`text-[11px] font-bold ${over ? "text-rose-700" : "text-emerald-700"}`}>
                          {fmt(line.variance)}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </CardContainer>
            </>
          ) : null}
        </View>
      )}

      {/* ── Add Budget modal ── */}
      <FormModal
        visible={addOpen}
        title="New Budget"
        onClose={() => { setAddOpen(false); resetAddForm(); }}
        onSubmit={handleCreate}
        submitLabel="Create Budget"
        submitting={createBudget.isPending}
        submitDisabled={!periodStart || !periodEnd || !lines.some((l) => l.account_id && l.limit_amount)}
      >
        <FieldLabel>Period start (YYYY-MM-DD) *</FieldLabel>
        <TextField placeholder="2026-04-01" value={periodStart} onChangeText={setPeriodStart} className="mb-3" />
        <FieldLabel>Period end (YYYY-MM-DD) *</FieldLabel>
        <TextField placeholder="2026-04-30" value={periodEnd} onChangeText={setPeriodEnd} className="mb-3" />
        <FieldLabel>Category limits *</FieldLabel>
        {lines.map((line, i) => (
          <View key={i} className="mb-3">
            <ExpenseAccountChipPicker
              accounts={expenseAccounts}
              value={line.account_id}
              onChange={(v) => setLines((prev) => prev.map((l, j) => (j === i ? { ...l, account_id: v } : l)))}
            />
            <View className="flex-row items-center gap-2 mt-2">
              <TextField
                placeholder="Limit amount"
                keyboardType="decimal-pad"
                value={line.limit_amount}
                onChangeText={(v) => setLines((prev) => prev.map((l, j) => (j === i ? { ...l, limit_amount: v } : l)))}
                className="flex-1"
              />
              {lines.length > 1 && (
                <Pressable
                  onPress={() => setLines((prev) => prev.filter((_, j) => j !== i))}
                  className="w-9 h-9 rounded-full items-center justify-center active:bg-muted"
                >
                  <Trash2 color={theme.mutedForeground} size={15} />
                </Pressable>
              )}
            </View>
          </View>
        ))}
        <Pressable onPress={() => setLines((prev) => [...prev, { ...EMPTY_LINE }])} className="flex-row items-center gap-1.5 mb-2">
          <Plus color={theme.primary} size={14} />
          <Text className="text-primary text-[12.5px]" style={{ fontFamily: "DMSans_700Bold" }}>Add category</Text>
        </Pressable>
        {errorMessage && <Text className="text-destructive text-[12px] mt-1">{errorMessage}</Text>}
      </FormModal>

      {/* ── Delete confirm ── */}
      <ConfirmModal
        visible={!!deleteTarget}
        title="Delete budget?"
        description={`The budget for ${deleteTarget?.period_start ?? ""} → ${deleteTarget?.period_end ?? ""} will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleteBudget.isPending}
      />
    </ScreenShell>
  );
}

// ── Shared sub-components (mirrors app/(tabs)/ledger.tsx) ──────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text className="text-[12px] font-medium text-muted-foreground mb-1.5">{children}</Text>;
}

function ExpenseAccountChipPicker({
  accounts,
  value,
  onChange,
}: {
  accounts: { id: string; code: string; name: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  if (accounts.length === 0) {
    return <Text className="text-[12.5px] text-muted-foreground">No expense accounts available</Text>;
  }
  return (
    <View className="border border-border rounded-2xl max-h-36">
      <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
        {accounts.map((a, i) => {
          const active = value === a.id;
          return (
            <Pressable
              key={a.id}
              onPress={() => onChange(a.id)}
              className={`flex-row items-center gap-2 px-3 py-2.5 ${i === accounts.length - 1 ? "" : "border-b border-border"} ${active ? "bg-muted" : ""}`}
            >
              <Text className="text-[11px] text-muted-foreground w-12" style={MONO_MEDIUM}>{a.code}</Text>
              <Text
                className="text-[13px] flex-1 text-foreground"
                style={{ fontFamily: active ? "DMSans_700Bold" : "DMSans_400Regular" }}
                numberOfLines={1}
              >
                {a.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function FormModal({
  visible,
  title,
  onClose,
  onSubmit,
  submitLabel,
  submitting,
  submitDisabled,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  submitLabel: string;
  submitting?: boolean;
  submitDisabled?: boolean;
  children: React.ReactNode;
}) {
  const theme = useThemeColors();
  const themeVars = useThemeVars();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={[themeVars, { backgroundColor: "rgba(0,0,0,0.4)" }]}>
        <View className="bg-background rounded-t-[28px] max-h-[85%]">
          <View className="flex-row items-center justify-between px-5 pt-5 pb-3">
            <Text className="text-foreground" style={{ fontFamily: "DMSans_900Black", fontSize: 20, letterSpacing: -0.5 }}>
              {title}
            </Text>
            <Pressable onPress={onClose} className="w-8 h-8 rounded-full items-center justify-center bg-muted">
              <X color={theme.foreground} size={16} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          <View className="flex-row gap-2.5 px-5 pt-2 pb-6">
            <PillButton variant="secondary" onPress={onClose} className="flex-1">Cancel</PillButton>
            <PillButton variant="primary" onPress={onSubmit} loading={submitting} disabled={submitDisabled} className="flex-1">
              {submitLabel}
            </PillButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ConfirmModal({
  visible,
  title,
  description,
  confirmLabel,
  destructive,
  onCancel,
  onConfirm,
  loading,
}: {
  visible: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
}) {
  const themeVars = useThemeVars();
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View className="flex-1 items-center justify-center px-6" style={[themeVars, { backgroundColor: "rgba(0,0,0,0.4)" }]}>
        <View className="bg-background rounded-[24px] p-5 w-full max-w-[380px]">
          <Text className="text-foreground mb-2" style={{ fontFamily: "DMSans_900Black", fontSize: 18, letterSpacing: -0.4 }}>
            {title}
          </Text>
          <Text className="text-[13px] text-muted-foreground leading-[19px] mb-5">{description}</Text>
          <View className="flex-row gap-2.5">
            <PillButton variant="secondary" onPress={onCancel} className="flex-1">Cancel</PillButton>
            <PillButton variant={destructive ? "destructive" : "primary"} onPress={onConfirm} loading={loading} className="flex-1">
              {confirmLabel}
            </PillButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}
