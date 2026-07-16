import { Stack } from "expo-router";
import { useThemeColors } from "@/lib/theme";

export default function MoreLayout() {
  const theme = useThemeColors();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.foreground,
        headerTitleStyle: { fontFamily: "DMSans_700Bold" },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="tax" options={{ title: "Tax" }} />
      <Stack.Screen name="reminders" options={{ title: "Reminders" }} />
      <Stack.Screen name="documents" options={{ title: "Documents" }} />
      <Stack.Screen name="statements" options={{ title: "Statements" }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
      <Stack.Screen name="billing" options={{ title: "Billing" }} />
      <Stack.Screen name="budget" options={{ title: "Budget" }} />
      <Stack.Screen name="debt" options={{ title: "Debt" }} />
      <Stack.Screen name="portfolio" options={{ title: "Portfolio" }} />
      <Stack.Screen name="insurance" options={{ title: "Insurance" }} />
      <Stack.Screen name="subscriptions" options={{ title: "Subscriptions" }} />
      <Stack.Screen name="reports" options={{ title: "Reports" }} />
      <Stack.Screen name="audit-log" options={{ title: "Audit Log" }} />
    </Stack>
  );
}
