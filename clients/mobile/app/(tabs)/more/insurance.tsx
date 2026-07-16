import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Modal, ScrollView } from "react-native";
import { Plus, Pencil, Trash2, AlertTriangle, X } from "lucide-react-native";
import { ScreenShell, CardContainer, SectionTitle } from "@/components/ui/page-shell";
import { PillButton } from "@/components/ui/pill-button";
import { TextField } from "@/components/ui/text-field";
import {
  usePolicies,
  useCoverageTargets,
  useCoverageReport,
  useAddPolicy,
  useUpdatePolicy,
  useDeletePolicy,
  useSetCoverageTarget,
  useDeleteCoverageTarget,
  type Policy,
} from "@/hooks/useInsurance";
import { useThemeColors, useThemeVars } from "@/lib/theme";

const MONO_MEDIUM = { fontFamily: "IBMPlexMono_500Medium" };

function fmt(v: string | number) {
  return Number(v).toLocaleString("en-LK", { minimumFractionDigits: 2 });
}

const EMPTY_FORM = {
  name: "", policy_type: "", provider: "", coverage_amount: "",
  premium_amount: "", premium_frequency: "annual", expiry_date: "",
};

type InsuranceTab = "policies" | "targets" | "report";

export default function InsuranceScreen() {
  const theme = useThemeColors();
  const [tab, setTab] = useState<InsuranceTab>("policies");

  const policies = usePolicies(false);
  const addPolicy = useAddPolicy();
  const updatePolicy = useUpdatePolicy();
  const deletePolicy = useDeletePolicy();

  const targets = useCoverageTargets();
  const setTarget = useSetCoverageTarget();
  const deleteCoverageTarget = useDeleteCoverageTarget();

  const report = useCoverageReport();

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editTarget, setEditTarget] = useState<Policy | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [deleteTargetPolicy, setDeleteTargetPolicy] = useState<Policy | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [targetType, setTargetType] = useState("");
  const [targetAmount, setTargetAmount] = useState("");

  const policiesList = policies.data ?? [];
  const targetsList = targets.data ?? [];

  async function handleAdd() {
    const { name, policy_type, provider, coverage_amount, premium_amount, expiry_date } = form;
    if (!name || !policy_type || !provider || !coverage_amount || !premium_amount || !expiry_date) return;
    try {
      await addPolicy.mutateAsync({
        name, policy_type, provider,
        coverage_amount: Number(coverage_amount),
        premium_amount: Number(premium_amount),
        premium_frequency: form.premium_frequency, expiry_date,
      });
      setAddOpen(false);
      setForm(EMPTY_FORM);
      setErrorMessage(null);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Failed to add policy");
    }
  }

  function openEdit(p: Policy) {
    setEditTarget(p);
    setEditForm({
      name: p.name, policy_type: p.policy_type, provider: p.provider,
      coverage_amount: p.coverage_amount, premium_amount: p.premium_amount,
      premium_frequency: p.premium_frequency, expiry_date: p.expiry_date,
    });
  }

  async function handleUpdate() {
    if (!editTarget) return;
    await updatePolicy.mutateAsync({
      id: editTarget.id,
      body: {
        name: editForm.name, policy_type: editForm.policy_type, provider: editForm.provider,
        coverage_amount: Number(editForm.coverage_amount), premium_amount: Number(editForm.premium_amount),
        premium_frequency: editForm.premium_frequency, expiry_date: editForm.expiry_date,
      },
    });
    setEditTarget(null);
  }

  async function handleDelete() {
    if (!deleteTargetPolicy) return;
    await deletePolicy.mutateAsync(deleteTargetPolicy.id);
    setDeleteTargetPolicy(null);
  }

  async function handleSetTarget() {
    if (!targetType || !targetAmount) return;
    await setTarget.mutateAsync({ policy_type: targetType, target_amount: Number(targetAmount) });
    setTargetType("");
    setTargetAmount("");
  }

  return (
    <ScreenShell edges={["left", "right"]}>
      <Text className="text-muted-foreground text-[12.5px] mb-4">
        Policies, coverage targets & gap report
      </Text>

      <View className="flex-row bg-muted rounded-full p-1 gap-0.5 mb-5">
        <SegmentButton label="Policies" active={tab === "policies"} onPress={() => setTab("policies")} />
        <SegmentButton label="Targets" active={tab === "targets"} onPress={() => setTab("targets")} />
        <SegmentButton label="Report" active={tab === "report"} onPress={() => setTab("report")} />
      </View>

      {/* ── Policies tab ── */}
      {tab === "policies" && (
        <View className="gap-3">
          <Pressable
            onPress={() => setAddOpen(true)}
            className="self-end w-9 h-9 rounded-full bg-primary items-center justify-center active:opacity-85"
          >
            <Plus color={theme.primaryForeground} size={18} />
          </Pressable>
          <CardContainer className="p-0" style={{ padding: 0, overflow: "hidden" }}>
            {policies.isLoading ? (
              <View className="py-8"><ActivityIndicator color={theme.foreground} /></View>
            ) : policiesList.length === 0 ? (
              <View className="items-center gap-2 py-8">
                <Text className="text-[13px] font-medium text-foreground">No policies yet</Text>
              </View>
            ) : (
              policiesList.map((p, i) => (
                <View
                  key={p.id}
                  className={`flex-row items-center gap-3 px-5 py-3.5 ${i === policiesList.length - 1 ? "" : "border-b border-border"}`}
                >
                  <View className="flex-1 min-w-0">
                    <Text className="text-foreground text-[13.5px]" style={{ fontFamily: "DMSans_700Bold" }} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <View className="flex-row items-center gap-1.5 mt-1 flex-wrap">
                      <Text className="text-muted-foreground text-[11.5px] capitalize">{p.policy_type} · {p.provider}</Text>
                      <View className={`px-1.5 py-0.5 rounded-full ${p.is_active ? "bg-emerald-100" : "bg-muted"}`}>
                        <Text className={`text-[10px] font-bold ${p.is_active ? "text-emerald-700" : "text-muted-foreground"}`}>
                          {p.is_active ? "Active" : "Inactive"}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-muted-foreground text-[11px] mt-1" style={MONO_MEDIUM}>
                      Coverage {fmt(p.coverage_amount)} · expires {p.expiry_date}
                    </Text>
                  </View>
                  <Pressable onPress={() => openEdit(p)} className="w-8 h-8 rounded-full items-center justify-center active:bg-muted">
                    <Pencil color={theme.mutedForeground} size={15} />
                  </Pressable>
                  <Pressable onPress={() => setDeleteTargetPolicy(p)} className="w-8 h-8 rounded-full items-center justify-center active:bg-muted">
                    <Trash2 color={theme.mutedForeground} size={15} />
                  </Pressable>
                </View>
              ))
            )}
          </CardContainer>
        </View>
      )}

      {/* ── Targets tab ── */}
      {tab === "targets" && (
        <CardContainer>
          <SectionTitle>Declared Coverage Targets</SectionTitle>
          <View className="gap-2 mb-4">
            {targetsList.length === 0 ? (
              <Text className="text-[13px] text-muted-foreground py-2">No targets declared yet.</Text>
            ) : (
              targetsList.map((t) => (
                <View key={t.id} className="flex-row items-center justify-between px-3 py-2.5 rounded-xl bg-muted">
                  <Text className="text-[13px] text-foreground capitalize" style={{ fontFamily: "DMSans_700Bold" }}>
                    {t.policy_type}
                  </Text>
                  <View className="flex-row items-center gap-3">
                    <Text className="text-[13px] text-foreground" style={MONO_MEDIUM}>{fmt(t.target_amount)}</Text>
                    <Pressable onPress={() => deleteCoverageTarget.mutate(t.policy_type)} hitSlop={8}>
                      <Trash2 color={theme.mutedForeground} size={15} />
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </View>
          <FieldLabel>Policy Type</FieldLabel>
          <TextField placeholder="e.g. life" value={targetType} onChangeText={setTargetType} className="mb-3" />
          <FieldLabel>Target Amount</FieldLabel>
          <TextField placeholder="0.00" keyboardType="decimal-pad" value={targetAmount} onChangeText={setTargetAmount} className="mb-3" />
          <PillButton variant="primary" onPress={handleSetTarget} loading={setTarget.isPending} disabled={!targetType || !targetAmount}>
            Save Target
          </PillButton>
        </CardContainer>
      )}

      {/* ── Report tab ── */}
      {tab === "report" && (
        <View className="gap-3">
          {report.isLoading ? (
            <ActivityIndicator color={theme.foreground} />
          ) : report.data ? (
            <>
              <CardContainer className="p-0" style={{ padding: 0, overflow: "hidden" }}>
                {report.data.lines.length === 0 ? (
                  <View className="py-6">
                    <Text className="text-center text-muted-foreground text-[13px]">No coverage targets declared.</Text>
                  </View>
                ) : (
                  report.data.lines.map((line, i) => {
                    const gapNegative = Number(line.gap) < 0;
                    return (
                      <View
                        key={line.policy_type}
                        className={`flex-row items-center justify-between px-4 py-3 ${i === report.data!.lines.length - 1 ? "" : "border-b border-border"}`}
                      >
                        <Text className="text-[13px] text-foreground capitalize flex-1" numberOfLines={1}>{line.policy_type}</Text>
                        <Text className="text-[11.5px] text-muted-foreground mr-2" style={MONO_MEDIUM}>
                          {fmt(line.actual_coverage)} / {fmt(line.target_amount)}
                        </Text>
                        <View className={`px-2 py-0.5 rounded-full ${gapNegative ? "bg-rose-100" : "bg-emerald-100"}`}>
                          <Text className={`text-[11px] font-bold ${gapNegative ? "text-rose-700" : "text-emerald-700"}`}>
                            {fmt(line.gap)}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </CardContainer>

              {report.data.missing_types.length > 0 && (
                <CardContainer>
                  <SectionTitle>Missing Coverage Types</SectionTitle>
                  <View className="flex-row flex-wrap gap-2">
                    {report.data.missing_types.map((t) => (
                      <View key={t} className="px-2 py-0.5 rounded-full bg-amber-100">
                        <Text className="text-[11px] font-bold text-amber-700 capitalize">{t}</Text>
                      </View>
                    ))}
                  </View>
                </CardContainer>
              )}

              {report.data.expiring_soon.length > 0 && (
                <CardContainer>
                  <SectionTitle>Expiring Soon</SectionTitle>
                  <View className="gap-2">
                    {report.data.expiring_soon.map((a) => (
                      <View key={a.policy_name} className="flex-row items-center gap-2">
                        <AlertTriangle color="#D97706" size={15} />
                        <Text className="text-[13px] text-foreground flex-1" numberOfLines={1}>
                          <Text style={{ fontFamily: "DMSans_700Bold" }}>{a.policy_name}</Text>
                          <Text className="text-muted-foreground"> expires {a.expiry_date} ({a.days_until_expiry}d)</Text>
                        </Text>
                      </View>
                    ))}
                  </View>
                </CardContainer>
              )}
            </>
          ) : null}
        </View>
      )}

      {/* ── Add Policy modal ── */}
      <FormModal
        visible={addOpen}
        title="Add Policy"
        onClose={() => { setAddOpen(false); setForm(EMPTY_FORM); setErrorMessage(null); }}
        onSubmit={handleAdd}
        submitLabel="Add Policy"
        submitting={addPolicy.isPending}
        submitDisabled={!form.name || !form.policy_type || !form.provider || !form.coverage_amount || !form.premium_amount || !form.expiry_date}
      >
        <FieldLabel>Name *</FieldLabel>
        <TextField value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} className="mb-3" />
        <FieldLabel>Type *</FieldLabel>
        <TextField placeholder="e.g. life" value={form.policy_type} onChangeText={(v) => setForm({ ...form, policy_type: v })} className="mb-3" />
        <FieldLabel>Provider *</FieldLabel>
        <TextField value={form.provider} onChangeText={(v) => setForm({ ...form, provider: v })} className="mb-3" />
        <FieldLabel>Coverage *</FieldLabel>
        <TextField keyboardType="decimal-pad" value={form.coverage_amount} onChangeText={(v) => setForm({ ...form, coverage_amount: v })} className="mb-3" />
        <FieldLabel>Premium *</FieldLabel>
        <TextField keyboardType="decimal-pad" value={form.premium_amount} onChangeText={(v) => setForm({ ...form, premium_amount: v })} className="mb-3" />
        <FieldLabel>Frequency</FieldLabel>
        <TextField value={form.premium_frequency} onChangeText={(v) => setForm({ ...form, premium_frequency: v })} className="mb-3" />
        <FieldLabel>Expiry Date (YYYY-MM-DD) *</FieldLabel>
        <TextField placeholder="2027-01-01" value={form.expiry_date} onChangeText={(v) => setForm({ ...form, expiry_date: v })} className="mb-3" />
        {errorMessage && <Text className="text-destructive text-[12px] mt-1">{errorMessage}</Text>}
      </FormModal>

      {/* ── Edit Policy modal ── */}
      <FormModal
        visible={!!editTarget}
        title="Edit Policy"
        onClose={() => setEditTarget(null)}
        onSubmit={handleUpdate}
        submitLabel="Save Changes"
        submitting={updatePolicy.isPending}
        submitDisabled={!editForm.name}
      >
        <FieldLabel>Name</FieldLabel>
        <TextField value={editForm.name} onChangeText={(v) => setEditForm({ ...editForm, name: v })} className="mb-3" />
        <FieldLabel>Type</FieldLabel>
        <TextField value={editForm.policy_type} onChangeText={(v) => setEditForm({ ...editForm, policy_type: v })} className="mb-3" />
        <FieldLabel>Provider</FieldLabel>
        <TextField value={editForm.provider} onChangeText={(v) => setEditForm({ ...editForm, provider: v })} className="mb-3" />
        <FieldLabel>Coverage</FieldLabel>
        <TextField keyboardType="decimal-pad" value={editForm.coverage_amount} onChangeText={(v) => setEditForm({ ...editForm, coverage_amount: v })} className="mb-3" />
        <FieldLabel>Premium</FieldLabel>
        <TextField keyboardType="decimal-pad" value={editForm.premium_amount} onChangeText={(v) => setEditForm({ ...editForm, premium_amount: v })} className="mb-3" />
        <FieldLabel>Frequency</FieldLabel>
        <TextField value={editForm.premium_frequency} onChangeText={(v) => setEditForm({ ...editForm, premium_frequency: v })} className="mb-3" />
        <FieldLabel>Expiry Date</FieldLabel>
        <TextField value={editForm.expiry_date} onChangeText={(v) => setEditForm({ ...editForm, expiry_date: v })} className="mb-3" />
      </FormModal>

      {/* ── Delete confirm ── */}
      <ConfirmModal
        visible={!!deleteTargetPolicy}
        title="Delete policy?"
        description={`${deleteTargetPolicy?.name ?? ""} will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onCancel={() => setDeleteTargetPolicy(null)}
        onConfirm={handleDelete}
        loading={deletePolicy.isPending}
      />
    </ScreenShell>
  );
}

// ── Shared sub-components (mirrors app/(tabs)/ledger.tsx) ──────────────────────

function SegmentButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className={`flex-1 py-1.5 rounded-full items-center ${active ? "bg-card" : ""}`}>
      <Text
        className={`text-[12.5px] ${active ? "text-foreground" : "text-muted-foreground"}`}
        style={{ fontFamily: active ? "DMSans_700Bold" : "DMSans_500Medium" }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

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
