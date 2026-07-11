import { Tabs } from "expo-router";
import { useThemeColors } from "@/lib/theme";
import { FloatingTabBar } from "@/components/layout/FloatingTabBar";

export default function TabsLayout() {
  const theme = useThemeColors();

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="ledger" options={{ title: "Ledger" }} />
      <Tabs.Screen name="agent" options={{ title: "Agent" }} />
      <Tabs.Screen name="financial-independence" options={{ title: "Financial Independence" }} />
      {/* Not shown in the dock (see FloatingTabBar) — reached via the header's AvatarMoreButton. */}
      <Tabs.Screen name="more" options={{ title: "More", href: null }} />
    </Tabs>
  );
}
