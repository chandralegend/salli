import type { ReactNode } from "react";
import { ActivityIndicator, Text, type PressableProps, type StyleProp, type ViewStyle } from "react-native";

import { AnimatedPressable } from "./animated-pressable";
import { useHardShadow, useThemeColors } from "../../lib/theme";
import { cn } from "../../lib/utils";

type ActionButtonProps = Omit<PressableProps, "style"> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "accent" | "ai";
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  className?: string;
};

/** The recurring CTA. `primary` is a solid inverse-of-canvas block, `secondary`
 * is the plain surface, `accent` is brand orange, and `ai` is the lavender
 * reserved for AI actions. All four share the 2px ink border and hard offset
 * shadow, so they read as one family.
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
  const shadow = useHardShadow();

  const inert = Boolean(disabled) || Boolean(loading);
  const bg = inert
    ? colors.muted
    : variant === "primary"
      ? colors.primary
      : variant === "accent"
        ? colors.accent
        : variant === "ai"
          ? colors.accentAi
          : colors.card;
  // The AI variant is lavender and always carries black text: the lavender is
  // theme-invariant, so deriving its label from `foreground` would put white
  // text on a light lilac fill in dark mode.
  const textColor = inert
    ? colors.mutedForeground
    : variant === "primary"
      ? colors.primaryForeground
      : variant === "accent"
        ? "#FFFFFF"
        : variant === "ai"
          ? "#000000"
          : colors.foreground;

  return (
    <AnimatedPressable
      disabled={disabled || loading}
      haptic={variant === "secondary" ? "none" : "light"}
      press="sink"
      className={cn(
        // px-7 so the pill has breathing room even when its parent doesn't
        // stretch it. Most usages sit in a full-width container and look fine
        // without it, but under a shrink-to-fit parent (`items-center`) the pill
        // collapsed onto the text with no side padding — see the Tax empty
        // state. Invisible in the stretched case, correct in both.
        // Every variant carries the 2px ink border, including `secondary` —
        // the brutalist button IS its outline, so a borderless variant would
        // read as a different component rather than a quieter one.
        "h-[52px] flex-row items-center justify-center gap-2 rounded-card border-2 border-foreground px-7",
        className,
      )}
      style={[{ backgroundColor: bg }, inert ? undefined : shadow]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : typeof children === "string" ? (
        <Text style={{ color: textColor }} className="text-[17px] font-sans-bold">
          {children}
        </Text>
      ) : (
        children
      )}
    </AnimatedPressable>
  );
}
