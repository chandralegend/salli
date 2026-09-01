import type { ReactNode } from "react";
import { ActivityIndicator, Text, type PressableProps, type StyleProp, type ViewStyle } from "react-native";

import { AnimatedPressable } from "./animated-pressable";
import { useThemeColors } from "../../lib/theme";
import { cn } from "../../lib/utils";

type ActionButtonProps = Omit<PressableProps, "style"> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "accent";
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  className?: string;
};

/** The recurring CTA: a solid "inverse of canvas" primary (white-on-black in
 * dark mode) and a translucent secondary with a hairline border. `accent` is
 * the brand-orange variant (e.g. "Set Reminder").
 *
 * Uses the app's single container radius, not a full pill — it used to be a
 * pill, which put a fully-round CTA directly beneath Apple's 16px sign-in
 * button on the login screen and read as two unrelated button systems. */
export function ActionButton({
  children,
  variant = "primary",
  loading,
  disabled,
  className,
  ...props
}: ActionButtonProps) {
  const colors = useThemeColors();

  const bg =
    variant === "primary" ? colors.primary : variant === "accent" ? colors.accent : "transparent";
  const textColor =
    variant === "primary" ? colors.primaryForeground : variant === "accent" ? "#FFFFFF" : colors.foreground;

  return (
    <AnimatedPressable
      disabled={disabled || loading}
      haptic={variant === "secondary" ? "none" : "light"}
      className={cn(
        // px-7 so the pill has breathing room even when its parent doesn't
        // stretch it. Most usages sit in a full-width container and look fine
        // without it, but under a shrink-to-fit parent (`items-center`) the pill
        // collapsed onto the text with no side padding — see the Tax empty
        // state. Invisible in the stretched case, correct in both.
        "h-[50px] flex-row items-center justify-center gap-2 rounded-card px-7",
        variant === "secondary" && "border border-foreground/10 bg-foreground/5",
        (disabled || loading) && "opacity-50",
        className,
      )}
      style={variant !== "secondary" ? { backgroundColor: bg } : undefined}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : typeof children === "string" ? (
        <Text style={{ color: textColor }} className="text-[18px] font-sans-semibold">
          {children}
        </Text>
      ) : (
        children
      )}
    </AnimatedPressable>
  );
}
