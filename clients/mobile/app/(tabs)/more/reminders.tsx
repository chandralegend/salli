import { ArrowUpDown, Calendar, Check, ChevronRight, Plus, Search } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { PageShell } from "@/components/ui/page-shell";
import { ScreenHeader } from "@/components/ui/screen-header";
import { useReminderMutations, useReminders, type Reminder } from "@/hooks/useReminders";
import { useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

const FILTERS = ["All", "Overdue", "Due Soon", "IRD"] as const;

function daysUntil(dateStr: string) {
  return Math.round((new Date(dateStr).getTime() - Date.now()) / 86400000);
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
  const { markDone, seed } = useReminderMutations();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [search, setSearch] = useState("");

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
          "flex-row gap-2.5 rounded-control border bg-card p-3",
          done ? "items-center opacity-40" : "items-start",
          border,
        )}
      >
        <View className={cn("w-[3px] rounded-pill", done ? "h-8" : "mt-0.5 h-11", rail)} />
        <View className="flex-1">
          <Text
            className={cn(
              "font-sans-semibold text-[13px]",
              done ? "text-foreground/60 line-through" : "text-foreground",
            )}
          >
            {r.kind.replace(/_/g, " ")}
          </Text>
          <Text className={cn("mt-0.5 text-[11px]", done ? "text-foreground/25" : "text-foreground/30")}>
            {subtitle}
          </Text>
          {!done ? (
            <View className="mt-1.5 flex-row gap-1.5">
              <View
                className={cn(
                  "rounded-[6px] px-2.5 py-0.5",
                  kind === "dueSoon"
                    ? "bg-salli-accent/15"
                    : kind === "overdue"
                      ? "bg-foreground/10"
                      : "bg-foreground/[0.06]",
                )}
              >
                <Text
                  className={cn(
                    "text-[10px] font-sans-semibold",
                    kind === "dueSoon"
                      ? "text-salli-accent"
                      : kind === "overdue"
                        ? "text-foreground/60"
                        : "text-foreground/30",
                  )}
                >
                  {statusMeta(r).label}
                </Text>
              </View>
              <View className="rounded-[6px] bg-foreground/[0.06] px-2.5 py-0.5">
                <Text className="text-[10px] font-sans-medium text-foreground/35">IRD</Text>
              </View>
            </View>
          ) : null}
        </View>
        {kind === "overdue" ? (
          <Pressable onPress={() => markDone.mutate(r.id)} className="rounded-[8px] bg-primary px-2.5 py-1.5">
            <Text className="font-sans-semibold text-[11px] text-primary-foreground">Done</Text>
          </Pressable>
        ) : kind === "dueSoon" ? (
          <Pressable
            onPress={() => markDone.mutate(r.id)}
            className="rounded-[8px] border border-foreground/10 bg-foreground/[0.06] px-2.5 py-1.5"
          >
            <Text className="font-sans-semibold text-[11px] text-foreground/50">Snooze</Text>
          </Pressable>
        ) : kind === "upcoming" ? (
          <ChevronRight size={13} color={colors.mutedForeground} strokeWidth={2} />
        ) : (
          <Check size={16} color={colors.mutedForeground} strokeWidth={2.5} />
        )}
      </View>
    );
  };

  const Section = ({ title, data, kind }: { title: string; data: Reminder[]; kind: RowKind }) =>
    data.length === 0 ? null : (
      <View className="mb-1">
        <Text className="mb-1.5 pl-0.5 text-[11px] font-sans-semibold uppercase tracking-wide text-foreground/30">
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
    <PageShell>
      <ScreenHeader
        title="Reminders"
        back
        trailing={
          <Pressable className="h-[34px] w-[34px] items-center justify-center rounded-full bg-salli-accent">
            <Plus size={14} color="#FFFFFF" strokeWidth={2.5} />
          </Pressable>
        }
      />

      <View className="my-3 flex-row gap-2 px-4">
        <View className="flex-1 items-center rounded-[16px] border border-foreground/15 bg-card px-2.5 py-3">
          <Text className="font-sans-bold text-[22px] leading-none text-foreground">{overdue.length}</Text>
          <Text className="mt-1 text-[10px] font-sans-medium text-foreground/40">Overdue</Text>
        </View>
        <View className="flex-1 items-center rounded-[16px] border border-foreground/[0.08] bg-card px-2.5 py-3">
          <Text className="font-sans-bold text-[22px] leading-none text-foreground">{dueSoon.length}</Text>
          <Text className="mt-1 text-[10px] font-sans-medium text-foreground/40">Due Soon</Text>
        </View>
        <View className="flex-1 items-center rounded-[16px] border border-foreground/[0.08] bg-card px-2.5 py-3">
          <Text className="font-sans-bold text-[22px] leading-none text-foreground">{upcoming.length}</Text>
          <Text className="mt-1 text-[10px] font-sans-medium text-foreground/30">Upcoming</Text>
        </View>
      </View>

      <View className="mb-2 flex-row items-center gap-2 px-4">
        <View className="h-[38px] flex-1 flex-row items-center gap-2 rounded-[10px] border border-foreground/[0.08] bg-card px-3">
          <Search size={13} color="rgba(128,128,128,0.4)" strokeWidth={2} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search..."
            placeholderTextColor="rgba(128,128,128,0.4)"
            className="flex-1 text-[13px] text-foreground"
          />
        </View>
        <View className="h-[38px] flex-row items-center gap-1.5 rounded-[10px] border border-foreground/[0.08] bg-card px-3">
          <ArrowUpDown size={13} color="rgba(128,128,128,0.5)" strokeWidth={2} />
          <Text className="text-[12px] font-sans-medium text-foreground/40">Date</Text>
        </View>
      </View>

      <View className="mb-2 flex-row gap-1.5 px-4">
        {FILTERS.map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            className={cn(
              "rounded-pill px-3.5 py-1",
              filter === f ? "bg-salli-accent" : "border border-foreground/[0.08] bg-card",
            )}
          >
            <Text
              className={cn(
                "text-[12px]",
                filter === f ? "font-sans-semibold text-white" : "font-sans-medium text-foreground/40",
              )}
            >
              {f}
            </Text>
          </Pressable>
        ))}
      </View>

      <View className="px-4">
        {items.length === 0 ? (
          <View className="mb-3 items-center gap-3 rounded-card border border-foreground/10 bg-card p-6">
            <Text className="text-center text-[13px] text-foreground/35">No reminders yet.</Text>
            <Pressable
              onPress={() => seed.mutate("2025/26")}
              className="flex-row items-center gap-2 rounded-pill border border-foreground/[0.08] bg-foreground/[0.04] px-4 py-2"
            >
              <Calendar size={13} color="rgba(128,128,128,0.6)" strokeWidth={2} />
              <Text className="text-[12px] text-foreground/40">Seed IRD Filing Calendar</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Pressable
              onPress={() => seed.mutate("2025/26")}
              className="mb-2.5 h-[38px] flex-row items-center justify-center gap-2 rounded-pill border border-foreground/[0.08] bg-foreground/[0.04]"
            >
              <Calendar size={13} color="rgba(128,128,128,0.6)" strokeWidth={2} />
              <Text className="text-[12px] text-foreground/40">Seed IRD Filing Calendar</Text>
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
              <View className="items-center rounded-card border border-foreground/[0.08] bg-card p-6">
                <Text className="text-center text-[13px] text-foreground/35">
                  No reminders match {q ? `“${search}”` : `the ${filter} filter`}.
                </Text>
              </View>
            ) : null}
          </>
        )}
      </View>
    </PageShell>
  );
}
