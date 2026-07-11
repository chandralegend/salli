import { Stack } from "expo-router";
import { useThemeColors } from "@/lib/theme";

export default function AuthLayout() {
  const theme = useThemeColors();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }} />;
}
