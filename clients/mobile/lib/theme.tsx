import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme, View } from "react-native";
import { vars } from "nativewind";

export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "salli-theme-mode";
/** Pre-"Device option" installs stored a plain "true"/"false" boolean under
 * this key — read once as a fallback so upgrading users keep their explicit
 * choice instead of silently landing on "system". */
const LEGACY_STORAGE_KEY = "salli-dark";

// Mirrors global.css :root / .dark — kept in sync by hand since NativeWind's
// vars() needs plain JS values, not CSS custom properties, for RN Modal content
// (which portals outside the styled tree and loses the ambient CSS vars).
// Neutral system: brand/base (#F15A32) is constant across themes; the neutrals
// are a plain white canvas in light and a true-black canvas in dark, with
// surfaces raised on iOS's own system greys.
//
// NOTE — these two objects are what Tailwind classes actually resolve to.
// COLORS below is a *separate* copy for inline style={} use. Editing one and
// not the other silently leaves every `bg-background`/`text-foreground` on the
// old palette while inline styles move, which looks like a caching bug.
const DARK = {
  "--color-background": "0 0 0",
  "--color-foreground": "255 255 255",
  "--color-card": "28 28 30",
  "--color-card-foreground": "255 255 255",
  "--color-popover": "28 28 30",
  "--color-popover-foreground": "255 255 255",
  "--color-primary": "255 255 255",
  "--color-primary-foreground": "0 0 0",
  "--color-muted": "44 44 46",
  "--color-muted-foreground": "152 152 159",
  "--color-destructive": "239 68 68",
  "--color-salli-accent": "241 90 50",
};

const LIGHT = {
  "--color-background": "255 255 255",
  "--color-foreground": "0 0 0",
  "--color-card": "255 255 255",
  "--color-card-foreground": "0 0 0",
  "--color-popover": "255 255 255",
  "--color-popover-foreground": "0 0 0",
  "--color-primary": "0 0 0",
  "--color-primary-foreground": "255 255 255",
  "--color-muted": "242 242 247",
  "--color-muted-foreground": "108 108 112",
  "--color-destructive": "220 38 38",
  "--color-salli-accent": "241 90 50",
};

/** Resolved hex, for inline style={} use (SVG strokes, chart libs, etc. that
 * can't consume Tailwind classes). Brand tokens (accent/accentBright)
 * are theme-invariant; only neutral surfaces/text shift dark↔light. */
const COLORS = {
  dark: {
    background: "#000000",
    foreground: "#FFFFFF",
    card: "#1C1C1E",
    muted: "#2C2C2E",
    mutedForeground: "#98989F",
    primary: "#FFFFFF",
    primaryForeground: "#000000",
    border: "rgba(255,255,255,0.12)",
    accent: "#F15A32",
    accentBright: "#FF784E",
    accentSoft: "rgba(241,90,50,0.18)",
    bubbleUser: "rgba(241,90,50,0.16)",
    success: "#1b6b47",
  },
  light: {
    background: "#FFFFFF",
    foreground: "#000000",
    card: "#FFFFFF",
    muted: "#F2F2F7",
    mutedForeground: "#6C6C70",
    primary: "#000000",
    primaryForeground: "#FFFFFF",
    border: "rgba(0,0,0,0.12)",
    accent: "#F15A32",
    accentBright: "#FF784E",
    accentSoft: "rgba(241,90,50,0.12)",
    bubbleUser: "rgba(241,90,50,0.13)",
    success: "#1b6b47",
  },
} as const;

type ThemeContextValue = {
  isDark: boolean;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  // "system" is the default for fresh installs — falls back to whatever the
  // OS is set to until a stored preference (new or legacy) resolves.
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(async (stored) => {
      if (stored === "light" || stored === "dark" || stored === "system") {
        setModeState(stored);
        return;
      }
      const legacy = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy !== null) setModeState(legacy === "true" ? "dark" : "light");
    });
  }, []);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
  };

  const isDark = mode === "system" ? systemScheme === "dark" : mode === "dark";

  const value = useMemo<ThemeContextValue>(() => ({ isDark, mode, setMode }), [isDark, mode]);

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

export function useThemeMode() {
  const { mode, isDark, setMode } = useAppTheme();
  return { mode, isDark, setMode };
}
