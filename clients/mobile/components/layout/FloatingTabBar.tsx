import { View, Pressable } from "react-native";
import { router } from "expo-router";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { LayoutGrid, BookOpen, MessageCircle, TrendingUp, Plus } from "lucide-react-native";
import { useSalliStore } from "@/lib/store";
import { useAppTheme } from "@/lib/theme";

const ACTIVE = "#E8FC85";
const ACTIVE_ICON = "#010001";
const INACTIVE = "rgba(255,255,255,0.55)";

const BAR_HEIGHT = 68;
const ADD_BUTTON_SIZE = 60;
const ADD_BUTTON_POP = 22; // how far the "+" pops up above the bar
const BAR_GAP = 4; // gap between the bar's bottom edge and the screen bottom

const ICONS: Record<string, typeof LayoutGrid> = {
  index: LayoutGrid,
  ledger: BookOpen,
  agent: MessageCircle,
  "financial-independence": TrendingUp,
};

/**
 * Floating rounded dock — mirrors clients/web/src/components/layout/AppSidebar.tsx's
 * dark rounded nav dock (not a full-width edge-to-edge bar). The raised lime "+" in
 * the middle opens the New Entry modal on Ledger from anywhere in the app.
 *
 * Page content is allowed to scroll underneath this whole zone (ScreenShell no longer
 * reserves hard clearance for it) — the blur + gradient backdrop below fades it out
 * gracefully instead of an abrupt clip.
 */
export function FloatingTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const requestQuickAddEntry = useSalliStore((s) => s.requestQuickAddEntry);
  const { isDark } = useAppTheme();

  function renderTab(name: string) {
    const index = state.routes.findIndex((r) => r.name === name);
    if (index === -1) return null;
    const route = state.routes[index];
    const isFocused = state.index === index;
    const Icon = ICONS[name];

    function onPress() {
      const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
      if (!isFocused && !(event as { defaultPrevented?: boolean }).defaultPrevented) {
        navigation.navigate(route.name);
      }
    }

    return (
      <Pressable
        key={route.key}
        onPress={onPress}
        accessibilityRole="tab"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={descriptors[route.key]?.options.title ?? name}
        className="flex-1 items-center justify-center"
      >
        <View
          className="w-10 h-10 rounded-xl items-center justify-center"
          style={
            isFocused
              ? {
                  backgroundColor: ACTIVE,
                  shadowColor: ACTIVE,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.55,
                  shadowRadius: 8,
                  elevation: 6,
                }
              : { backgroundColor: "transparent" }
          }
        >
          <Icon color={isFocused ? ACTIVE_ICON : INACTIVE} size={20} strokeWidth={isFocused ? 2.25 : 2} />
        </View>
      </Pressable>
    );
  }

  function handleAddEntry() {
    requestQuickAddEntry();
    router.navigate("/(tabs)/ledger");
  }

  // Blur/gradient backdrop spans from the vertical middle of the bar down to the
  // screen bottom — not the whole bar or above it.
  const barBottom = insets.bottom + BAR_GAP;
  const backdropHeight = barBottom + BAR_HEIGHT / 2;

  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: backdropHeight }}>
      {/* Blur + gradient fade backdrop — full width, behind the dock, so content
          scrolling up fades out gracefully instead of clipping hard at the dock. */}
      <BlurView
        intensity={35}
        tint={isDark ? "dark" : "light"}
        pointerEvents="none"
        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
      />
      <LinearGradient
        pointerEvents="none"
        colors={isDark ? ["rgba(17,17,16,0)", "rgba(17,17,16,1)"] : ["rgba(241,247,247,0)", "rgba(241,247,247,1)"]}
        locations={[0, 1]}
        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
      />

      {/* The dock itself, on top of the backdrop */}
      <View
        style={{
          position: "absolute",
          left: 20,
          right: 20,
          bottom: barBottom,
          height: BAR_HEIGHT,
          backgroundColor: "#010001",
          borderRadius: 30,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 6,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.28,
          shadowRadius: 18,
          elevation: 14,
        }}
      >
        {renderTab("index")}
        {renderTab("ledger")}

        <Pressable
          onPress={handleAddEntry}
          accessibilityRole="button"
          accessibilityLabel="Add entry"
          style={{
            width: ADD_BUTTON_SIZE,
            height: ADD_BUTTON_SIZE,
            borderRadius: ADD_BUTTON_SIZE / 2,
            backgroundColor: ACTIVE,
            alignItems: "center",
            justifyContent: "center",
            marginTop: -ADD_BUTTON_POP,
            marginHorizontal: 2,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 10,
          }}
        >
          <Plus color="#010001" size={28} strokeWidth={2.5} />
        </Pressable>

        {renderTab("agent")}
        {renderTab("financial-independence")}
      </View>
    </View>
  );
}
