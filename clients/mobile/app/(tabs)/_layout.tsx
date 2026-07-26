import { Tabs } from "expo-router";

import { FloatingTabBar } from "@/components/layout/FloatingTabBar";

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <FloatingTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="ledger" options={{ title: "Ledger" }} />
      <Tabs.Screen name="agent" options={{ title: "Scrooge" }} />
      <Tabs.Screen name="financial-independence" options={{ title: "Freedom" }} />
      <Tabs.Screen name="more" options={{ title: "More" }} />
    </Tabs>
  );
}
