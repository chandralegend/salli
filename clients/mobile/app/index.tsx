import { useQuery } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { getStatusOnboardingStatusGet } from "../lib/api/sdk.gen";
import { useSalliStore } from "../lib/store";
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
  // Auth hydration lives in the root layout (_layout.tsx); here we just read it.
  const token = useSalliStore((s) => s.token);
  const authReady = useSalliStore((s) => s.authReady);
  // Mode hydration also lives in the root layout, alongside auth.
  const modeReady = useSalliStore((s) => s.modeReady);
  const modeChosen = useSalliStore((s) => s.modeChosen);
  const mode = useSalliStore((s) => s.mode);

  const onboardingStatus = useQuery({
    queryKey: ["onboarding-status"],
    queryFn: async () => {
      const { data } = await getStatusOnboardingStatusGet({ throwOnError: true });
      return data;
    },
    enabled: authReady && Boolean(token),
  });

  if (!authReady || !modeReady) return <Loading />;
  if (!token) return <Redirect href="/(auth)/login" />;
  if (onboardingStatus.isLoading) return <Loading />;
  if (onboardingStatus.data && !onboardingStatus.data.complete) {
    return <Redirect href="/onboarding" />;
  }
  // Onboarding (new users) picks a mode as its final step and sets modeChosen
  // itself; existing users who onboarded before Buddy Mode shipped land here
  // instead, so this is a one-time prompt for them, not a repeat every launch.
  if (!modeChosen) return <Redirect href="/mode-choice" />;
  // Always land in Pro Mode. Salli is a sheet presented over it, so booting
  // straight to /(buddy) would leave the sheet with nothing underneath and
  // nothing to dismiss back to. A chat-first user gets the sheet raised on top
  // instead, which BuddyBoot does once the tabs are mounted.
  return <Redirect href={mode === "buddy" ? "/(tabs)?salli=1" : "/(tabs)"} />;
}
