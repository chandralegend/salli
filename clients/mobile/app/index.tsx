import { useQuery } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "../lib/auth";
import { getStatusOnboardingStatusGet } from "../lib/api/sdk.gen";
import { useThemeColors } from "../lib/theme";

function Loading() {
  const colors = useThemeColors();
  return (
    <View
      style={{ flex: 1, backgroundColor: colors.background }}
      className="items-center justify-center"
    >
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}

export default function Index() {
  const { token, authReady } = useAuth();

  const onboardingStatus = useQuery({
    queryKey: ["onboarding-status"],
    queryFn: async () => {
      const { data } = await getStatusOnboardingStatusGet({ throwOnError: true });
      return data;
    },
    enabled: authReady && Boolean(token),
  });

  if (!authReady) return <Loading />;
  if (!token) return <Redirect href="/(auth)/login" />;
  if (onboardingStatus.isLoading) return <Loading />;
  if (onboardingStatus.data && !onboardingStatus.data.complete) {
    return <Redirect href="/onboarding" />;
  }
  return <Redirect href="/(tabs)" />;
}
