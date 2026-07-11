import { Pressable } from "react-native";
import { router } from "expo-router";
import { User } from "lucide-react-native";
import { useThemeColors } from "@/lib/theme";

/**
 * Top-right header entry point into the More section (Tax, Reminders,
 * Documents, Statements, Billing, Settings) — replaces the dock's old
 * hamburger icon. Reads as a user avatar since Settings/session info lives
 * behind it too.
 */
export function AvatarMoreButton() {
  const theme = useThemeColors();

  return (
    <Pressable
      onPress={() => router.push("/(tabs)/more")}
      accessibilityRole="button"
      accessibilityLabel="More"
      className="w-10 h-10 rounded-full items-center justify-center active:opacity-80"
      style={{ backgroundColor: theme.foreground }}
    >
      <User color={theme.background} size={18} />
    </Pressable>
  );
}
