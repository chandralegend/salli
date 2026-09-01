import { Check, LoaderCircle } from "lucide-react-native";
import { useEffect, useRef } from "react";
import { Animated, Text, View } from "react-native";

import type { ActivityRow } from "@/hooks/useToolActivity";
import { useThemeColors } from "@/lib/theme";

/** RN core Animated (not react-native-reanimated, disabled project-wide in
 * babel.config.js) continuous rotation for the "running" spinner. */
function Spinner({ color }: { color: string }) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 900, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <LoaderCircle size={15} color={color} strokeWidth={2} />
    </Animated.View>
  );
}

export function ToolActivityRow({ row }: { row: ActivityRow }) {
  const colors = useThemeColors();
  return (
    <View className="flex-row items-center gap-2 py-1">
      <View className="h-4 w-4 items-center justify-center">
        {row.state === "complete" ? (
          <Check size={15} color={colors.accent} strokeWidth={2.5} />
        ) : (
          <Spinner color={colors.mutedForeground} />
        )}
      </View>
      <View className="flex-1">
        <Text className="text-[15px] font-sans-medium text-foreground/70">
          {row.agent === "tax_specialist" ? "Tax specialist: " : row.agent === "finance_specialist" ? "Finance specialist: " : ""}
          {row.label}
        </Text>
        {row.state === "running" ? (
          <Text className="text-[13px] text-foreground/30">{row.status}</Text>
        ) : null}
      </View>
    </View>
  );
}
