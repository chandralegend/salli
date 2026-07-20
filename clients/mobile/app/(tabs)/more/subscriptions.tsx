import { AlertTriangle, Plus, RefreshCw, Trash2, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";

import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { PillButton } from "@/components/ui/pill-button";
import { ScreenHeader } from "@/components/ui/screen-header";
import { TextField } from "@/components/ui/text-field";
import {
  type Subscription,
  useAddSubscription,
  useSubscriptionMutations,
  useSubscriptionReports,
  useSubscriptions,
  useUpdateSubscription,
} from "@/hooks/useSubscriptions";
import { formatLKR, formatLKRAbbrev } from "@/lib/format";
import { useThemeColors, useThemeVars } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** Billing cadences the engine understands (see monthlyEquivalent). Stored lowercase. */
const FREQUENCIES = ["monthly", "annual", "quarterly", "weekly"] as const;

/** Normalises any billing cadence to a monthly-equivalent amount. */
function monthlyEquivalent(amount: number, frequency: string): number {
  const f = frequency.toLowerCase();
  if (f === "annual" || f === "yearly") return amount / 12;
  if (f === "weekly") return (amount * 52) / 12;
  if (f === "quarterly") return amount / 3;
  return amount; // monthly
}

export default function SubscriptionsScreen() {
  const colors = useThemeColors();
  const subscriptions = useSubscriptions();
  const reports = useSubscriptionReports();
  const { remove } = useSubscriptionMutations();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);

  const openAdd = () => {
    setEditing(null);
    setDrawerOpen(true);
  };
  const openEdit = (s: Subscription) => {
    setEditing(s);
    setDrawerOpen(true);
  };

  const reportFor = (id: string) => reports.data?.find((r) => r.subscription_id === id);

  const active = (subscriptions.data ?? []).filter((s) => s.is_active);
  const monthlyTotal = active.reduce((sum, s) => sum + monthlyEquivalent(Number(s.amount), s.frequency), 0);
  const alertCount = (reports.data ?? []).reduce((n, r) => n + r.alerts.length, 0);

  return (
    <View className="flex-1">
      <PageShell>
        <ScreenHeader
          title="Subscriptions"
          back
          trailing={
            <Pressable
              onPress={openAdd}
              className="h-[34px] w-[34px] items-center justify-center rounded-full bg-salli-accent"
            >
              <Plus size={14} color="#FFFFFF" strokeWidth={2.5} />
            </Pressable>
          }
        />

        {/* hero — monthly recurring cost */}
        <View className="px-4 pt-3">
          <Card className="bg-salli-navy-card p-[18px]">
            <Text className="mb-1.5 text-[11px] font-sans-medium uppercase tracking-wide text-white/50">
              Monthly Recurring
            </Text>
            <View className="mb-1 flex-row items-baseline gap-1">
              <Text className="font-sans-semibold text-[18px] text-white/40">Rs.</Text>
              <Text className="font-sans-extrabold text-[40px] leading-none tracking-tighter text-white">
                {formatLKRAbbrev(monthlyTotal)}
              </Text>
            </View>
            <View className="mb-3.5 flex-row">
              <View
                className={cn(
                  "rounded-pill border px-2.5 py-0.5",
                  alertCount > 0
                    ? "border-destructive/25 bg-destructive/10"
                    : "border-salli-accent/20 bg-salli-accent/15",
                )}
              >
                <Text
                  className={cn(
                    "text-[11px] font-sans-semibold",
                    alertCount > 0 ? "text-destructive" : "text-salli-accent",
                  )}
                >
                  {alertCount > 0 ? `${alertCount} alert${alertCount === 1 ? "" : "s"}` : "All healthy"}
                </Text>
              </View>
            </View>
            <View className="flex-row gap-1.5">
              <View className="flex-1 rounded-control bg-white/[0.06] p-2.5">
                <Text className="mb-1 text-[10px] text-white/35">Active</Text>
                <Text className="font-sans-bold text-[13px] text-white">{active.length}</Text>
              </View>
              <View className="flex-1 rounded-control bg-white/[0.06] p-2.5">
                <Text className="mb-1 text-[10px] text-white/35">Annualised</Text>
                <Text className="font-sans-bold text-[13px] text-white">Rs. {formatLKRAbbrev(monthlyTotal * 12)}</Text>
              </View>
              <View className="flex-1 rounded-control bg-white/[0.06] p-2.5">
                <Text className="mb-1 text-[10px] text-white/35">Alerts</Text>
                <Text className={cn("font-sans-bold text-[13px]", alertCount > 0 ? "text-destructive" : "text-white")}>
                  {alertCount}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        <Text className="mb-1.5 mt-3 px-4 pl-[18px] text-[11px] font-sans-semibold uppercase tracking-wide text-foreground/30">
          Active Subscriptions
        </Text>

        <View className="gap-2 px-4">
          {active.length === 0 ? (
            <Card className="items-center p-6">
              <Text className="text-[13px] text-foreground/35">No subscriptions tracked yet.</Text>
            </Card>
          ) : (
            active.map((s) => {
              const report = reportFor(s.id);
              return (
                <Pressable key={s.id} onPress={() => openEdit(s)}>
                <Card className="p-3.5">
                  <View className="flex-row items-center gap-2.5">
                    <View className="h-9 w-9 items-center justify-center rounded-[11px] bg-foreground/[0.06]">
                      <RefreshCw size={14} color={colors.mutedForeground} strokeWidth={2} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-sans-semibold text-[13px] text-foreground">{s.name}</Text>
                      <Text className="text-[11px] capitalize text-foreground/30">
                        {s.frequency} · next {s.next_due_date}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="font-sans-semibold text-[13px] text-foreground">Rs. {formatLKR(s.amount, 0)}</Text>
                      <Pressable onPress={() => remove.mutate(s.id)} className="mt-1">
                        <Trash2 size={13} color={colors.mutedForeground} strokeWidth={2} />
                      </Pressable>
                    </View>
                  </View>
                  {report?.alerts.length ? (
                    <View className="mt-2.5 gap-1.5 border-t border-foreground/[0.06] pt-2.5">
                      {report.alerts.map((a, i) => (
                        <View key={i} className="flex-row items-center gap-1.5">
                          <AlertTriangle size={12} color="#EF4444" strokeWidth={2} />
                          <Text className="flex-1 text-[11px] text-destructive">{a.message}</Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View className="mt-2.5 border-t border-foreground/[0.06] pt-2.5">
                      <Text className="text-[11px] text-salli-accent">No alerts</Text>
                    </View>
                  )}
                </Card>
                </Pressable>
              );
            })
          )}
        </View>
      </PageShell>

      <AddEditSubscriptionDrawer
        visible={drawerOpen}
        subscription={editing}
        onClose={() => setDrawerOpen(false)}
      />
    </View>
  );
}

/** Bottom-sheet used for both adding a new subscription and editing an existing
 * one (prefilled when `subscription` is passed). Sends only fields the backend
 * accepts: name, amount, frequency, next_due_date. */
function AddEditSubscriptionDrawer({
  visible,
  subscription,
  onClose,
}: {
  visible: boolean;
  subscription: Subscription | null;
  onClose: () => void;
}) {
  const colors = useThemeColors();
  const themeVars = useThemeVars();
  const add = useAddSubscription();
  const update = useUpdateSubscription();

  const isEdit = Boolean(subscription);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<(typeof FREQUENCIES)[number]>("monthly");
  const [nextDue, setNextDue] = useState("");

  // Re-seed the form whenever the sheet opens (prefill on edit, blank on add).
  useEffect(() => {
    if (!visible) return;
    if (subscription) {
      const f = subscription.frequency.toLowerCase();
      setName(subscription.name);
      setAmount(String(subscription.amount));
      setFrequency((FREQUENCIES as readonly string[]).includes(f) ? (f as (typeof FREQUENCIES)[number]) : "monthly");
      setNextDue(subscription.next_due_date);
    } else {
      setName("");
      setAmount("");
      setFrequency("monthly");
      setNextDue("");
    }
  }, [visible, subscription]);

  const amountNum = Number(amount) || 0;
  const canSubmit = Boolean(name.trim() && amount && amountNum > 0 && nextDue.trim());
  const pending = add.isPending || update.isPending;
  const isError = add.isError || update.isError;

  const submit = () => {
    if (!canSubmit) return;
    if (subscription) {
      update.mutate(
        {
          id: subscription.id,
          body: { name: name.trim(), amount: amountNum, frequency, next_due_date: nextDue.trim() },
        },
        { onSuccess: onClose },
      );
    } else {
      add.mutate(
        { name: name.trim(), amount: amountNum, frequency, next_due_date: nextDue.trim() },
        { onSuccess: onClose },
      );
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Pressable
            onPress={() => {}}
            style={themeVars}
            className="max-h-[88%] rounded-t-[28px] border-t border-foreground/10 bg-background px-4 pb-8 pt-2.5"
          >
            <View className="items-center pb-1">
              <View className="h-1 w-10 rounded-full bg-foreground/20" />
            </View>
            <View className="flex-row items-center px-0.5 pb-3.5 pt-1.5">
              <Text className="flex-1 font-sans-bold text-[18px] text-foreground">
                {isEdit ? "Edit Subscription" : "New Subscription"}
              </Text>
              <Pressable
                onPress={onClose}
                className="h-[30px] w-[30px] items-center justify-center rounded-full bg-foreground/[0.08]"
              >
                <X size={14} color={colors.mutedForeground} strokeWidth={2} />
              </Pressable>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              <TextField
                className="mb-2.5"
                label="Name *"
                value={name}
                onChangeText={setName}
                placeholder="Netflix"
              />

              <View className="mb-3 flex-row gap-2">
                <TextField
                  className="flex-1"
                  label="Amount *"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  placeholder="0"
                />
                <TextField
                  className="flex-1"
                  label="Next Due *"
                  value={nextDue}
                  onChangeText={setNextDue}
                  autoCapitalize="none"
                  placeholder="2026-08-01"
                />
              </View>

              {/* billing cadence chips */}
              <Text className="mb-2 pl-0.5 text-[10px] font-sans-medium uppercase tracking-wide text-foreground/40">
                Billing Cycle *
              </Text>
              <View className="mb-4 flex-row flex-wrap gap-1.5">
                {FREQUENCIES.map((f) => (
                  <Pressable
                    key={f}
                    onPress={() => setFrequency(f)}
                    className={cn(
                      "rounded-pill px-3.5 py-1.5",
                      frequency === f ? "bg-salli-accent" : "border border-foreground/10 bg-card",
                    )}
                  >
                    <Text
                      className={cn(
                        "text-[12px] capitalize",
                        frequency === f ? "font-sans-semibold text-white" : "font-sans-medium text-foreground/50",
                      )}
                    >
                      {f}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <PillButton variant="accent" loading={pending} disabled={!canSubmit} onPress={submit}>
                {isEdit ? "Save Changes" : "Add Subscription"}
              </PillButton>
              {isError ? (
                <Text className="mt-2 text-center text-[11px] text-destructive">
                  Could not save subscription. Please try again.
                </Text>
              ) : null}
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}
