import { ShieldCheck } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { ScreenHeader } from "@/components/ui/screen-header";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

const FILTERS = ["All", "Approved", "Denied"] as const;

/** Renders a tool-call params object as compact key/value rows. */
function ParamRows({ params }: { params: Record<string, unknown> }) {
  const entries = Object.entries(params ?? {});
  if (entries.length === 0) return null;
  return (
    <View className="mt-2 gap-1 border-t border-foreground/[0.06] pt-2">
      {entries.map(([key, value]) => (
        <View key={key} className="flex-row justify-between gap-3">
          <Text className="text-[14px] capitalize text-foreground/35">{key.replace(/_/g, " ")}</Text>
          <Text numberOfLines={1} className="flex-1 text-right text-[14px] text-foreground/55">
            {typeof value === "object" ? JSON.stringify(value) : String(value)}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function AuditLogScreen() {
  const colors = useThemeColors();
  const entries = useAuditLog();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

  const all = entries.data ?? [];
  const approved = all.filter((e) => e.decision === "approved").length;
  const denied = all.filter((e) => e.decision === "denied").length;
  const visible = all.filter((e) =>
    filter === "All" ? true : filter === "Approved" ? e.decision === "approved" : e.decision === "denied",
  );

  return (
    <PageShell header={<ScreenHeader title="Audit Log" back />}>
      {/* summary strip */}
      <View className="mt-3 flex-row gap-2 px-4">
        <View className="flex-1 items-center rounded-[10px] border border-foreground/[0.08] bg-card px-2.5 py-3">
          <Text className="font-sans-bold text-[26px] leading-none text-foreground">{all.length}</Text>
          <Text className="mt-1 text-[13px] font-sans-medium text-foreground/40">Total</Text>
        </View>
        <View className="flex-1 items-center rounded-[10px] border border-foreground/[0.08] bg-card px-2.5 py-3">
          <Text className="font-sans-bold text-[26px] leading-none text-salli-accent">{approved}</Text>
          <Text className="mt-1 text-[13px] font-sans-medium text-foreground/40">Approved</Text>
        </View>
        <View className="flex-1 items-center rounded-[10px] border border-foreground/[0.08] bg-card px-2.5 py-3">
          <Text className={cn("font-sans-bold text-[26px] leading-none", denied > 0 ? "text-destructive" : "text-foreground")}>
            {denied}
          </Text>
          <Text className="mt-1 text-[13px] font-sans-medium text-foreground/40">Denied</Text>
        </View>
      </View>

      <View className="mb-1 mt-2.5 flex-row gap-1.5 px-4">
        {FILTERS.map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            className={cn(
              "rounded-pill px-3.5 py-1",
              filter === f ? "bg-salli-accent" : "border border-foreground/[0.08] bg-card",
            )}
          >
            <Text className={cn("text-[15px]", filter === f ? "font-sans-semibold text-white" : "font-sans-medium text-foreground/40")}>
              {f}
            </Text>
          </Pressable>
        ))}
      </View>

      <View className="gap-1.5 px-4 pt-2">
        {visible.length === 0 ? (
          <Card className="items-center gap-2 p-6">
            <ShieldCheck size={22} color={colors.mutedForeground} strokeWidth={1.8} />
            <Text className="text-center text-[15px] text-foreground/35">
              {all.length === 0 ? "No AI write actions recorded yet." : `No ${filter.toLowerCase()} actions.`}
            </Text>
          </Card>
        ) : (
          visible.map((e, i) => (
            <Card key={i} className="flex-row gap-2.5 p-3.5">
              <View
                className={cn(
                  "mt-0.5 h-9 w-9 items-center justify-center rounded-[8px]",
                  e.decision === "approved" ? "bg-salli-accent/[0.12]" : "bg-destructive/[0.12]",
                )}
              >
                <ShieldCheck
                  size={17}
                  color={e.decision === "approved" ? colors.accent : "#EF4444"}
                  strokeWidth={2}
                />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center justify-between">
                  <Text className="font-sans-semibold text-[15px] capitalize text-foreground">
                    {e.action.replace(/_/g, " ")}
                  </Text>
                  <View className={cn("rounded-[6px] px-2 py-0.5", e.decision === "approved" ? "bg-salli-accent/15" : "bg-destructive/15")}>
                    <Text className={cn("text-[13px] font-sans-semibold capitalize", e.decision === "approved" ? "text-salli-accent" : "text-destructive")}>
                      {e.decision}
                    </Text>
                  </View>
                </View>
                <Text className="mt-0.5 text-[14px] text-foreground/30">{e.created_at}</Text>
                <ParamRows params={e.params} />
              </View>
            </Card>
          ))
        )}
      </View>
    </PageShell>
  );
}
