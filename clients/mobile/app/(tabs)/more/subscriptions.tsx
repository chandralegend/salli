import { AlertTriangle, Plus, RefreshCw, Trash2 } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Card } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { ChipSelect } from "@/components/ui/filter-chip";
import { PageShell } from "@/components/ui/page-shell";
import { ActionButton } from "@/components/ui/action-button";
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
import { useThemeColors } from "@/lib/theme";
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
      <PageShell
        header={
          <ScreenHeader
            title="Subscriptions"
            back
            trailing={
              <Pressable
                onPress={openAdd}
                className="h-11 w-11 items-center justify-center rounded-[11px] border-2 border-foreground bg-card"
              >
                <Plus size={21} color={colors.accent} strokeWidth={2.4} />
              </Pressable>
            }
          />
        }
      >
        {/* hero — monthly recurring cost */}
        <View className="px-4 pt-3">
          <Card className="bg-salli-hero p-[18px]">
            <Text className="mb-1.5 text-[11px] font-mono uppercase tracking-widest text-white/50">
              Monthly Recurring
            </Text>
            <View className="mb-1 flex-row items-baseline gap-1">
              <Text className="font-sans-semibold text-[20px] text-white/40">Rs.</Text>
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
                    "text-[14px] font-sans-semibold",
                    alertCount > 0 ? "text-destructive" : "text-salli-accent",
                  )}
                >
                  {alertCount > 0 ? `${alertCount} alert${alertCount === 1 ? "" : "s"}` : "All healthy"}
                </Text>
              </View>
            </View>
            <View className="flex-row gap-1.5">
              <View className="flex-1 rounded-card bg-white/[0.06] p-2.5">
                <Text className="mb-1 text-[13px] text-white/35">Active</Text>
                <Text className="font-sans-bold text-[15px] text-white">{active.length}</Text>
              </View>
              <View className="flex-1 rounded-card bg-white/[0.06] p-2.5">
                <Text className="mb-1 text-[13px] text-white/35">Annualised</Text>
                <Text className="font-sans-bold text-[15px] text-white">Rs. {formatLKRAbbrev(monthlyTotal * 12)}</Text>
              </View>
              <View className="flex-1 rounded-card bg-white/[0.06] p-2.5">
                <Text className="mb-1 text-[13px] text-white/35">Alerts</Text>
                <Text className={cn("font-sans-bold text-[15px]", alertCount > 0 ? "text-destructive" : "text-white")}>
                  {alertCount}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        <Text className="mb-1.5 mt-3 px-4 pl-[18px] text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
          Active Subscriptions
        </Text>

        <View className="gap-2 px-4">
          {active.length === 0 ? (
            <Card className="items-center p-6">
              <Text className="text-[15px] text-muted-foreground">No subscriptions tracked yet.</Text>
            </Card>
          ) : (
            active.map((s) => {
              const report = reportFor(s.id);
              return (
                <Pressable key={s.id} onPress={() => openEdit(s)}>
                <Card className="p-3.5">
                  <View className="flex-row items-center gap-2.5">
                    <View className="h-9 w-9 items-center justify-center rounded-card bg-foreground/[0.06]">
                      <RefreshCw size={16} color={colors.mutedForeground} strokeWidth={2} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-sans-semibold text-[15px] text-foreground">{s.name}</Text>
                      <Text className="text-[14px] capitalize text-muted-foreground">
                        {s.frequency} · next {s.next_due_date}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="font-sans-semibold text-[15px] text-foreground">Rs. {formatLKR(s.amount, 0)}</Text>
                      <Pressable onPress={() => remove.mutate(s.id)} className="mt-1">
                        <Trash2 size={15} color={colors.mutedForeground} strokeWidth={2} />
                      </Pressable>
                    </View>
                  </View>
                  {report?.alerts.length ? (
                    <View className="mt-2.5 gap-1.5 border-t border-foreground/[0.06] pt-2.5">
                      {report.alerts.map((a, i) => (
                        <View key={i} className="flex-row items-center gap-1.5">
                          <AlertTriangle size={14} color="#EF4444" strokeWidth={2} />
                          <Text className="flex-1 text-[14px] text-destructive">{a.message}</Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View className="mt-2.5 border-t border-foreground/[0.06] pt-2.5">
                      <Text className="text-[14px] text-salli-accent">No alerts</Text>
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
    <Drawer
      visible={visible}
      onClose={onClose}
      title={isEdit ? "Edit Subscription" : "New Subscription"}
      footer={
        <>
          <ActionButton variant="accent" loading={pending} disabled={!canSubmit} onPress={submit}>
            {isEdit ? "Save Changes" : "Add Subscription"}
          </ActionButton>
          {isError ? (
            <Text className="mt-2 text-center text-[14px] text-destructive">
              Could not save subscription. Please try again.
            </Text>
          ) : null}
        </>
      }
    >
      <TextField className="mb-2.5" label="Name *" value={name} onChangeText={setName} placeholder="Netflix" />

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

      <Text className="mb-2 pl-0.5 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
        Billing Cycle *
      </Text>
      <ChipSelect className="mb-1" options={FREQUENCIES} value={frequency} onChange={setFrequency} capitalize />
    </Drawer>
  );
}
