import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { View } from "react-native";
import { vars } from "nativewind";

const STORAGE_KEY = "salli-dark";

// Mirrors global.css :root / .dark — kept in sync by hand since NativeWind's
// vars() needs plain JS values, not CSS custom properties, for RN Modal content
// (which portals outside the styled tree and loses the ambient CSS vars).
const DARK = {
  "--color-background": "0 0 0",
  "--color-foreground": "255 255 255",
  "--color-card": "26 26 26",
  "--color-card-foreground": "255 255 255",
  "--color-popover": "26 26 26",
  "--color-popover-foreground": "255 255 255",
  "--color-primary": "255 255 255",
  "--color-primary-foreground": "0 0 0",
  "--color-muted": "17 17 17",
  "--color-muted-foreground": "179 179 179",
  "--color-destructive": "239 68 68",
};

const LIGHT = {
  "--color-background": "245 245 247",
  "--color-foreground": "10 10 10",
  "--color-card": "255 255 255",
  "--color-card-foreground": "10 10 10",
  "--color-popover": "255 255 255",
  "--color-popover-foreground": "10 10 10",
  "--color-primary": "10 10 10",
  "--color-primary-foreground": "255 255 255",
  "--color-muted": "237 237 240",
  "--color-muted-foreground": "100 100 105",
  "--color-destructive": "220 38 38",
};

/** Resolved hex, for inline style={} use (SVG strokes, chart libs, etc. that
 * can't consume Tailwind classes). Accent is fixed across both themes. */
const COLORS = {
  dark: {
    background: "#000000",
    foreground: "#FFFFFF",
    card: "#1A1A1A",
    muted: "#111111",
    mutedForeground: "#B3B3B3",
    primary: "#FFFFFF",
    primaryForeground: "#000000",
    border: "rgba(255,255,255,0.1)",
    accent: "#2563EB",
  },
  light: {
    background: "#F5F5F7",
    foreground: "#0A0A0A",
    card: "#FFFFFF",
    muted: "#EDEDF0",
    mutedForeground: "#64646A",
    primary: "#0A0A0A",
    primaryForeground: "#FFFFFF",
    border: "rgba(10,10,10,0.08)",
    accent: "#2563EB",
  },
} as const;

type ThemeContextValue = {
  isDark: boolean;
  toggle: () => void;
  setDark: (dark: boolean) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(true); // dark is the mockup's default identity

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored !== null) setIsDark(stored === "true");
    });
  }, []);

  const setDark = (dark: boolean) => {
    setIsDark(dark);
    AsyncStorage.setItem(STORAGE_KEY, String(dark));
  };

  const value = useMemo<ThemeContextValue>(
    () => ({ isDark, toggle: () => setDark(!isDark), setDark }),
    [isDark],
  );

  const themeVars = useMemo(() => vars(isDark ? DARK : LIGHT), [isDark]);

  return (
    <ThemeContext.Provider value={value}>
      <View style={[{ flex: 1 }, themeVars]}>{children}</View>
    </ThemeContext.Provider>
  );
}

export function useAppTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useAppTheme must be used within ThemeProvider");
  return ctx;
}

/** For RN <Modal> content — portals outside the tree, so vars() must be reapplied. */
export function useThemeVars() {
  const { isDark } = useAppTheme();
  return vars(isDark ? DARK : LIGHT);
}

/** Resolved hex object for inline style={} use (SVG, charts, native components). */
export function useThemeColors() {
  const { isDark } = useAppTheme();
  return isDark ? COLORS.dark : COLORS.light;
}

export function useDarkModeToggle() {
  const { isDark, toggle } = useAppTheme();
  return { isDark, toggle };
}
