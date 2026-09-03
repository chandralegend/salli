import { Calendar, Plus, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { ActionButton } from "@/components/ui/action-button";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { Hero, Rule, SectionLabel, Strong } from "@/components/ui/blocks";
import { Drawer } from "@/components/ui/drawer";
import { ChipSelect } from "@/components/ui/filter-chip";
import { PageShell } from "@/components/ui/page-shell";
import { ScreenHeader } from "@/components/ui/screen-header";
import { TextField } from "@/components/ui/text-field";
import { useReminderMutations, useReminders, type Reminder, useSyncAlertsOnOpen } from "@/hooks/useReminders";
import { confirmDestructive } from "@/lib/confirm";
import { formatDate } from "@/lib/format";
import { useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

function daysUntil(dateStr: string) {
  return Math.round((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

/** "in 12 days" / "12 days ago" / "today". */
function whenPhrase(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  return days > 0 ? `in ${days} days` : `${Math.abs(days)} days ago`;
}

type Bucket = "overdue" | "dueSoon" | "later" | "done";

function bucketOf(r: Reminder): Bucket {
  if (r.status === "done") return "done";
  const days = daysUntil(r.due_date);
  if (days < 0) return "overdue";
  if (days <= 30) return "dueSoon";
  return "later";
}

/**
 * What needs doing, in one scroll.
 *
 * The three-box Overdue/Due Soon/Upcoming strip is one sentence, and the
 * search box and four filter chips are gone with it. Those chips duplicated
 * the sections they filtered — tapping "Overdue" hid everything except the
 * block already labelled "Overdue" — and one of them, "IRD", was a no-op the
 * code itself documented: every reminder in Salli is an IRD reminder, so the
 * filter behaved exactly as "All".
 *
 * The rows lost two badges each for the same reason. A hardcoded "IRD" chip on
 * every row distinguishes nothing, and a status chip reading "Overdue" inside
 * the section headed "Overdue" is the heading again, in a box.
 */
export default function RemindersScreen() {
  const colors = useThemeColors();
  const reminders = useReminders();
  const { create, markDone, remove, seed } = useReminderMutations();
  // Surfaces budget/subscription/insurance alerts that would otherwise never appear.
  useSyncAlertsOnOpen();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const items = reminders.data ?? [];
  const overdue = items.filter((r) => bucketOf(r) === "overdue");
  const dueSoon = items.filter((r) => bucketOf(r) === "dueSoon");
  const later = items.filter((r) => bucketOf(r) === "later");
  const done = items.filter((r) => bucketOf(r) === "done");

  const Row = ({ r, bucket }: { r: Reminder; bucket: Bucket }) => {
    const isDone = bucket === "done";
    const days = daysUntil(r.due_date);
    return (
      <View
        className={cn(
          "flex-row items-center gap-3 rounded-card border-2 px-3.5 py-3",
          isDone
            ? "border-foreground/25"
            : bucket === "overdue"
              ? "border-salli-accent bg-card"
              : "border-foreground bg-card",
        )}
      >
        <View className="min-w-0 flex-1">
          <Text
            numberOfLines={2}
            className={cn(
              "text-[16px] leading-[21px]",
              isDone ? "text-muted-foreground line-through" : "font-sans-bold text-foreground",
            )}
          >
            {r.kind.replace(/_/g, " ")}
          </Text>
          <Text
            className={cn(
              "mt-0.5 text-[13.5px]",
              bucket === "overdue" ? "font-sans-semibold text-salli-accent" : "text-muted-foreground",
            )}
          >
            {isDone
              ? `Done · was due ${formatDate(r.due_date)}`
              : `${formatDate(r.due_date)} · ${whenPhrase(days)}`}
          </Text>
        </View>
        {!isDone ? (
          <Pressable
            onPress={() => markDone.mutate(r.id)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`Mark ${r.kind} done`}
            className="shrink-0 rounded-badge border-[1.5px] border-foreground bg-card px-2.5 py-1"
          >
            <Text className="font-mono text-[12px] text-foreground">Done</Text>
          </Pressable>
        ) : null}
        {/* Marking done and deleting are different intents — "I did this"
            versus "this shouldn't be here" — so both stay. Delete is
            confirm-gated; mobile's `remove` mutation existed for a while with
            nothing rendering it, so a mistaken reminder was permanent. */}
        <Pressable
          onPress={() =>
            confirmDestructive({
              title: "Delete reminder",
              message: `"${r.kind}" will be removed. This can't be undone.`,
              onConfirm: () => remove.mutate(r.id),
            })
          }
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${r.kind}`}
          className="shrink-0"
        >
          <Trash2 size={16} color={colors.mutedForeground} strokeWidth={2} />
        </Pressable>
      </View>
    );
  };

  const Section = ({ label, data, bucket }: { label: string; data: Reminder[]; bucket: Bucket }) =>
    data.length === 0 ? null : (
      <>
        <Rule />
        <SectionLabel>{label}</SectionLabel>
        <View className="mt-3 gap-[9px] px-5">
          {data.map((r) => (
            <Row key={r.id} r={r} bucket={bucket} />
          ))}
        </View>
      </>
    );

  /** The opening sentence leads with whatever is most urgent. */
  const headline = () => {
    if (overdue.length > 0)
      return (
        <Hero>
          <Strong className="text-salli-accent">
            {overdue.length} reminder{overdue.length === 1 ? " is" : "s are"} overdue
          </Strong>
          .
        </Hero>
      );
    if (dueSoon.length > 0)
      return (
        <Hero>
          <Strong>
            {dueSoon.length} thing{dueSoon.length === 1 ? "" : "s"}
          </Strong>{" "}
          {dueSoon.length === 1 ? "is" : "are"} due this month.
        </Hero>
      );
    return <Hero>Nothing is due this month.</Hero>;
  };

  return (
    <PageShell
      header={
        <ScreenHeader
          title="Reminders"
          back
          trailing={
            <AnimatedPressable
              onPress={() => setDrawerOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="New reminder"
              className="h-11 w-11 items-center justify-center rounded-[11px] border-2 border-foreground bg-card"
            >
              <Plus size={21} color={colors.accent} strokeWidth={2.4} />
            </AnimatedPressable>
          }
        />
      }
    >
      <View className="px-5">
        {items.length === 0 ? (
          <>
            <Hero>Nothing to remember yet.</Hero>
            <Text className="mt-2 text-[16px] leading-[23px] text-muted-foreground">
              Add a deadline, or load the IRD filing calendar for the year and we will keep the
              dates for you.
            </Text>
            <ActionButton className="mt-5" onPress={() => setDrawerOpen(true)}>
              Add a reminder
            </ActionButton>
            <ActionButton
              variant="secondary"
              className="mt-2.5"
              loading={seed.isPending}
              onPress={() => seed.mutate("2025/26")}
            >
              Load the IRD calendar
            </ActionButton>
          </>
        ) : (
          <>
            {headline()}
            <Text className="mt-2 text-[16px] leading-[23px] text-muted-foreground">
              {[
                later.length > 0 ? `${later.length} later` : null,
                done.length > 0 ? `${done.length} done` : null,
              ]
                .filter(Boolean)
                .join(" · ") || "Nothing else on the list."}
            </Text>
          </>
        )}
      </View>

      <Section label="Overdue" data={overdue} bucket="overdue" />
      <Section label="Due this month" data={dueSoon} bucket="dueSoon" />
      <Section label="Later" data={later} bucket="later" />
      <Section label="Done" data={done} bucket="done" />

      {items.length > 0 ? (
        <>
          <Rule />
          <View className="px-5">
            <ActionButton
              variant="secondary"
              loading={seed.isPending}
              onPress={() => seed.mutate("2025/26")}
            >
              Load the IRD calendar
            </ActionButton>
          </View>
        </>
      ) : null}
      <View className="h-7" />

      <NewReminderDrawer
        visible={drawerOpen}
        saving={create.isPending}
        onClose={() => setDrawerOpen(false)}
        onSubmit={async (input) => {
          await create.mutateAsync(input);
          setDrawerOpen(false);
        }}
      />
    </PageShell>
  );
}

const REMINDER_TYPES = ["Tax Filing", "Payment", "Renewal", "Custom"] as const;

type ReminderTypeLabel = (typeof REMINDER_TYPES)[number];

/** Bottom-sheet "New Reminder" form. The backend CreateReminderRequest accepts
 * only { kind, due_date }, so the freeform `kind` carries the title; the Type
 * chip is folded into that string (e.g. "Tax Filing · File IRD Annual Return")
 * so it genuinely persists and round-trips into the list. No repeat/recurrence
 * control is shown because the backend has no recurrence field. */
function NewReminderDrawer({
  visible,
  saving,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  saving: boolean;
  onClose: () => void;
  onSubmit: (input: { kind: string; due_date: string }) => Promise<void>;
}) {
  const colors = useThemeColors();

  const [type, setType] = useState<ReminderTypeLabel>("Tax Filing");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  // Only a full YYYY-MM-DD counts: formatDate would happily render a partial
  // string as a date, which would make a half-typed field look submittable.
  const complete = /^\d{4}-\d{2}-\d{2}$/.test(dueDate);
  const duePreview = complete ? formatDate(dueDate) : "";
  const canSubmit = Boolean(description.trim()) && duePreview !== "—" && complete && !saving;

  const reset = () => {
    setType("Tax Filing");
    setDescription("");
    setDueDate("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const desc = description.trim();
    const kind = type === "Custom" ? desc : `${type} · ${desc}`;
    await onSubmit({ kind, due_date: dueDate });
    reset();
  };

  return (
    <Drawer
      visible={visible}
      onClose={handleClose}
      title="New reminder"
      footer={
        <ActionButton disabled={!canSubmit} loading={saving} onPress={handleSubmit}>
          Add reminder
        </ActionButton>
      }
    >
      <TextField
        label="Description *"
        className="mb-2.5"
        value={description}
        onChangeText={setDescription}
        placeholder="File IRD Annual Return"
        autoFocus
      />

      <TextField
        label="Due date *"
        className="mb-2.5"
        value={dueDate}
        onChangeText={setDueDate}
        placeholder="YYYY-MM-DD"
        keyboardType="numbers-and-punctuation"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={10}
        rightIcon={<Calendar size={18} color={colors.mutedForeground} strokeWidth={2} />}
      />
      <Text className="mb-3 pl-1 text-[14px] text-muted-foreground">
        {duePreview && duePreview !== "—" ? duePreview : "Enter a date as YYYY-MM-DD."}
      </Text>

      <Text className="mb-2 pl-0.5 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
        Type
      </Text>
      <ChipSelect className="mb-4" options={REMINDER_TYPES} value={type} onChange={setType} />
    </Drawer>
  );
}
