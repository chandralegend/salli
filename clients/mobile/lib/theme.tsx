import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { View } from "react-native";
import { vars } from "nativewind";

const STORAGE_KEY = "salli-dark";

// Mirrors global.css :root / .dark — kept in sync by hand since NativeWind's
// vars() needs plain JS values, not CSS custom properties, for RN Modal content
// (which portals outside the styled tree and loses the ambient CSS vars).
// Warm-charcoal system (UI refresh): brand/base (#F15A32) is now constant across
// themes — only the neutral surfaces shift between warm-charcoal (dark) and
// warm-cream (light), not the brand color itself.
const DARK = {
  "--color-background": "16 15 14",
  "--color-foreground": "245 242 239",
  "--color-card": "26 23 21",
  "--color-card-foreground": "245 242 239",
  "--color-popover": "26 23 21",
  "--color-popover-foreground": "245 242 239",
  "--color-primary": "245 242 239",
  "--color-primary-foreground": "16 15 14",
  "--color-muted": "33 27 24",
  "--color-muted-foreground": "142 137 133",
  "--color-destructive": "239 68 68",
  "--color-salli-accent": "241 90 50",
};

const LIGHT = {
  "--color-background": "247 243 239",
  "--color-foreground": "28 24 21",
  "--color-card": "255 255 255",
  "--color-card-foreground": "28 24 21",
  "--color-popover": "255 255 255",
  "--color-popover-foreground": "28 24 21",
  "--color-primary": "28 24 21",
  "--color-primary-foreground": "247 243 239",
  "--color-muted": "240 233 226",
  "--color-muted-foreground": "122 115 112",
  "--color-destructive": "220 38 38",
  "--color-salli-accent": "241 90 50",
};

/** Resolved hex, for inline style={} use (SVG strokes, chart libs, etc. that
 * can't consume Tailwind classes). Brand tokens (accent/accentBright/glowDeep)
 * are theme-invariant; only neutral surfaces/text shift dark↔light. */
const COLORS = {
  dark: {
    background: "#100F0E",
    foreground: "#F5F2EF",
    card: "#1A1715",
    muted: "#211B18",
    mutedForeground: "#8E8985",
    primary: "#F5F2EF",
    primaryForeground: "#100F0E",
    border: "rgba(255,255,255,0.08)",
    accent: "#F15A32",
    accentBright: "#FF784E",
    accentSoft: "rgba(241,90,50,0.18)",
    glowDeep: "#7B2A20",
    bubbleAgent: "rgba(245,242,239,0.07)",
    bubbleUser: "rgba(241,90,50,0.16)",
    success: "#1b6b47",
  },
  light: {
    background: "#F7F3EF",
    foreground: "#1C1815",
    card: "#FFFFFF",
    muted: "#F0E9E2",
    mutedForeground: "#7A7370",
    primary: "#1C1815",
    primaryForeground: "#F7F3EF",
    border: "rgba(28,24,21,0.08)",
    accent: "#F15A32",
    accentBright: "#FF784E",
    accentSoft: "rgba(241,90,50,0.12)",
    glowDeep: "#7B2A20",
    bubbleAgent: "rgba(28,24,21,0.045)",
    bubbleUser: "rgba(241,90,50,0.13)",
    success: "#1b6b47",
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
