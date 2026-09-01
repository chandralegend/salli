import { Check } from "lucide-react-native";
import { Text, View } from "react-native";

import type { AssistantPart } from "@/hooks/useAgentChat";
import { useToolActivity } from "@/hooks/useToolActivity";
import { useThemeColors } from "@/lib/theme";

import { ToolActivityRow } from "./ToolActivityRow";

/** Renders a message's tool-call parts as human-readable activity — full rows
 * while running, collapsing to a compact one-line summary once the assistant's
 * actual answer starts arriving (never a permanent "thinking" panel). */
export function ToolActivityBlock({ parts }: { parts: AssistantPart[] }) {
  const colors = useThemeColors();
  const { rows, collapsed } = useToolActivity(parts);
  if (rows.length === 0) return null;

  if (collapsed) {
    const label = rows.length === 1 ? rows[0].label : `Checked ${rows.length} things`;
    return (
      <View className="mb-1 flex-row items-center gap-1.5 pl-0.5">
        <Check size={11} color={colors.accent} strokeWidth={2.5} />
        <Text className="text-[14px] text-foreground/30">{label}</Text>
      </View>
    );
  }

  return (
    <View className="mb-1">
      {rows.map((row) => (
        <ToolActivityRow key={row.key} row={row} />
      ))}
    </View>
  );
}
