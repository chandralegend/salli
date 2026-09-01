import type { LucideIcon } from "lucide-react-native";

import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** The repeated circular icon-button shape (bell, settings gear, etc.) —
 * one component so every call site gets tap feedback for free. */
export function IconButton({
  icon: Icon,
  onPress,
  accessibilityLabel,
  size = 16,
  haptic = "none",
  className,
}: {
  icon: LucideIcon;
  onPress: () => void;
  accessibilityLabel: string;
  size?: number;
  haptic?: "light" | "medium" | "selection" | "none";
  className?: string;
}) {
  const colors = useThemeColors();

  return (
    <AnimatedPressable
      onPress={onPress}
      haptic={haptic}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className={cn("h-11 w-11 items-center justify-center rounded-full bg-foreground/10", className)}
    >
      <Icon size={size} color={colors.foreground} strokeWidth={2} />
    </AnimatedPressable>
  );
}
