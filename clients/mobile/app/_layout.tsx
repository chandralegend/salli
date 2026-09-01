import "../global.css";
import "../lib/api-client";

import {
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
  Archivo_800ExtraBold,
  Archivo_900Black,
} from "@expo-google-fonts/archivo";
import {
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from "@expo-google-fonts/bricolage-grotesque";
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from "@expo-google-fonts/jetbrains-mono";
import { useFonts } from "expo-font";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";

import { EdgeSwipeModeSwitcher } from "@/components/layout/EdgeSwipeModeSwitcher";
import { TourOverlay } from "@/components/tour/TourOverlay";
import { ToastHost } from "@/components/ui/toast-host";
import { useAuth } from "../lib/auth";
import { usePurchasesIdentity } from "../hooks/usePurchases";
import { useSalliStore } from "../lib/store";
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
  // Keeps RevenueCat's app_user_id equal to the Supabase user id for the life
  // of the app. Mounted here rather than on the billing screen because a
  // purchase can complete while that screen is not open.
  usePurchasesIdentity();

  const loadMode = useSalliStore((s) => s.loadMode);
  useEffect(() => {
    loadMode();
  }, [loadMode]);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <EdgeSwipeModeSwitcher>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        />
      </EdgeSwipeModeSwitcher>
      <TourOverlay />
      <ToastHost />
    </QueryClientProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_700Bold,
    Archivo_800ExtraBold,
    Archivo_900Black,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });

  useEffect(() => {
    // .catch: a Fast Refresh full reload re-runs this module (re-arming
    // preventAutoHideAsync) without a new native splash screen to hide,
    // which rejects with "No native splash screen registered" — dev-only
    // noise, harmless, but otherwise surfaces as an unhandled rejection.
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}
