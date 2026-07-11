import { Pressable, Text, ActivityIndicator } from "react-native";
import { cn } from "@/lib/utils";
import { useThemeColors } from "@/lib/theme";

interface PillButtonProps {
  variant?: "primary" | "secondary" | "destructive";
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: string;
  className?: string;
}

/** Mirrors clients/web/src/components/ui/page-shell.tsx PillButton. */
export function PillButton({
  variant = "secondary",
  onPress,
  disabled,
  loading,
  children,
  className,
}: PillButtonProps) {
  const theme = useThemeColors();
  const isLight = variant === "secondary";
  const spinnerColor = isLight ? theme.foreground : variant === "primary" ? theme.primaryForeground : "#fff";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={cn(
        "flex-row items-center justify-center gap-2 rounded-full px-5 py-3.5",
        variant === "primary" && "bg-primary active:opacity-85",
        variant === "secondary" && "bg-card border border-border active:bg-muted",
        variant === "destructive" && "bg-destructive active:opacity-90",
        (disabled || loading) && "opacity-50",
        className,
      )}
    >
      {loading && <ActivityIndicator size="small" color={spinnerColor} />}
      <Text
        className={cn(
          "text-[15px]",
          isLight ? "text-foreground" : variant === "primary" ? "text-primary-foreground" : "text-white",
        )}
        style={{ fontFamily: "DMSans_700Bold" }}
      >
        {children}
      </Text>
    </Pressable>
  );
}
