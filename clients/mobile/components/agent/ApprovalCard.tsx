import { Bell } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** Inline write-tool approval gate (mockup's approval card). Surfaces the tool
 * name in the subtitle and the real parameter rows (the event's `action` may be
 * flat or wrap the fields under `params`). Shared by Pro Mode's "Salli AI" tab
 * and Buddy Mode's chat screen — the write-approval gate is identical in both,
 * only the surrounding chat chrome differs. */
export function ApprovalCard({
  action,
  resolved,
  onResolve,
}: {
  action: Record<string, unknown>;
  resolved?: "approved" | "denied";
  onResolve: (d: "approved" | "denied") => void;
}) {
  const colors = useThemeColors();
  const toolName = String(action.action ?? action.type ?? action.tool ?? "action");
  const rawParams = (
    action.params && typeof action.params === "object" ? action.params : action
  ) as Record<string, unknown>;
  const paramEntries = Object.entries(rawParams).filter(
    ([k]) => !["type", "action", "tool", "params"].includes(k),
  );
  return (
    <View className="rounded-[16px] border border-foreground/[0.12] bg-card p-3">
      <View className="mb-2.5 flex-row items-center gap-2">
        <View className="h-[22px] w-[22px] items-center justify-center rounded-[6px] bg-foreground/[0.08]">
          <Bell size={11} color={colors.mutedForeground} strokeWidth={2} />
        </View>
        <View className="flex-1">
          <Text className="font-sans-semibold text-[12px] text-foreground">Proposed action</Text>
          <Text className="text-[10px] text-foreground/25">{toolName} · approve to proceed</Text>
        </View>
      </View>
      {paramEntries.length ? (
        <View className="mb-2.5 gap-1.5 rounded-[9px] bg-foreground/[0.04] px-2.5 py-2">
          {paramEntries.map(([k, v]) => (
            <View key={k} className="flex-row justify-between gap-3">
              <Text className="text-[11px] capitalize text-foreground/35">{k.replace(/_/g, " ")}</Text>
              <Text className="flex-1 text-right text-[11px] font-sans-medium text-foreground" numberOfLines={1}>
                {typeof v === "object" ? JSON.stringify(v) : String(v)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {resolved ? (
        <Text
          className={cn(
            "text-center text-[12px] font-sans-semibold",
            resolved === "approved" ? "text-salli-accent" : "text-destructive",
          )}
        >
          {resolved === "approved" ? "Approved" : "Denied"}
        </Text>
      ) : (
        <View className="flex-row gap-2">
          <Pressable
            onPress={() => onResolve("approved")}
            className="h-[34px] flex-1 items-center justify-center rounded-[10px] bg-primary"
          >
            <Text className="font-sans-semibold text-[13px] text-primary-foreground">Approve</Text>
          </Pressable>
          <Pressable
            onPress={() => onResolve("denied")}
            className="h-[34px] flex-1 items-center justify-center rounded-[10px] border border-foreground/10 bg-foreground/[0.06]"
          >
            <Text className="font-sans-semibold text-[13px] text-foreground/45">Deny</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
