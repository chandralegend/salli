import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { LayoutGrid, PiggyBank, Plus, Table, TrendingUp } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Animated, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { TourTarget } from "@/components/tour/TourTarget";
import { useModeSwitch } from "@/hooks/useModeSwitch";
import { VoiceCaptureSheet } from "../VoiceCaptureSheet";
import type { EntryDraft } from "../../hooks/useLedger";
import { useSalliStore } from "../../lib/store";
import { useAppTheme, useThemeColors } from "../../lib/theme";

const ROUTE_META: Record<string, { Icon: typeof LayoutGrid; label: string }> = {
  index: { Icon: LayoutGrid, label: "Home" },
  ledger: { Icon: Table, label: "Ledger" },
  agent: { Icon: PiggyBank, label: "Salli AI" },
  "financial-independence": { Icon: TrendingUp, label: "Freedom" },
};

/** One nav tab — owns its own highlight-crossfade Animated.Value so each tab
 * animates independently as focus moves between them. */
function NavTab({
  isFocused,
  label,
  Icon,
  onPress,
  accessibilityLabel,
}: {
  isFocused: boolean;
  label: string;
  Icon: typeof LayoutGrid;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const colors = useThemeColors();
  const highlight = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(highlight, { toValue: isFocused ? 1 : 0, duration: 160, useNativeDriver: true }).start();
  }, [isFocused, highlight]);

  return (
    <AnimatedPressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={accessibilityLabel}
      className="flex-1 items-center justify-center gap-0.5"
    >
      <View className="items-center justify-center rounded-full px-4 py-1">
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 9999,
            opacity: highlight,
            backgroundColor: colors.accentSoft,
          }}
        />
        <Icon size={22} color={isFocused ? colors.accent : colors.mutedForeground} strokeWidth={isFocused ? 2.2 : 1.9} />
      </View>
      <Text
        style={{ color: isFocused ? colors.accent : colors.mutedForeground, fontSize: 10 }}
        className={isFocused ? "font-sans-semibold" : "font-sans-medium"}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

/**
 * Fixed, edge-to-edge bottom nav bar — attached flush to the viewport/safe
 * area (not a detached floating pill), with an active-state accent pill +
 * label and a branded "+" that deep-links to Ledger's New Entry form.
 */
export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const router = useRouter();
  const { enterBuddy } = useModeSwitch();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
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

  const renderTab = (route: (typeof state.routes)[number]) => {
    const { options } = descriptors[route.key];
    const isFocused = state.routes[state.index].key === route.key;
    const { Icon, label } = ROUTE_META[route.name] ?? ROUTE_META.index;

    const onPress = () => {
      // "Salli AI" enters Buddy Mode directly — the separate Scrooge-persona
      // screen is retired, so this never lets the tab's own route mount.
      // Via useModeSwitch so the stored mode moves with the navigation; setting
      // only the route left the edge-swipe believing we were still in Pro Mode.
      if (route.name === "agent") {
        enterBuddy();
        return;
      }
      const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    const tab = (
      <NavTab
        key={route.key}
        isFocused={isFocused}
        label={label}
        Icon={Icon}
        onPress={onPress}
        accessibilityLabel={options.title ?? label}
      />
    );

    if (route.name === "agent") {
      return (
        <TourTarget key={route.key} id="tabbar-scrooge" className="flex-1">
          {tab}
        </TourTarget>
      );
    }
    return tab;
  };

  return (
    <View
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingBottom: insets.bottom,
      }}
    >
      <View className="flex-row items-center px-2" style={{ height: 56 }}>
        {leftRoutes.map(renderTab)}

        <TourTarget id="tabbar-quickadd" className="flex-1 items-center justify-center">
          <AnimatedPressable
            onPress={() => openNewEntry()}
            haptic="medium"
            onLongPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setCaptureOpen(true);
            }}
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
            }}
          >
            <Plus size={24} color="#FFFFFF" strokeWidth={2.6} />
          </AnimatedPressable>
        </TourTarget>

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
