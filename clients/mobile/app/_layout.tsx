import "../global.css";
import "../lib/api-client";

import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useFonts as useDMSans,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
  DMSans_900Black,
} from "@expo-google-fonts/dm-sans";
import {
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
} from "@expo-google-fonts/ibm-plex-mono";
import { ThemeProvider, useThemeColors, useAppTheme } from "@/lib/theme";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AppShell() {
  const theme = useThemeColors();
  const { isDark } = useAppTheme();

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }} />
    </QueryClientProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useDMSans({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    DMSans_900Black,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}
