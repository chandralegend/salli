import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useRouter } from "expo-router";
import { LayoutGrid, Sparkles, Table, TrendingUp } from "lucide-react-native";
import { useEffect, useRef } from "react";
import { Animated, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { TourTarget } from "@/components/tour/TourTarget";
import { useModeSwitch } from "@/hooks/useModeSwitch";
import { useAppTheme, useThemeColors } from "../../lib/theme";

const ROUTE_META: Record<string, { Icon: typeof LayoutGrid; label: string }> = {
  index: { Icon: LayoutGrid, label: "Home" },
  ledger: { Icon: Table, label: "Ledger" },
  // Sparkles, not PiggyBank: a piggy bank reads as "savings", which is a
  // different feature entirely — this tab opens the AI assistant.
  agent: { Icon: Sparkles, label: "Salli AI" },
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
      className="flex-1 items-center justify-center gap-1"
    >
      <Icon
        size={23}
        color={isFocused ? colors.accent : colors.mutedForeground}
        strokeWidth={isFocused ? 2.3 : 1.9}
      />
      <Text
        style={{ color: isFocused ? colors.accent : colors.mutedForeground, fontSize: 11.5 }}
        className={isFocused ? "font-sans-bold" : "font-sans-medium"}
      >
        {label}
      </Text>
      {/* A short underline instead of a pill behind the icon. The pill used
          accentSoft, a translucent orange wash — on the cream canvas it read as
          a smudge rather than a state, and it competed with the hard-edged
          geometry everywhere else. */}
      <Animated.View
        style={{
          width: 22,
          height: 3,
          borderRadius: 2,
          backgroundColor: colors.accent,
          opacity: highlight,
        }}
      />
    </AnimatedPressable>
  );
}

/**
 * Fixed, edge-to-edge bottom nav bar: four tabs, a 2px ink top border, and the
 * active tab marked by an orange icon, label and underline.
 *
 * The centre "+" is deliberately gone. It was a fifth slot in a four-place bar
 * that navigated somewhere rather than being a destination, and its
 * long-press-to-capture was invisible to anyone who never tried it. Both the
 * tap and the long-press now live on Home's Add button.
 */
export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const router = useRouter();
  const { enterBuddy } = useModeSwitch();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();


  // Filter by name (not position) — "more" is a hidden route (href: null) that
  // still appears in state.routes, so positional slicing would misplace it.
  const visibleRoutes = state.routes.filter((r) => r.name in ROUTE_META);

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
        // 2px ink, matching every other border in the app. A hairline read as
        // a seam; the bar should look like a block the content sits above.
        borderTopWidth: 2,
        borderTopColor: colors.foreground,
        paddingBottom: insets.bottom,
      }}
    >
      {/* Four tabs, no centre "+". Add moved to Home, and it kept the
          long-press-to-capture that used to live here — so the entry point is
          relocated, not retired. */}
      <View className="flex-row items-center px-2" style={{ height: 58 }}>
        {visibleRoutes.map(renderTab)}
      </View>
    </View>
  );
}
