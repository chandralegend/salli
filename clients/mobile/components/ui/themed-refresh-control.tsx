import { Platform, RefreshControl } from "react-native";

import { useThemeColors } from "@/lib/theme";

/** One themed RefreshControl shared by every pull-to-refresh screen, so the
 * spinner tint/background stays consistent and correct in both themes. */
export function useThemedRefreshControl(refreshing: boolean, onRefresh: () => void) {
  const colors = useThemeColors();

  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={colors.accent}
      titleColor={colors.mutedForeground}
      colors={Platform.OS === "android" ? [colors.accent] : undefined}
      progressBackgroundColor={Platform.OS === "android" ? colors.card : undefined}
    />
  );
}
