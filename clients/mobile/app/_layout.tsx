import "../global.css";
import "../lib/api-client";

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";

import { useAuth } from "../lib/auth";
import { ThemeProvider, useAppTheme, useThemeColors } from "../lib/theme";

SplashScreen.preventAutoHideAsync();

// networkMode "always": the app talks to a known backend, and react-query's
// browser offline detection is unreliable on Expo web (a dev-server blip can
// wedge it "offline" and silently pause every query). Always attempt fetches
// and surface real errors via the existing empty/error states instead.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { networkMode: "always" },
    mutations: { networkMode: "always" },
  },
});

function AppShell() {
  const { isDark } = useAppTheme();
  const colors = useThemeColors();

  // Hydrate the auth token once, app-wide — so it's set on any route (incl.
  // deep links) and Supabase's onAuthStateChange keeps it fresh for the whole
  // session, rather than only while the index guard is mounted.
  useAuth();

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </QueryClientProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
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
