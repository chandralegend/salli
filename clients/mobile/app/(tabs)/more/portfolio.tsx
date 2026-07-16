import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Modal, ScrollView } from "react-native";
import { Plus, Pencil, Trash2, X } from "lucide-react-native";
import { ScreenShell, CardContainer, SectionTitle } from "@/components/ui/page-shell";
import { PillButton } from "@/components/ui/pill-button";
import { TextField } from "@/components/ui/text-field";
import { BentoTile } from "@/components/ui/bento-tile";
import {
  useHoldings,
  usePortfolioSummary,
  useAddHolding,
  useUpdateHolding,
  useDeleteHolding,
  type Holding,
} from "@/hooks/usePortfolio";
import { useThemeColors, useThemeVars } from "@/lib/theme";

const MONO_MEDIUM = { fontFamily: "IBMPlexMono_500Medium" };

function fmt(v: string | number) {
  return Number(v).toLocaleString("en-LK", { minimumFractionDigits: 2 });
}

const EMPTY_FORM = { symbol: "", name: "", asset_class: "", cost_basis: "", current_value: "" };

const ALLOCATION_COLORS = ["#E8FC85", "#A5FFB9", "#D5E9EA", "#132b40", "#7668be", "#e7bd61"];

export default function PortfolioScreen() {
  const theme = useThemeColors();
  const holdings = useHoldings(false);
  const summary = usePortfolioSummary({});
  const addHolding = useAddHolding();
  const updateHolding = useUpdateHolding();
  const deleteHolding = useDeleteHolding();

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editTarget, setEditTarget] = useState<Holding | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Holding | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const holdingsList = holdings.data ?? [];

  async function handleAdd() {
    if (!form.symbol || !form.name || !form.asset_class || !form.cost_basis || !form.current_value) return;
    try {
      await addHolding.mutateAsync({
        symbol: form.symbol,
        name: form.name,
        asset_class: form.asset_class,
        cost_basis: Number(form.cost_basis),
        current_value: Number(form.current_value),
      });
      setAddOpen(false);
      setForm(EMPTY_FORM);
      setErrorMessage(null);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Failed to add holding");
    }
  }

  function openEdit(h: Holding) {
    setEditTarget(h);
    setEditForm({
      symbol: h.symbol,
      name: h.name,
      asset_class: h.asset_class,
      cost_basis: h.cost_basis,
      current_value: h.current_value,
    });
  }

  async function handleUpdate() {
    if (!editTarget) return;
    await updateHolding.mutateAsync({
      id: editTarget.id,
      body: {
        symbol: editForm.symbol,
        name: editForm.name,
        asset_class: editForm.asset_class,
        cost_basis: Number(editForm.cost_basis),
        current_value: Number(editForm.current_value),
      },
    });
    setEditTarget(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteHolding.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }

  return (
    <ScreenShell edges={["left", "right"]}>
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-muted-foreground text-[12.5px] flex-1 pr-3">
          Holdings, allocation & ROI — manual entry, no live market feed
        </Text>
        <Pressable
          onPress={() => setAddOpen(true)}
          className="w-9 h-9 rounded-full bg-primary items-center justify-center active:opacity-85"
        >
          <Plus color={theme.primaryForeground} size={18} />
        </Pressable>
      </View>

      {holdingsList.length > 0 && summary.data && (
        <View className="mb-5 gap-3">
          <View className="flex-row gap-3">
            <BentoTile variant="teal" label="Total Value" value={fmt(summary.data.total_value)} style={{ flex: 1 }} />
            <BentoTile
              variant={Number(summary.data.total_gain) < 0 ? "dark" : "mint"}
              label="Total Gain"
              value={fmt(summary.data.total_gain)}
              badge={`${Number(summary.data.total_gain_pct) >= 0 ? "+" : ""}${(Number(summary.data.total_gain_pct) * 100).toFixed(1)}%`}
              badgeVariant={Number(summary.data.total_gain) < 0 ? "red" : "green"}
              style={{ flex: 1 }}
            />
          </View>

          <CardContainer>
            <SectionTitle>Allocation by Asset Class</SectionTitle>
            <View className="gap-3">
              {summary.data.allocation.map((a, i) => (
                <View key={a.asset_class} className="gap-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[12px] font-medium text-foreground capitalize">{a.asset_class}</Text>
                    <Text className="text-[11.5px] text-muted-foreground" style={MONO_MEDIUM}>
                      {(Number(a.pct_of_portfolio) * 100).toFixed(1)}% · {fmt(a.current_value)}
                    </Text>
                  </View>
                  <View className="h-2 rounded-full bg-muted overflow-hidden">
                    <View
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, Number(a.pct_of_portfolio) * 100)}%`,
                        backgroundColor: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length],
                      }}
                    />
                  </View>
                </View>
              ))}
            </View>
          </CardContainer>
        </View>
      )}

      <CardContainer className="p-0" style={{ padding: 0, overflow: "hidden" }}>
        {holdings.isLoading ? (
          <View className="py-8"><ActivityIndicator color={theme.foreground} /></View>
        ) : holdingsList.length === 0 ? (
          <View className="items-center gap-2 py-8">
            <Text className="text-[13px] font-medium text-foreground">No holdings yet</Text>
            <Pressable onPress={() => setAddOpen(true)}>
              <Text className="text-[12px] text-primary underline">Add one to see allocation and ROI</Text>
            </Pressable>
          </View>
        ) : (
          holdingsList.map((h, i) => {
            const gain = Number(h.current_value) - Number(h.cost_basis);
            return (
              <View
                key={h.id}
                className={`flex-row items-center gap-3 px-5 py-3.5 ${i === holdingsList.length - 1 ? "" : "border-b border-border"}`}
              >
                <View className="flex-1 min-w-0">
                  <Text className="text-foreground text-[13.5px]" style={{ fontFamily: "DMSans_700Bold" }} numberOfLines={1}>
                    {h.symbol} · {h.name}
                  </Text>
                  <Text className="text-muted-foreground text-[11.5px] mt-0.5 capitalize">
                    {h.asset_class} · {fmt(h.current_value)}
                  </Text>
                </View>
                <Text
                  className={`text-[12px] mr-1 ${gain < 0 ? "text-destructive" : "text-emerald-600"}`}
                  style={MONO_MEDIUM}
                >
                  {gain >= 0 ? "+" : ""}{fmt(gain)}
                </Text>
                <Pressable onPress={() => openEdit(h)} className="w-8 h-8 rounded-full items-center justify-center active:bg-muted">
                  <Pencil color={theme.mutedForeground} size={15} />
                </Pressable>
                <Pressable onPress={() => setDeleteTarget(h)} className="w-8 h-8 rounded-full items-center justify-center active:bg-muted">
                  <Trash2 color={theme.mutedForeground} size={15} />
                </Pressable>
              </View>
            );
          })
        )}
      </CardContainer>

      {/* ── Add Holding modal ── */}
      <FormModal
        visible={addOpen}
        title="Add Holding"
        onClose={() => { setAddOpen(false); setForm(EMPTY_FORM); setErrorMessage(null); }}
        onSubmit={handleAdd}
        submitLabel="Add Holding"
        submitting={addHolding.isPending}
        submitDisabled={!form.symbol || !form.name || !form.asset_class || !form.cost_basis || !form.current_value}
      >
        <FieldLabel>Symbol *</FieldLabel>
        <TextField placeholder="e.g. VOO" value={form.symbol} onChangeText={(v) => setForm({ ...form, symbol: v })} className="mb-3" />
        <FieldLabel>Name *</FieldLabel>
        <TextField placeholder="e.g. Vanguard S&P 500 ETF" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} className="mb-3" />
        <FieldLabel>Asset Class *</FieldLabel>
        <TextField placeholder="e.g. equity" value={form.asset_class} onChangeText={(v) => setForm({ ...form, asset_class: v })} className="mb-3" />
        <FieldLabel>Cost Basis *</FieldLabel>
        <TextField placeholder="0.00" keyboardType="decimal-pad" value={form.cost_basis} onChangeText={(v) => setForm({ ...form, cost_basis: v })} className="mb-3" />
        <FieldLabel>Current Value *</FieldLabel>
        <TextField placeholder="0.00" keyboardType="decimal-pad" value={form.current_value} onChangeText={(v) => setForm({ ...form, current_value: v })} className="mb-3" />
        {errorMessage && <Text className="text-destructive text-[12px] mt-1">{errorMessage}</Text>}
      </FormModal>

      {/* ── Edit Holding modal ── */}
      <FormModal
        visible={!!editTarget}
        title="Edit Holding"
        onClose={() => setEditTarget(null)}
        onSubmit={handleUpdate}
        submitLabel="Save Changes"
        submitting={updateHolding.isPending}
        submitDisabled={!editForm.symbol || !editForm.name}
      >
        <FieldLabel>Symbol</FieldLabel>
        <TextField value={editForm.symbol} onChangeText={(v) => setEditForm({ ...editForm, symbol: v })} className="mb-3" />
        <FieldLabel>Name</FieldLabel>
        <TextField value={editForm.name} onChangeText={(v) => setEditForm({ ...editForm, name: v })} className="mb-3" />
        <FieldLabel>Asset Class</FieldLabel>
        <TextField value={editForm.asset_class} onChangeText={(v) => setEditForm({ ...editForm, asset_class: v })} className="mb-3" />
        <FieldLabel>Cost Basis</FieldLabel>
        <TextField keyboardType="decimal-pad" value={editForm.cost_basis} onChangeText={(v) => setEditForm({ ...editForm, cost_basis: v })} className="mb-3" />
        <FieldLabel>Current Value</FieldLabel>
        <TextField keyboardType="decimal-pad" value={editForm.current_value} onChangeText={(v) => setEditForm({ ...editForm, current_value: v })} className="mb-3" />
      </FormModal>

      {/* ── Delete confirm ── */}
      <ConfirmModal
        visible={!!deleteTarget}
        title="Delete holding?"
        description={`${deleteTarget?.name ?? ""} will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleteHolding.isPending}
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
