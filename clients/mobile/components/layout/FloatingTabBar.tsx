import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { LayoutGrid, PiggyBank, Plus, Table, TrendingUp } from "lucide-react-native";
import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { VoiceCaptureSheet } from "../VoiceCaptureSheet";
import type { EntryDraft } from "../../hooks/useLedger";
import { useSalliStore } from "../../lib/store";
import { useAppTheme, useThemeColors } from "../../lib/theme";

const ROUTE_META: Record<string, { Icon: typeof LayoutGrid; label: string }> = {
  index: { Icon: LayoutGrid, label: "Home" },
  ledger: { Icon: Table, label: "Ledger" },
  agent: { Icon: PiggyBank, label: "Scrooge" },
  "financial-independence": { Icon: TrendingUp, label: "FI" },
};

/**
 * Floating rounded dock — theme-aware (a light card in light mode, an elevated
 * dark surface in dark mode) with an active-state accent pill + label and a
 * raised branded "+" that deep-links to Ledger's New Entry form.
 */
export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { isDark } = useAppTheme();
  const requestQuickAddEntry = useSalliStore((s) => s.requestQuickAddEntry);
  const [captureOpen, setCaptureOpen] = useState(false);

  const openNewEntry = (draft?: EntryDraft) => {
    requestQuickAddEntry(draft ?? null);
    navigation.navigate("ledger");
  };

  // Filter by name (not position) — "more" is a hidden route (href: null) that
  // still appears in state.routes, so positional slicing would misplace it.
  const visibleRoutes = state.routes.filter((r) => r.name in ROUTE_META);
  const leftRoutes = visibleRoutes.slice(0, 2);
  const rightRoutes = visibleRoutes.slice(2);

  const dockShadow =
    Platform.OS === "web"
      ? ({ boxShadow: isDark ? "0 8px 30px rgba(0,0,0,0.55)" : "0 8px 30px rgba(10,10,10,0.12)" } as object)
      : {
          shadowColor: "#000000",
          shadowOpacity: isDark ? 0.5 : 0.15,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 8 },
          elevation: 12,
        };

  const renderTab = (route: (typeof state.routes)[number]) => {
    const { options } = descriptors[route.key];
    const isFocused = state.routes[state.index].key === route.key;
    const { Icon, label } = ROUTE_META[route.name] ?? ROUTE_META.index;

    const onPress = () => {
      const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    return (
      <Pressable
        key={route.key}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={options.title ?? label}
        className="flex-1 items-center justify-center gap-0.5"
      >
        <View
          style={isFocused ? { backgroundColor: isDark ? "rgba(245,49,15,0.18)" : "rgba(245,49,15,0.12)" } : undefined}
          className="items-center justify-center rounded-full px-4 py-1"
        >
          <Icon size={22} color={isFocused ? colors.accent : colors.mutedForeground} strokeWidth={isFocused ? 2.2 : 1.9} />
        </View>
        <Text
          style={{ color: isFocused ? colors.accent : colors.mutedForeground, fontSize: 10 }}
          className={isFocused ? "font-sans-semibold" : "font-sans-medium"}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      pointerEvents="box-none"
      className="absolute bottom-0 left-0 right-0 items-center"
      style={{ paddingBottom: Math.max(insets.bottom, 10), paddingHorizontal: 14 }}
    >
      <View
        style={[
          { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, width: "100%", maxWidth: 460 },
          dockShadow,
        ]}
        className="flex-row items-center rounded-[26px] px-2 py-2"
      >
        {leftRoutes.map(renderTab)}

        <View className="flex-1 items-center justify-center">
          <Pressable
            onPress={() => openNewEntry()}
            onLongPress={() => setCaptureOpen(true)}
            delayLongPress={300}
            accessibilityRole="button"
            accessibilityLabel="New entry — long-press for voice/text quick add"
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: colors.accent,
              alignItems: "center",
              justifyContent: "center",
              ...(Platform.OS === "web"
                ? { boxShadow: "0 6px 18px rgba(245,49,15,0.45)" }
                : {
                    shadowColor: colors.accent,
                    shadowOpacity: 0.45,
                    shadowRadius: 16,
                    shadowOffset: { width: 0, height: 5 },
                    elevation: 8,
                  }),
            }}
          >
            <Plus size={24} color="#FFFFFF" strokeWidth={2.6} />
          </Pressable>
        </View>

        {rightRoutes.map(renderTab)}
      </View>

      <VoiceCaptureSheet
        visible={captureOpen}
        onClose={() => setCaptureOpen(false)}
        onDraft={(draft) => {
          setCaptureOpen(false);
          openNewEntry(draft);
        }}
      />
    </View>
  );
}
