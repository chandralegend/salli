import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { vars } from "nativewind";

/** Matches web's localStorage key name ("salli-dark") for the same preference. */
export const DARK_MODE_STORAGE_KEY = "salli-dark";

/**
 * NativeWind's own `colorScheme.set()` delegates to React Native's
 * `Appearance.setColorScheme()` on native, which is a no-op unless the host
 * app's native binary implements that override — Expo Go's fixed pre-built
 * binary doesn't reliably support it, so toggling silently did nothing.
 * This provider instead drives theming via `vars()` (CSS custom properties
 * scoped to a root View) from our own React state, independent of the
 * native Appearance API — the same `bg-background`/`text-foreground`/etc.
 * classes throughout the app already resolve `var(--color-*)`, so they pick
 * this up with no per-component changes. Only raw Tailwind-palette classes
 * using the `dark:` variant (e.g. `bg-emerald-50 dark:bg-emerald-950`) still
 * depend on NativeWind's own flag and won't respond to this — those are
 * driven by `useAppTheme().isDark` conditionals instead.
 */

/** Mirrors clients/web/src/app/globals.css :root / .dark — keep both in sync. */
const LIGHT_VARS = {
  "--color-background": "#F1F7F7",
  "--color-foreground": "#010001",
  "--color-card": "#FFFFFF",
  "--color-card-foreground": "#010001",
  "--color-popover": "#FFFFFF",
  "--color-popover-foreground": "#010001",
  "--color-primary": "#010001",
  "--color-primary-foreground": "#FFFFFF",
  "--color-secondary": "#E4EFEF",
  "--color-secondary-foreground": "#010001",
  "--color-muted": "#E4EFEF",
  "--color-muted-foreground": "#7DA6A9",
  "--color-accent": "#E4EFEF",
  "--color-accent-foreground": "#010001",
  "--color-destructive": "#DC2626",
  "--color-border": "#D5E9EA",
  "--color-input": "#D5E9EA",
  "--color-ring": "#7DA6A9",
};

const DARK_VARS = {
  "--color-background": "#111110",
  "--color-foreground": "#F0EEE8",
  "--color-card": "#1C1C1A",
  "--color-card-foreground": "#F0EEE8",
  "--color-popover": "#1C1C1A",
  "--color-popover-foreground": "#F0EEE8",
  "--color-primary": "#E8FC85",
  "--color-primary-foreground": "#010001",
  "--color-secondary": "#242422",
  "--color-secondary-foreground": "#F0EEE8",
  "--color-muted": "#242422",
  "--color-muted-foreground": "#7DA6A9",
  "--color-accent": "#242422",
  "--color-accent-foreground": "#F0EEE8",
  "--color-destructive": "#EF4444",
  "--color-border": "#2E2E2C",
  "--color-input": "#2E2E2C",
  "--color-ring": "#7DA6A9",
};

/** Resolved hex values for components using inline `style={{}}` rather than className. */
const LIGHT = {
  background: "#F1F7F7",
  foreground: "#010001",
  card: "#FFFFFF",
  cardForeground: "#010001",
  primary: "#010001",
  primaryForeground: "#FFFFFF",
  secondary: "#E4EFEF",
  muted: "#E4EFEF",
  mutedForeground: "#7DA6A9",
  border: "#D5E9EA",
  destructive: "#DC2626",
};

const DARK = {
  background: "#111110",
  foreground: "#F0EEE8",
  card: "#1C1C1A",
  cardForeground: "#F0EEE8",
  primary: "#E8FC85",
  primaryForeground: "#010001",
  secondary: "#242422",
  muted: "#242422",
  mutedForeground: "#7DA6A9",
  border: "#2E2E2C",
  destructive: "#EF4444",
};

export type ThemeColors = typeof LIGHT;

interface ThemeContextValue {
  isDark: boolean;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({ isDark: false, toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(DARK_MODE_STORAGE_KEY).then((stored) => {
      if (stored === "1") setIsDark(true);
    });
  }, []);

  function toggle() {
    setIsDark((prev) => {
      const next = !prev;
      AsyncStorage.setItem(DARK_MODE_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggle }}>
      <View style={[{ flex: 1 }, vars(isDark ? DARK_VARS : LIGHT_VARS)]}>{children}</View>
    </ThemeContext.Provider>
  );
}

export function useAppTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

/**
 * React Native's `Modal` portals its content outside the normal view tree
 * (confirmed: it renders as a sibling of the root, not a descendant) — so it
 * never sees the `vars()` CSS variables applied by `ThemeProvider` above.
 * Every `<Modal>`'s outermost content View must also apply this so its
 * `bg-background`/`text-foreground`/etc. classes resolve to the right theme.
 */
export function useThemeVars() {
  const { isDark } = useAppTheme();
  return vars(isDark ? DARK_VARS : LIGHT_VARS);
}

/** For components using inline `style={{}}` (BentoTile, DeadlineChip, PostingRow). */
export function useThemeColors(): ThemeColors {
  const { isDark } = useAppTheme();
  return isDark ? DARK : LIGHT;
}

/** Dark mode toggle for Settings. */
export function useDarkModeToggle(): ThemeContextValue {
  return useAppTheme();
}

/** Same shape as nativewind's useColorScheme, backed by our own context instead. */
export function useColorScheme() {
  const { isDark, toggle } = useAppTheme();
  return {
    colorScheme: (isDark ? "dark" : "light") as "dark" | "light",
    setColorScheme: (scheme: "dark" | "light" | "system") => {
      const wantDark = scheme === "dark";
      if (wantDark !== isDark) toggle();
    },
    toggleColorScheme: toggle,
  };
}
