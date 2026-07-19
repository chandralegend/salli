import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { LayoutGrid, PiggyBank, Plus, Table, TrendingUp } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSalliStore } from "../../lib/store";

const ROUTE_ICONS: Record<string, typeof LayoutGrid> = {
  index: LayoutGrid,
  ledger: Table,
  agent: PiggyBank,
  "financial-independence": TrendingUp,
};

/**
 * Flush-to-bottom-edge dock (not a floating rounded pill) — matches the mockup
 * exactly: rgba(4,4,4,.97) bg, hairline top border, 64px tall, with a raised
 * white "+" button at center that deep-links to Ledger's New Entry form.
 * Theme-invariant: stays dark in both light and dark mode, like the mockup.
 */
export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const requestQuickAddEntry = useSalliStore((s) => s.requestQuickAddEntry);

  // Filter by name (not position) — "more" is a hidden route (href: null) that
  // still appears in state.routes, so positional slicing would misplace it.
  const visibleRoutes = state.routes.filter((r) => r.name in ROUTE_ICONS);
  const leftRoutes = visibleRoutes.slice(0, 2);
  const rightRoutes = visibleRoutes.slice(2);

  const renderTab = (route: (typeof state.routes)[number]) => {
    const { options } = descriptors[route.key];
    const isFocused = state.routes[state.index].key === route.key;
    const Icon = ROUTE_ICONS[route.name] ?? LayoutGrid;

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
        accessibilityLabel={options.title ?? route.name}
        className="flex-1 items-center justify-center"
      >
        <Icon size={26} color={isFocused ? "#2563EB" : "rgba(255,255,255,0.4)"} strokeWidth={1.8} />
      </Pressable>
    );
  };

  return (
    <View
      style={{ paddingBottom: insets.bottom, backgroundColor: "rgba(4,4,4,0.97)" }}
      className="absolute bottom-0 left-0 right-0 border-t border-white/10"
    >
      <View style={{ height: 64 }} className="flex-row items-center px-2">
        {leftRoutes.map(renderTab)}

        <View className="flex-1 items-center justify-center" style={{ marginTop: -14 }}>
          <Pressable
            onPress={() => {
              requestQuickAddEntry();
              navigation.navigate("ledger");
            }}
            accessibilityRole="button"
            accessibilityLabel="New entry"
            style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              backgroundColor: "#FFFFFF",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#2563EB",
              shadowOpacity: 0.35,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 4 },
              elevation: 6,
            }}
          >
            <Plus size={22} color="#000000" strokeWidth={2.5} />
          </Pressable>
        </View>

        {rightRoutes.map(renderTab)}
      </View>
    </View>
  );
}
