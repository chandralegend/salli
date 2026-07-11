import { View, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "@/lib/auth";
import { useThemeColors } from "@/lib/theme";

export default function Index() {
  const { token, authReady } = useAuth();
  const theme = useThemeColors();

  if (!authReady) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={theme.foreground} />
      </View>
    );
  }

  return <Redirect href={token ? "/(tabs)" : "/(auth)/login"} />;
}
