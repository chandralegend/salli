import { Plus, Trash2 } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { ActionButton } from "@/components/ui/action-button";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { Hero, Rule, SectionLabel, Strong } from "@/components/ui/blocks";
import { Card } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { ChipSelect } from "@/components/ui/filter-chip";
import { PageShell } from "@/components/ui/page-shell";
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
import { confirmDestructive } from "@/lib/confirm";
import { formatDate, formatLKR, formatLKRAbbrev } from "@/lib/format";
import { useHardShadow, useThemeColors } from "@/lib/theme";

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

/**
 * What renews, and what it costs a month.
 *
 * The dark hero card said the monthly total as a 40px number and then said the
 * alert count twice — once as a chip and again as one of three tiles beneath it,
 * alongside an "Annualised" tile that was the headline figure times twelve.
 * One sentence carries all of it.
 *
 * Each row also used to end in a bordered footer reading "No alerts" in accent
 * — a line whose only content was that there was nothing to say, coloured as if
 * there were. Rows are quiet now unless something is actually wrong.
 */
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

  const all = subscriptions.data ?? [];
  const active = all.filter((s) => s.is_active);
  const cancelled = all.filter((s) => !s.is_active);
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
              <AnimatedPressable
                onPress={openAdd}
                accessibilityRole="button"
                accessibilityLabel="Add a subscription"
                className="h-11 w-11 items-center justify-center rounded-[11px] border-2 border-foreground bg-card"
              >
                <Plus size={21} color={colors.accent} strokeWidth={2.4} />
              </AnimatedPressable>
            }
          />
        }
      >
        <View className="px-5">
          {active.length === 0 ? (
            <>
              <Hero>Nothing recurring is tracked yet.</Hero>
              <Text className="mt-2 text-[16px] leading-[23px] text-muted-foreground">
                Add what renews — streaming, insurance, a gym — and we will total it, watch for
                price rises, and tell you when a charge goes missing.
              </Text>
              <ActionButton className="mt-5" onPress={openAdd}>
                Add a subscription
              </ActionButton>
            </>
          ) : (
            <>
              <Hero>
                You spend <Strong>Rs. {formatLKRAbbrev(monthlyTotal)}</Strong> a month on{" "}
                {active.length} subscription{active.length === 1 ? "" : "s"}.
              </Hero>
              <Text
                className={`mt-2 text-[16px] leading-[23px] ${
                  alertCount > 0 ? "font-sans-semibold text-destructive" : "text-muted-foreground"
                }`}
              >
                Rs. {formatLKRAbbrev(monthlyTotal * 12)} a year.
                {alertCount > 0
                  ? ` ${alertCount} need${alertCount === 1 ? "s" : ""} a look.`
                  : ""}
              </Text>
            </>
          )}
        </View>

        {active.length > 0 ? (
          <>
            <Rule />
            <SectionLabel>Recurring</SectionLabel>
            <View className="mt-3 gap-[9px] px-5">
              {active.map((s) => {
                const alerts = reportFor(s.id)?.alerts ?? [];
                return (
                  <AnimatedPressable
                    key={s.id}
                    onPress={() => openEdit(s)}
                    press="sink"
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${s.name}`}
                    className={`rounded-card border-2 bg-card px-3.5 py-3 ${
                      alerts.length > 0 ? "border-destructive" : "border-foreground"
                    }`}
                  >
                    <View className="flex-row items-center gap-2.5">
                      <View className="min-w-0 flex-1">
                        <Text numberOfLines={1} className="font-sans-bold text-[16px] text-foreground">
                          {s.name}
                        </Text>
                        <Text className="mt-0.5 text-[13.5px] capitalize text-muted-foreground">
                          {s.frequency} · next {formatDate(s.next_due_date)}
                        </Text>
                      </View>
                      <Text className="shrink-0 font-sans-extrabold text-[15px] text-foreground">
                        Rs. {formatLKR(s.amount, 0)}
                      </Text>
                    </View>
                    {alerts.length > 0 ? (
                      <View className="mt-2.5 gap-1 border-t border-destructive/40 pt-2.5">
                        {alerts.map((a, i) => (
                          <Text key={i} className="text-[13.5px] leading-[19px] text-destructive">
                            {a.message}
                          </Text>
                        ))}
                      </View>
                    ) : null}
                  </AnimatedPressable>
                );
              })}
            </View>
          </>
        ) : null}

        {cancelled.length > 0 ? (
          <>
            <Rule />
            {/* These were invisible before: the list rendered only `is_active`
                subscriptions, so a cancelled one could not be seen or edited
                anywhere in the app. */}
            <SectionLabel>Cancelled</SectionLabel>
            <View className="mt-3 gap-[9px] px-5">
              {cancelled.map((s) => (
                <AnimatedPressable
                  key={s.id}
                  onPress={() => openEdit(s)}
                  press="sink"
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${s.name}`}
                  className="flex-row items-center gap-2.5 rounded-card border-2 border-foreground/25 px-3.5 py-3"
                >
                  <Text numberOfLines={1} className="min-w-0 flex-1 text-[16px] text-muted-foreground">
                    {s.name}
                  </Text>
                  <Text className="shrink-0 text-[13.5px] text-muted-foreground">
                    Rs. {formatLKR(s.amount, 0)}
                  </Text>
                </AnimatedPressable>
              ))}
            </View>
          </>
        ) : null}
        <View className="h-7" />
      </PageShell>

      <AddEditSubscriptionDrawer
        visible={drawerOpen}
        subscription={editing}
        onClose={() => setDrawerOpen(false)}
        onDelete={(s) =>
          confirmDestructive({
            title: "Delete subscription",
            message: `"${s.name}" will be removed permanently.`,
            onConfirm: () => {
              remove.mutate(s.id);
              setDrawerOpen(false);
            },
          })
        }
        deleting={remove.isPending}
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
  onDelete,
  deleting,
}: {
  visible: boolean;
  subscription: Subscription | null;
  onClose: () => void;
  onDelete: (s: Subscription) => void;
  deleting: boolean;
}) {
  const add = useAddSubscription();
  const update = useUpdateSubscription();
  const shadow = useHardShadow();

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
      title={isEdit ? "Edit subscription" : "New subscription"}
      footer={
        <>
          <ActionButton variant="accent" loading={pending} disabled={!canSubmit} onPress={submit}>
            {isEdit ? "Save changes" : "Add subscription"}
          </ActionButton>
          {/* Delete lives here, behind a confirm. It used to be a 15px bin icon
              on every row that fired the mutation on the first tap. */}
          {isEdit && subscription ? (
            <Pressable
              onPress={() => onDelete(subscription)}
              disabled={deleting}
              style={shadow}
              className="mt-2.5 h-12 flex-row items-center justify-center gap-2 rounded-card border-2 border-destructive bg-card"
            >
              <Trash2 size={17} color="#EF4444" strokeWidth={2} />
              <Text className="font-sans-bold text-[16px] text-destructive">
                {deleting ? "Deleting…" : "Delete subscription"}
              </Text>
            </Pressable>
          ) : null}
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
          label="Next due *"
          value={nextDue}
          onChangeText={setNextDue}
          autoCapitalize="none"
          placeholder="2026-08-01"
        />
      </View>

      <Text className="mb-2 pl-0.5 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
        Billing cycle *
      </Text>
      <ChipSelect className="mb-1" options={FREQUENCIES} value={frequency} onChange={setFrequency} capitalize />
    </Drawer>
  );
}
