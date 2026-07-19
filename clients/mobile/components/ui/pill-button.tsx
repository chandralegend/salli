import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, type PressableProps } from "react-native";

import { useThemeColors } from "../../lib/theme";
import { cn } from "../../lib/utils";

type PillButtonProps = PressableProps & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "accent";
  loading?: boolean;
  className?: string;
};

/** The mockup's two recurring CTA shapes: a solid "inverse of canvas" primary
 * pill (white-on-black in dark mode) and a translucent secondary pill with a
 * hairline border. `accent` is the fixed-blue variant (e.g. "Set Reminder"). */
export function PillButton({
  children,
  variant = "primary",
  loading,
  disabled,
  className,
  ...props
}: PillButtonProps) {
  const colors = useThemeColors();

  const bg =
    variant === "primary" ? colors.primary : variant === "accent" ? colors.accent : "transparent";
  const textColor =
    variant === "primary" ? colors.primaryForeground : variant === "accent" ? "#FFFFFF" : colors.foreground;

  return (
    <Pressable
      disabled={disabled || loading}
      className={cn(
        "h-[50px] flex-row items-center justify-center gap-2 rounded-pill",
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
        <Text style={{ color: textColor }} className="text-[16px] font-sans-semibold">
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}
