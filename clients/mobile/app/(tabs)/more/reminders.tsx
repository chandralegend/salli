import { Calendar } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { ScreenHeader } from "@/components/ui/screen-header";
import { useReminderMutations, useReminders, type Reminder } from "@/hooks/useReminders";
import { cn } from "@/lib/utils";

function daysUntil(dateStr: string) {
  const diff = Math.round((new Date(dateStr).getTime() - Date.now()) / 86400000);
  return diff;
}

function statusMeta(r: Reminder) {
  if (r.status === "done") return { label: "Done", tone: "muted" as const };
  const days = daysUntil(r.due_date);
  if (days < 0) return { label: "Overdue", tone: "strong" as const };
  if (days <= 30) return { label: "Due Soon", tone: "accent" as const };
  return { label: "Upcoming", tone: "muted" as const };
}

export default function RemindersScreen() {
  const reminders = useReminders();
  const { markDone, remove, seed } = useReminderMutations();

  const items = reminders.data ?? [];
  const overdue = items.filter((r) => r.status === "pending" && statusMeta(r).label === "Overdue");
  const dueSoon = items.filter((r) => r.status === "pending" && statusMeta(r).label === "Due Soon");
  const upcoming = items.filter((r) => r.status === "pending" && statusMeta(r).label === "Upcoming");
  const completed = items.filter((r) => r.status === "done");

  const Section = ({ title, data, showDone }: { title: string; data: Reminder[]; showDone?: boolean }) =>
    data.length === 0 ? null : (
      <View className="mb-1">
        <Text className="mb-1.5 pl-0.5 text-[11px] font-sans-semibold uppercase tracking-wide text-foreground/30">
          {title}
        </Text>
        <View className="gap-1.5">
          {data.map((r) => {
            const meta = statusMeta(r);
            return (
              <View
                key={r.id}
                className={cn(
                  "flex-row items-center gap-2.5 rounded-card border p-3",
                  showDone ? "border-foreground/[0.05] opacity-40" : "border-foreground/10",
                  "bg-card",
                )}
              >
                <View
                  className={cn(
                    "h-11 w-[3px] rounded-pill",
                    meta.tone === "strong" ? "bg-foreground" : meta.tone === "accent" ? "bg-salli-accent" : "bg-foreground/15",
                  )}
                />
                <View className="flex-1">
                  <Text className={cn("font-sans-semibold text-[13px] text-foreground", showDone && "line-through")}>
                    {r.kind.replace(/_/g, " ")}
                  </Text>
                  <Text className="mt-0.5 text-[11px] text-foreground/30">
                    {showDone ? `Done · ${r.due_date}` : `Due ${r.due_date}`}
                  </Text>
                  {!showDone ? (
                    <View className="mt-1.5 flex-row gap-1.5">
                      <View
                        className={cn(
                          "rounded-[6px] px-2 py-0.5",
                          meta.tone === "accent" ? "bg-salli-accent/15" : "bg-foreground/10",
                        )}
                      >
                        <Text className={cn("text-[10px] font-sans-semibold", meta.tone === "accent" ? "text-salli-accent" : "text-foreground/50")}>
                          {meta.label}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                </View>
                {!showDone ? (
                  <Pressable onPress={() => markDone.mutate(r.id)} className="rounded-[8px] bg-primary px-2.5 py-1.5">
                    <Text className="font-sans-semibold text-[11px] text-primary-foreground">Done</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>
      </View>
    );

  return (
    <PageShell>
      <ScreenHeader title="Reminders" back />

      <View className="my-3 flex-row gap-2 px-4">
        <Card className="flex-1 items-center p-3">
          <Text className="font-sans-bold text-[22px] text-foreground">{overdue.length}</Text>
          <Text className="mt-1 text-[10px] text-foreground/40">Overdue</Text>
        </Card>
        <Card className="flex-1 items-center p-3">
          <Text className="font-sans-bold text-[22px] text-foreground">{dueSoon.length}</Text>
          <Text className="mt-1 text-[10px] text-foreground/40">Due Soon</Text>
        </Card>
        <Card className="flex-1 items-center p-3">
          <Text className="font-sans-bold text-[22px] text-foreground">{upcoming.length}</Text>
          <Text className="mt-1 text-[10px] text-foreground/30">Upcoming</Text>
        </Card>
      </View>

      <View className="px-4">
        {items.length === 0 ? (
          <Card className="mb-3 items-center gap-3 p-6">
            <Text className="text-center text-[13px] text-foreground/35">No reminders yet.</Text>
            <Pressable
              onPress={() => seed.mutate("2025/26")}
              className="flex-row items-center gap-2 rounded-pill border border-foreground/[0.08] bg-foreground/[0.04] px-4 py-2"
            >
              <Calendar size={13} color="rgba(128,128,128,0.6)" strokeWidth={2} />
              <Text className="text-[12px] text-foreground/40">Seed IRD Filing Calendar</Text>
            </Pressable>
          </Card>
        ) : (
          <>
            <Pressable
              onPress={() => seed.mutate("2025/26")}
              className="mb-3 h-[38px] flex-row items-center justify-center gap-2 rounded-pill border border-foreground/[0.08] bg-foreground/[0.04]"
            >
              <Calendar size={13} color="rgba(128,128,128,0.6)" strokeWidth={2} />
              <Text className="text-[12px] text-foreground/40">Seed IRD Filing Calendar</Text>
            </Pressable>
            <Section title="Overdue" data={overdue} />
            <Section title="Due This Month" data={dueSoon} />
            <Section title="Upcoming" data={upcoming} />
            <Section title="Completed" data={completed} showDone />
          </>
        )}
      </View>
    </PageShell>
  );
}
