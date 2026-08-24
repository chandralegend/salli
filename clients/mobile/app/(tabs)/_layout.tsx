import { Tabs } from "expo-router";

import { FloatingTabBar } from "@/components/layout/FloatingTabBar";

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        // Without this, bottom-tabs v7 defaults to `animation: "none"` — every
        // tab switch is a hard cut, which is what made moving around Pro Mode
        // feel abrupt. `shift` cross-fades while nudging the outgoing screen,
        // so the direction of travel reads without a full slide (a full slide
        // would fight the edge-swipe mode switcher, which owns horizontal
        // motion at the root).
        animation: "shift",
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="ledger" options={{ title: "Ledger" }} />
      <Tabs.Screen name="agent" options={{ title: "Salli AI" }} />
      <Tabs.Screen name="financial-independence" options={{ title: "Freedom" }} />
      <Tabs.Screen name="more" options={{ title: "More" }} />
    </Tabs>
  );
}
