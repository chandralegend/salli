import {
  Calendar,
  Check,
  Trash2,
  ChevronRight,
  Plus,
  Search,
} from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { Drawer } from "@/components/ui/drawer";
import { ChipSelect, FilterChip } from "@/components/ui/filter-chip";
import { PageShell } from "@/components/ui/page-shell";
import { ActionButton } from "@/components/ui/action-button";
import { ScreenHeader } from "@/components/ui/screen-header";
import { TextField } from "@/components/ui/text-field";
import { useReminderMutations, useReminders, type Reminder, useSyncAlertsOnOpen } from "@/hooks/useReminders";
import { confirmDestructive } from "@/lib/confirm";
import { useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

const FILTERS = ["All", "Overdue", "Due Soon", "IRD"] as const;

function daysUntil(dateStr: string) {
  return Math.round((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

/** Format a valid YYYY-MM-DD string as "30 Sep 2026"; empty string otherwise. */
function formatDueDate(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

type RowKind = "overdue" | "dueSoon" | "upcoming" | "completed";

function statusMeta(r: Reminder) {
  if (r.status === "done") return { label: "Done", tone: "muted" as const };
  const days = daysUntil(r.due_date);
  if (days < 0) return { label: "Overdue", tone: "strong" as const };
  if (days <= 30) return { label: "Due Soon", tone: "accent" as const };
  return { label: "Upcoming", tone: "muted" as const };
}

export default function RemindersScreen() {
  const colors = useThemeColors();
  const reminders = useReminders();
  const { create, markDone, remove, seed } = useReminderMutations();
  // Surfaces budget/subscription/insurance alerts that would otherwise never appear.
  useSyncAlertsOnOpen();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const q = search.trim().toLowerCase();
  const items = (reminders.data ?? []).filter(
    (r) => !q || r.kind.replace(/_/g, " ").toLowerCase().includes(q),
  );
  const overdue = items.filter((r) => r.status === "pending" && statusMeta(r).label === "Overdue");
  const dueSoon = items.filter((r) => r.status === "pending" && statusMeta(r).label === "Due Soon");
  const upcoming = items.filter((r) => r.status === "pending" && statusMeta(r).label === "Upcoming");
  const completed = items.filter((r) => r.status === "done");

  // Every reminder in Salli is an IRD filing reminder, so "IRD" behaves as "All".
  const showOverdue = filter === "All" || filter === "IRD" || filter === "Overdue";
  const showDueSoon = filter === "All" || filter === "IRD" || filter === "Due Soon";
  const showUpcoming = filter === "All" || filter === "IRD";
  const showCompleted = filter === "All" || filter === "IRD";

  const Row = ({ r, kind }: { r: Reminder; kind: RowKind }) => {
    const done = kind === "completed";
    const rail =
      kind === "overdue"
        ? "bg-foreground"
        : kind === "dueSoon"
          ? "bg-salli-accent"
          : kind === "completed"
            ? "bg-foreground/20"
            : "bg-foreground/15";
    const border =
      kind === "overdue"
        ? "border-foreground/10"
        : kind === "dueSoon"
          ? "border-foreground/[0.08]"
          : kind === "completed"
            ? "border-foreground/[0.05]"
            : "border-foreground/[0.06]";
    const subtitle = done
      ? `Done · ${r.due_date}`
      : kind === "overdue"
        ? `Was due ${r.due_date}`
        : `Due ${r.due_date} · ${Math.abs(daysUntil(r.due_date))} days`;

    return (
      <View
        className={cn(
          "flex-row gap-2.5 rounded-card border bg-card p-3",
          done ? "items-center opacity-40" : "items-start",
          border,
        )}
      >
        <View className={cn("w-[3px] rounded-pill", done ? "h-8" : "mt-0.5 h-11", rail)} />
        <View className="flex-1">
          <Text
            className={cn(
              "font-sans-semibold text-[15px]",
              done ? "text-foreground/60 line-through" : "text-foreground",
            )}
          >
            {r.kind.replace(/_/g, " ")}
          </Text>
          <Text className={cn("mt-0.5 text-[14px]", done ? "text-muted-foreground" : "text-muted-foreground")}>
            {subtitle}
          </Text>
          {!done ? (
            <View className="mt-1.5 flex-row gap-1.5">
              <View
                className={cn(
                  "rounded-badge border-[1.5px] border-foreground px-2.5 py-0.5",
                  kind === "dueSoon"
                    ? "bg-salli-accent/15"
                    : kind === "overdue"
                      ? "bg-foreground/10"
                      : "bg-foreground/[0.06]",
                )}
              >
                <Text
                  className={cn(
                    "text-[13px] font-sans-semibold",
                    kind === "dueSoon"
                      ? "text-salli-accent"
                      : kind === "overdue"
                        ? "text-foreground/60"
                        : "text-muted-foreground",
                  )}
                >
                  {statusMeta(r).label}
                </Text>
              </View>
              <View className="rounded-badge border-[1.5px] border-foreground bg-foreground/[0.06] px-2.5 py-0.5">
                <Text className="text-[13px] font-sans-medium text-muted-foreground">IRD</Text>
              </View>
            </View>
          ) : null}
        </View>
        <View className="flex-row items-center gap-2.5">
          {kind === "overdue" ? (
            <Pressable onPress={() => markDone.mutate(r.id)} className="rounded-card bg-primary px-2.5 py-1.5">
              <Text className="font-sans-semibold text-[14px] text-primary-foreground">Done</Text>
            </Pressable>
          ) : kind === "dueSoon" ? (
            <Pressable
              onPress={() => markDone.mutate(r.id)}
              className="rounded-card border border-foreground/10 bg-foreground/[0.06] px-2.5 py-1.5"
            >
              <Text className="font-sans-semibold text-[14px] text-foreground/50">Done</Text>
            </Pressable>
          ) : kind === "upcoming" ? (
            <ChevronRight size={15} color={colors.mutedForeground} strokeWidth={2} />
          ) : (
            <Check size={18} color={colors.mutedForeground} strokeWidth={2.5} />
          )}
          {/* Web has had delete all along; mobile's `remove` mutation existed
              and nothing rendered it, so a reminder created by mistake was
              permanent. Marking done and deleting are different intents —
              "I did this" versus "this shouldn't be here". */}
          <Pressable
            onPress={() =>
              confirmDestructive({
                title: "Delete reminder",
                message: `"${r.kind}" will be removed. This can't be undone.`,
                onConfirm: async () => {
                  await remove.mutateAsync(r.id);
                },
              })
            }
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${r.kind}`}
          >
            <Trash2 size={15} color={colors.mutedForeground} strokeWidth={2} />
          </Pressable>
        </View>
      </View>
    );
  };

  const Section = ({ title, data, kind }: { title: string; data: Reminder[]; kind: RowKind }) =>
    data.length === 0 ? null : (
      <View className="mb-1">
        <Text className="mb-1.5 pl-0.5 text-[14px] font-sans-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </Text>
        <View className="gap-1.5">
          {data.map((r) => (
            <Row key={r.id} r={r} kind={kind} />
          ))}
        </View>
      </View>
    );

  return (
    <PageShell
      header={
        <ScreenHeader
          title="Reminders"
          back
          trailing={
            <Pressable
              onPress={() => setDrawerOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="New reminder"
              className="h-11 w-11 items-center justify-center rounded-full border-2 border-foreground bg-salli-accent"
            >
              <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
            </Pressable>
          }
        />
      }
    >
      <View className="my-3 flex-row gap-2 px-4">
        <View className="flex-1 items-center rounded-card border-2 border-foreground bg-card px-2.5 py-3">
          <Text className="font-sans-bold text-[26px] leading-none text-foreground">{overdue.length}</Text>
          <Text className="mt-1 text-[13px] font-sans-medium text-muted-foreground">Overdue</Text>
        </View>
        <View className="flex-1 items-center rounded-card border-2 border-foreground bg-card px-2.5 py-3">
          <Text className="font-sans-bold text-[26px] leading-none text-foreground">{dueSoon.length}</Text>
          <Text className="mt-1 text-[13px] font-sans-medium text-muted-foreground">Due Soon</Text>
        </View>
        <View className="flex-1 items-center rounded-card border-2 border-foreground bg-card px-2.5 py-3">
          <Text className="font-sans-bold text-[26px] leading-none text-foreground">{upcoming.length}</Text>
          <Text className="mt-1 text-[13px] font-sans-medium text-muted-foreground">Upcoming</Text>
        </View>
      </View>

      <View className="mb-2 flex-row items-center gap-2 px-4">
        <View className="h-[38px] flex-1 flex-row items-center gap-2 rounded-card border-2 border-foreground bg-card px-3">
          <Search size={15} color="rgba(128,128,128,0.4)" strokeWidth={2} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search..."
            placeholderTextColor="rgba(128,128,128,0.4)"
            className="flex-1 text-[15px] text-foreground"
          />
        </View>
      </View>

      <View className="mb-2 flex-row gap-1.5 px-4">
        {FILTERS.map((f) => (
          <FilterChip key={f} label={f} active={filter === f} onPress={() => setFilter(f)} />
        ))}
      </View>

      <View className="px-4">
        {items.length === 0 ? (
          <View className="mb-3 items-center gap-3 rounded-card border-2 border-foreground bg-card p-6">
            <Text className="text-center text-[15px] text-muted-foreground">No reminders yet.</Text>
            <Pressable
              onPress={() => seed.mutate("2025/26")}
              className="flex-row items-center gap-2 rounded-pill border border-foreground/[0.08] bg-foreground/[0.04] px-4 py-2"
            >
              <Calendar size={15} color="rgba(128,128,128,0.6)" strokeWidth={2} />
              <Text className="text-[15px] text-muted-foreground">Seed IRD Filing Calendar</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Pressable
              onPress={() => seed.mutate("2025/26")}
              className="mb-2.5 h-[38px] flex-row items-center justify-center gap-2 rounded-pill border border-foreground/[0.08] bg-foreground/[0.04]"
            >
              <Calendar size={15} color="rgba(128,128,128,0.6)" strokeWidth={2} />
              <Text className="text-[15px] text-muted-foreground">Seed IRD Filing Calendar</Text>
            </Pressable>
            {showOverdue ? <Section title="Overdue" data={overdue} kind="overdue" /> : null}
            {showDueSoon ? <Section title="Due This Month" data={dueSoon} kind="dueSoon" /> : null}
            {showUpcoming ? <Section title="Upcoming" data={upcoming} kind="upcoming" /> : null}
            {showCompleted ? <Section title="Completed" data={completed} kind="completed" /> : null}
            {(showOverdue ? overdue.length : 0) +
              (showDueSoon ? dueSoon.length : 0) +
              (showUpcoming ? upcoming.length : 0) +
              (showCompleted ? completed.length : 0) ===
            0 ? (
              <View className="items-center rounded-card border-2 border-foreground bg-card p-6">
                <Text className="text-center text-[15px] text-muted-foreground">
                  No reminders match {q ? `“${search}”` : `the ${filter} filter`}.
                </Text>
              </View>
            ) : null}
          </>
        )}
      </View>

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

  const duePreview = formatDueDate(dueDate);
  const canSubmit = Boolean(description.trim()) && duePreview !== "" && !saving;

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
      title="New Reminder"
      footer={
        <ActionButton disabled={!canSubmit} loading={saving} onPress={handleSubmit}>
          Add Reminder
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
                label="Due Date *"
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
                {duePreview ? duePreview : "Enter a date as YYYY-MM-DD."}
              </Text>

              <Text className="mb-2 pl-0.5 text-[13px] font-sans-medium uppercase tracking-wide text-muted-foreground">
                Type
              </Text>
              <ChipSelect className="mb-4" options={REMINDER_TYPES} value={type} onChange={setType} />
    </Drawer>
  );
}
