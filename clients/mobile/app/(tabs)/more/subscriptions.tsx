import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Modal, ScrollView } from "react-native";
import { Plus, Pencil, Trash2, AlertTriangle, CheckCircle2, X } from "lucide-react-native";
import { ScreenShell, CardContainer, SectionTitle } from "@/components/ui/page-shell";
import { PillButton } from "@/components/ui/pill-button";
import { TextField } from "@/components/ui/text-field";
import {
  useSubscriptions,
  useSubscriptionReports,
  useAddSubscription,
  useUpdateSubscription,
  useDeleteSubscription,
  type Subscription,
} from "@/hooks/useSubscriptions";
import { useThemeColors, useThemeVars } from "@/lib/theme";

const MONO_MEDIUM = { fontFamily: "IBMPlexMono_500Medium" };

function fmt(v: string | number) {
  return Number(v).toLocaleString("en-LK", { minimumFractionDigits: 2 });
}

const EMPTY_FORM = { name: "", amount: "", frequency: "monthly", next_due_date: "" };

export default function SubscriptionsScreen() {
  const theme = useThemeColors();
  const subscriptions = useSubscriptions(false);
  const reports = useSubscriptionReports();
  const addSubscription = useAddSubscription();
  const updateSubscription = useUpdateSubscription();
  const deleteSubscription = useDeleteSubscription();

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editTarget, setEditTarget] = useState<Subscription | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Subscription | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const subscriptionsList = subscriptions.data ?? [];

  async function handleAdd() {
    if (!form.name || !form.amount || !form.next_due_date) return;
    try {
      await addSubscription.mutateAsync({
        name: form.name,
        amount: Number(form.amount),
        frequency: form.frequency,
        next_due_date: form.next_due_date,
      });
      setAddOpen(false);
      setForm(EMPTY_FORM);
      setErrorMessage(null);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Failed to add subscription");
    }
  }

  function openEdit(s: Subscription) {
    setEditTarget(s);
    setEditForm({ name: s.name, amount: s.amount, frequency: s.frequency, next_due_date: s.next_due_date });
  }

  async function handleUpdate() {
    if (!editTarget) return;
    await updateSubscription.mutateAsync({
      id: editTarget.id,
      body: {
        name: editForm.name, amount: Number(editForm.amount),
        frequency: editForm.frequency, next_due_date: editForm.next_due_date,
      },
    });
    setEditTarget(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteSubscription.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }

  return (
    <ScreenShell edges={["left", "right"]}>
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-muted-foreground text-[12.5px] flex-1 pr-3">
          Recurring charges & missed-charge/price-change alerts
        </Text>
        <Pressable
          onPress={() => setAddOpen(true)}
          className="w-9 h-9 rounded-full bg-primary items-center justify-center active:opacity-85"
        >
          <Plus color={theme.primaryForeground} size={18} />
        </Pressable>
      </View>

      <CardContainer className="p-0" style={{ padding: 0, overflow: "hidden" }}>
        {subscriptions.isLoading ? (
          <View className="py-8"><ActivityIndicator color={theme.foreground} /></View>
        ) : subscriptionsList.length === 0 ? (
          <View className="items-center gap-2 py-8">
            <Text className="text-[13px] font-medium text-foreground">No subscriptions tracked yet</Text>
          </View>
        ) : (
          subscriptionsList.map((s, i) => (
            <View
              key={s.id}
              className={`flex-row items-center gap-3 px-5 py-3.5 ${i === subscriptionsList.length - 1 ? "" : "border-b border-border"}`}
            >
              <View className="flex-1 min-w-0">
                <Text className="text-foreground text-[13.5px]" style={{ fontFamily: "DMSans_700Bold" }} numberOfLines={1}>
                  {s.name}
                </Text>
                <View className="flex-row items-center gap-1.5 mt-1 flex-wrap">
                  <Text className="text-muted-foreground text-[11.5px] capitalize" style={MONO_MEDIUM}>
                    {fmt(s.amount)} · {s.frequency}
                  </Text>
                  <View className={`px-1.5 py-0.5 rounded-full ${s.is_active ? "bg-emerald-100" : "bg-muted"}`}>
                    <Text className={`text-[10px] font-bold ${s.is_active ? "text-emerald-700" : "text-muted-foreground"}`}>
                      {s.is_active ? "Active" : "Inactive"}
                    </Text>
                  </View>
                </View>
                <Text className="text-muted-foreground text-[11px] mt-1">Next due {s.next_due_date}</Text>
              </View>
              <Pressable onPress={() => openEdit(s)} className="w-8 h-8 rounded-full items-center justify-center active:bg-muted">
                <Pencil color={theme.mutedForeground} size={15} />
              </Pressable>
              <Pressable onPress={() => setDeleteTarget(s)} className="w-8 h-8 rounded-full items-center justify-center active:bg-muted">
                <Trash2 color={theme.mutedForeground} size={15} />
              </Pressable>
            </View>
          ))
        )}
      </CardContainer>

      {subscriptionsList.length > 0 && (
        <View className="mt-5 gap-3">
          <SectionTitle>Alerts</SectionTitle>
          {reports.isLoading ? (
            <ActivityIndicator color={theme.foreground} />
          ) : (
            (reports.data ?? []).map((r) => (
              <CardContainer key={r.subscription_id} title={r.name}>
                {r.alerts.length === 0 ? (
                  <View className="flex-row items-center gap-2">
                    <CheckCircle2 color="#16A34A" size={16} />
                    <Text className="text-[13px] text-emerald-600">No alerts.</Text>
                  </View>
                ) : (
                  <View className="gap-2">
                    {r.alerts.map((a, i) => (
                      <View key={i} className="flex-row items-start gap-2">
                        <AlertTriangle
                          color={a.kind === "missed_charge" ? "#DC2626" : "#D97706"}
                          size={15}
                          style={{ marginTop: 2 }}
                        />
                        <Text className="text-[13px] text-foreground flex-1">{a.message}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </CardContainer>
            ))
          )}
        </View>
      )}

      {/* ── Add Subscription modal ── */}
      <FormModal
        visible={addOpen}
        title="Add Subscription"
        onClose={() => { setAddOpen(false); setForm(EMPTY_FORM); setErrorMessage(null); }}
        onSubmit={handleAdd}
        submitLabel="Add Subscription"
        submitting={addSubscription.isPending}
        submitDisabled={!form.name || !form.amount || !form.next_due_date}
      >
        <FieldLabel>Name *</FieldLabel>
        <TextField placeholder="e.g. Netflix" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} className="mb-3" />
        <FieldLabel>Amount *</FieldLabel>
        <TextField placeholder="0.00" keyboardType="decimal-pad" value={form.amount} onChangeText={(v) => setForm({ ...form, amount: v })} className="mb-3" />
        <FieldLabel>Frequency</FieldLabel>
        <TextField value={form.frequency} onChangeText={(v) => setForm({ ...form, frequency: v })} className="mb-3" />
        <FieldLabel>Next Due (YYYY-MM-DD) *</FieldLabel>
        <TextField placeholder="2026-08-01" value={form.next_due_date} onChangeText={(v) => setForm({ ...form, next_due_date: v })} className="mb-3" />
        {errorMessage && <Text className="text-destructive text-[12px] mt-1">{errorMessage}</Text>}
      </FormModal>

      {/* ── Edit Subscription modal ── */}
      <FormModal
        visible={!!editTarget}
        title="Edit Subscription"
        onClose={() => setEditTarget(null)}
        onSubmit={handleUpdate}
        submitLabel="Save Changes"
        submitting={updateSubscription.isPending}
        submitDisabled={!editForm.name}
      >
        <FieldLabel>Name</FieldLabel>
        <TextField value={editForm.name} onChangeText={(v) => setEditForm({ ...editForm, name: v })} className="mb-3" />
        <FieldLabel>Amount</FieldLabel>
        <TextField keyboardType="decimal-pad" value={editForm.amount} onChangeText={(v) => setEditForm({ ...editForm, amount: v })} className="mb-3" />
        <FieldLabel>Frequency</FieldLabel>
        <TextField value={editForm.frequency} onChangeText={(v) => setEditForm({ ...editForm, frequency: v })} className="mb-3" />
        <FieldLabel>Next Due</FieldLabel>
        <TextField value={editForm.next_due_date} onChangeText={(v) => setEditForm({ ...editForm, next_due_date: v })} className="mb-3" />
      </FormModal>

      {/* ── Delete confirm ── */}
      <ConfirmModal
        visible={!!deleteTarget}
        title="Delete subscription?"
        description={`${deleteTarget?.name ?? ""} will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleteSubscription.isPending}
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
