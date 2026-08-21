import type { ReactNode } from "react";
import { ScrollView, View, type ScrollViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useThemeColors } from "../../lib/theme";
import { cn } from "../../lib/utils";

type PageShellProps = ScrollViewProps & {
  children: ReactNode;
  /** Extra bottom padding to clear the fixed tab bar (56px + safe area). */
  tabBarInset?: boolean;
  /** Make the shell transparent so a parent-rendered background (e.g. the
   * Dashboard hero gradient sitting behind it) shows through. */
  transparent?: boolean;
  className?: string;
};

/** Base scroll container every screen sits in: theme background, safe-area top
 * inset, and (when shown under the tab bar) enough bottom padding to clear the
 * fixed 56px bar so the last card isn't hidden behind it. */
export function PageShell({
  children,
  tabBarInset = true,
  transparent = false,
  className,
  contentContainerStyle,
  ...props
}: PageShellProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  return (
    <View style={{ flex: 1, backgroundColor: transparent ? "transparent" : colors.background }}>
      <ScrollView
        style={{ paddingTop: insets.top, backgroundColor: "transparent" }}
        contentContainerStyle={[
          { paddingBottom: tabBarInset ? 56 + insets.bottom + 16 : insets.bottom + 24 },
          contentContainerStyle,
        ]}
        className={cn(className)}
        {...props}
      >
        {children}
      </ScrollView>
    </View>
  );
}
