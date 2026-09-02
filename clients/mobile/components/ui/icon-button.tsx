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
      className={cn(
        // .sqbtn from the mockup: a rounded square, not a circle. Every
        // header control in every frame is this shape.
        "h-11 w-11 items-center justify-center rounded-[11px] border-2 border-foreground bg-card",
        className,
      )}
    >
      <Icon size={size} color={colors.foreground} strokeWidth={2} />
    </AnimatedPressable>
  );
}
