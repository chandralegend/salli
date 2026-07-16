import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Modal, ScrollView } from "react-native";
import { Plus, Pencil, Trash2, X } from "lucide-react-native";
import { ScreenShell, CardContainer, SectionTitle } from "@/components/ui/page-shell";
import { PillButton } from "@/components/ui/pill-button";
import { TextField } from "@/components/ui/text-field";
import { BentoTile } from "@/components/ui/bento-tile";
import {
  useDebts,
  usePayoffPlan,
  useAddDebt,
  useUpdateDebt,
  useDeleteDebt,
  type Debt,
} from "@/hooks/useDebt";
import { useThemeColors, useThemeVars } from "@/lib/theme";

const MONO_MEDIUM = { fontFamily: "IBMPlexMono_500Medium" };

function fmt(v: string | number) {
  return Number(v).toLocaleString("en-LK", { minimumFractionDigits: 2 });
}

const EMPTY_FORM = { name: "", principal: "", apr: "", minimum_payment: "" };

export default function DebtScreen() {
  const theme = useThemeColors();
  const debts = useDebts(false);
  const addDebt = useAddDebt();
  const updateDebt = useUpdateDebt();
  const deleteDebt = useDeleteDebt();

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editTarget, setEditTarget] = useState<Debt | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Debt | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [strategy, setStrategy] = useState<"avalanche" | "snowball">("avalanche");
  const [extraPayment, setExtraPayment] = useState("0");
  const plan = usePayoffPlan(Number(extraPayment) || 0, strategy);

  const debtsList = debts.data ?? [];

  async function handleAdd() {
    if (!form.name || !form.principal || !form.apr || !form.minimum_payment) return;
    try {
      await addDebt.mutateAsync({
        name: form.name,
        principal: Number(form.principal),
        apr: Number(form.apr) / 100,
        minimum_payment: Number(form.minimum_payment),
      });
      setAddOpen(false);
      setForm(EMPTY_FORM);
      setErrorMessage(null);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Failed to add debt");
    }
  }

  function openEdit(d: Debt) {
    setEditTarget(d);
    setEditForm({
      name: d.name,
      principal: d.principal,
      apr: String(Number(d.apr) * 100),
      minimum_payment: d.minimum_payment,
    });
  }

  async function handleUpdate() {
    if (!editTarget) return;
    await updateDebt.mutateAsync({
      id: editTarget.id,
      body: {
        name: editForm.name,
        principal: Number(editForm.principal),
        apr: Number(editForm.apr) / 100,
        minimum_payment: Number(editForm.minimum_payment),
      },
    });
    setEditTarget(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteDebt.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }

  const visibleSchedule = plan.data?.schedule.slice(0, 12) ?? [];

  return (
    <ScreenShell edges={["left", "right"]}>
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-muted-foreground text-[12.5px] flex-1 pr-3">
          Structured debts & avalanche/snowball payoff plans
        </Text>
        <Pressable
          onPress={() => setAddOpen(true)}
          className="w-9 h-9 rounded-full bg-primary items-center justify-center active:opacity-85"
        >
          <Plus color={theme.primaryForeground} size={18} />
        </Pressable>
      </View>

      <CardContainer className="p-0" style={{ padding: 0, overflow: "hidden" }}>
        {debts.isLoading ? (
          <View className="py-8"><ActivityIndicator color={theme.foreground} /></View>
        ) : debtsList.length === 0 ? (
          <View className="items-center gap-2 py-8">
            <Text className="text-[13px] font-medium text-foreground">No debts recorded</Text>
            <Pressable onPress={() => setAddOpen(true)}>
              <Text className="text-[12px] text-primary underline">Add one to see a payoff plan</Text>
            </Pressable>
          </View>
        ) : (
          debtsList.map((d, i) => (
            <View
              key={d.id}
              className={`flex-row items-center gap-3 px-5 py-3.5 ${i === debtsList.length - 1 ? "" : "border-b border-border"}`}
            >
              <View className="flex-1 min-w-0">
                <Text className="text-foreground text-[13.5px]" style={{ fontFamily: "DMSans_700Bold" }} numberOfLines={1}>
                  {d.name}
                </Text>
                <View className="flex-row items-center gap-1.5 mt-1 flex-wrap">
                  <Text className="text-muted-foreground text-[11.5px]" style={MONO_MEDIUM}>
                    {fmt(d.principal)} · {(Number(d.apr) * 100).toFixed(2)}% APR
                  </Text>
                  <View className={`px-1.5 py-0.5 rounded-full ${d.is_active ? "bg-emerald-100" : "bg-muted"}`}>
                    <Text className={`text-[10px] font-bold ${d.is_active ? "text-emerald-700" : "text-muted-foreground"}`}>
                      {d.is_active ? "Active" : "Inactive"}
                    </Text>
                  </View>
                </View>
              </View>
              <Pressable onPress={() => openEdit(d)} className="w-8 h-8 rounded-full items-center justify-center active:bg-muted">
                <Pencil color={theme.mutedForeground} size={15} />
              </Pressable>
              <Pressable onPress={() => setDeleteTarget(d)} className="w-8 h-8 rounded-full items-center justify-center active:bg-muted">
                <Trash2 color={theme.mutedForeground} size={15} />
              </Pressable>
            </View>
          ))
        )}
      </CardContainer>

      {debtsList.length > 0 && (
        <View className="mt-5 gap-3">
          <SectionTitle>Payoff Plan</SectionTitle>

          <View className="flex-row bg-muted rounded-full p-1 gap-0.5">
            <Pressable
              onPress={() => setStrategy("avalanche")}
              className={`flex-1 py-2 rounded-full items-center ${strategy === "avalanche" ? "bg-card" : ""}`}
            >
              <Text
                className={`text-[12px] ${strategy === "avalanche" ? "text-foreground" : "text-muted-foreground"}`}
                style={{ fontFamily: strategy === "avalanche" ? "DMSans_700Bold" : "DMSans_500Medium" }}
                numberOfLines={1}
              >
                Avalanche
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setStrategy("snowball")}
              className={`flex-1 py-2 rounded-full items-center ${strategy === "snowball" ? "bg-card" : ""}`}
            >
              <Text
                className={`text-[12px] ${strategy === "snowball" ? "text-foreground" : "text-muted-foreground"}`}
                style={{ fontFamily: strategy === "snowball" ? "DMSans_700Bold" : "DMSans_500Medium" }}
                numberOfLines={1}
              >
                Snowball
              </Text>
            </Pressable>
          </View>

          <View>
            <Text className="text-[12px] font-medium text-muted-foreground mb-1.5">Extra monthly payment</Text>
            <TextField
              placeholder="0"
              keyboardType="decimal-pad"
              value={extraPayment}
              onChangeText={setExtraPayment}
            />
          </View>

          {plan.isLoading ? (
            <ActivityIndicator color={theme.foreground} />
          ) : plan.data ? (
            <>
              <View className="flex-row gap-3">
                <BentoTile variant="teal" label="Months to Payoff" value={String(plan.data.months_to_payoff)} style={{ flex: 1 }} />
                <BentoTile variant="card" label="Total Interest" value={fmt(plan.data.total_interest_paid)} style={{ flex: 1 }} />
              </View>
              <Text className="text-[11px] text-muted-foreground -mt-1">
                Planning estimate only, not financial advice. Showing the first {visibleSchedule.length} of{" "}
                {plan.data.schedule.length} scheduled payments.
              </Text>
              <CardContainer className="p-0" style={{ padding: 0, overflow: "hidden" }}>
                {visibleSchedule.map((e, i) => (
                  <View
                    key={i}
                    className={`flex-row items-center justify-between px-4 py-2.5 ${i === visibleSchedule.length - 1 ? "" : "border-b border-border"}`}
                  >
                    <View className="flex-1 min-w-0">
                      <Text className="text-[12.5px] text-foreground" numberOfLines={1}>
                        M{e.month} · {e.debt_name}
                      </Text>
                    </View>
                    <Text className="text-[12px] text-foreground mr-2" style={MONO_MEDIUM}>
                      {fmt(e.payment)}
                    </Text>
                    <Text className="text-[11px] text-muted-foreground" style={MONO_MEDIUM}>
                      {fmt(e.remaining_balance)} left
                    </Text>
                  </View>
                ))}
              </CardContainer>
            </>
          ) : null}
        </View>
      )}

      {/* ── Add Debt modal ── */}
      <FormModal
        visible={addOpen}
        title="Add Debt"
        onClose={() => { setAddOpen(false); setForm(EMPTY_FORM); setErrorMessage(null); }}
        onSubmit={handleAdd}
        submitLabel="Add Debt"
        submitting={addDebt.isPending}
        submitDisabled={!form.name || !form.principal || !form.apr || !form.minimum_payment}
      >
        <FieldLabel>Name *</FieldLabel>
        <TextField placeholder="e.g. Credit Card" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} className="mb-3" />
        <FieldLabel>Principal *</FieldLabel>
        <TextField placeholder="0.00" keyboardType="decimal-pad" value={form.principal} onChangeText={(v) => setForm({ ...form, principal: v })} className="mb-3" />
        <FieldLabel>APR % *</FieldLabel>
        <TextField placeholder="e.g. 18" keyboardType="decimal-pad" value={form.apr} onChangeText={(v) => setForm({ ...form, apr: v })} className="mb-3" />
        <FieldLabel>Minimum Payment *</FieldLabel>
        <TextField placeholder="0.00" keyboardType="decimal-pad" value={form.minimum_payment} onChangeText={(v) => setForm({ ...form, minimum_payment: v })} className="mb-3" />
        {errorMessage && <Text className="text-destructive text-[12px] mt-1">{errorMessage}</Text>}
      </FormModal>

      {/* ── Edit Debt modal ── */}
      <FormModal
        visible={!!editTarget}
        title="Edit Debt"
        onClose={() => setEditTarget(null)}
        onSubmit={handleUpdate}
        submitLabel="Save Changes"
        submitting={updateDebt.isPending}
        submitDisabled={!editForm.name || !editForm.principal}
      >
        <FieldLabel>Name</FieldLabel>
        <TextField value={editForm.name} onChangeText={(v) => setEditForm({ ...editForm, name: v })} className="mb-3" />
        <FieldLabel>Principal</FieldLabel>
        <TextField keyboardType="decimal-pad" value={editForm.principal} onChangeText={(v) => setEditForm({ ...editForm, principal: v })} className="mb-3" />
        <FieldLabel>APR %</FieldLabel>
        <TextField keyboardType="decimal-pad" value={editForm.apr} onChangeText={(v) => setEditForm({ ...editForm, apr: v })} className="mb-3" />
        <FieldLabel>Minimum Payment</FieldLabel>
        <TextField keyboardType="decimal-pad" value={editForm.minimum_payment} onChangeText={(v) => setEditForm({ ...editForm, minimum_payment: v })} className="mb-3" />
      </FormModal>

      {/* ── Delete confirm ── */}
      <ConfirmModal
        visible={!!deleteTarget}
        title="Delete debt?"
        description={`${deleteTarget?.name ?? ""} will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleteDebt.isPending}
      />
    </ScreenShell>
  );
}

// ── Shared sub-components (mirrors app/(tabs)/ledger.tsx) ──────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text className="text-[12px] font-medium text-muted-foreground mb-1.5">{children}</Text>;
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
