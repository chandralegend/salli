import { type ReactNode } from "react";
import { View, Text, Pressable } from "react-native";
import { useThemeColors, useAppTheme } from "@/lib/theme";

export type TileVariant =
  | "mint"
  | "teal"
  | "lime"
  | "dark"
  | "card"
  | "navy"
  | "green"
  | "purple"
  | "blueGrey"
  | "gold";
export type BadgeVariant = "green" | "amber" | "red" | "neutral";

// mint/teal/lime/dark/navy/green/purple/blueGrey/gold are theme-invariant brand
// tiles (fixed across light/dark, matching web's page-shell.tsx) — only "card"
// follows the active theme.
const FIXED_TILE_COLORS: Record<Exclude<TileVariant, "card">, { bg: string; label: string; sub: string; value: string }> = {
  mint: { bg: "#A5FFB9", label: "rgba(0,0,0,0.45)", sub: "rgba(0,0,0,0.35)", value: "#010001" },
  teal: { bg: "#D5E9EA", label: "rgba(0,0,0,0.45)", sub: "rgba(0,0,0,0.35)", value: "#010001" },
  lime: { bg: "#E8FC85", label: "rgba(0,0,0,0.45)", sub: "rgba(0,0,0,0.35)", value: "#010001" },
  dark: { bg: "#010001", label: "rgba(255,255,255,0.3)", sub: "rgba(255,255,255,0.28)", value: "#E8FC85" },
  navy: { bg: "#132b40", label: "rgba(255,255,255,0.45)", sub: "rgba(255,255,255,0.4)", value: "#FFFFFF" },
  green: { bg: "#57bc83", label: "rgba(0,0,0,0.4)", sub: "rgba(0,0,0,0.4)", value: "#FFFFFF" },
  purple: { bg: "#7668be", label: "rgba(255,255,255,0.5)", sub: "rgba(255,255,255,0.45)", value: "#FFFFFF" },
  blueGrey: { bg: "#6f9daa", label: "rgba(255,255,255,0.5)", sub: "rgba(255,255,255,0.45)", value: "#FFFFFF" },
  gold: { bg: "#e7bd61", label: "rgba(23,18,8,0.55)", sub: "rgba(23,18,8,0.5)", value: "#171208" },
};

// Tiles whose bg is dark enough to need white/light text (mirrors web's LIGHT_TEXT_TONES).
const LIGHT_TEXT_TONES = new Set<TileVariant>(["dark", "navy", "green", "purple", "blueGrey"]);

const LIGHT_BADGE_COLORS: Record<BadgeVariant, { bg: string; text: string }> = {
  green: { bg: "#DCFCE7", text: "#16A34A" },
  amber: { bg: "#FEF3C7", text: "#D97706" },
  red: { bg: "#FEE2E2", text: "#DC2626" },
  neutral: { bg: "rgba(0,0,0,0.1)", text: "#010001" },
};

const DARK_BADGE_COLORS: Record<BadgeVariant, { bg: string; text: string }> = {
  green: { bg: "rgba(52,211,153,0.15)", text: "#6EE7B7" },
  amber: { bg: "rgba(251,191,36,0.15)", text: "#FCD34D" },
  red: { bg: "rgba(251,113,133,0.15)", text: "#FDA4AF" },
  neutral: { bg: "rgba(255,255,255,0.12)", text: "#F0EEE8" },
};

const DARK_NEUTRAL_ON_BLACK_TILE = { bg: "rgba(255,255,255,0.12)", text: "#E8FC85" };

interface BentoTileProps {
  variant?: TileVariant;
  label: string;
  sub?: string;
  value: string;
  suffix?: string;
  badge?: string;
  badgeVariant?: BadgeVariant;
  onPress?: () => void;
  minHeight?: number;
  style?: object;
  /** Small circular icon badge, top-right corner (e.g. an <Icon /> from lucide-react-native). */
  icon?: ReactNode;
  /** Decorative low-opacity background layer (sparkline/bars/ring/etc). Clipped to the tile's rounded corners. */
  watermark?: ReactNode;
}

const TILE_PADDING = 18;

/** Mirrors clients/web/src/components/ui/page-shell.tsx BentoTile. */
export function BentoTile({
  variant = "card",
  label,
  sub,
  value,
  suffix,
  badge,
  badgeVariant = "neutral",
  onPress,
  minHeight = 130,
  style,
  icon,
  watermark,
}: BentoTileProps) {
  const theme = useThemeColors();
  const { isDark: appIsDark } = useAppTheme();
  const c =
    variant === "card"
      ? { bg: theme.card, label: theme.mutedForeground, sub: theme.mutedForeground, value: theme.foreground }
      : FIXED_TILE_COLORS[variant];
  const isBlackTile = variant === "dark";
  const lightText = variant === "card" ? appIsDark : LIGHT_TEXT_TONES.has(variant);
  const rawBadge = (appIsDark ? DARK_BADGE_COLORS : LIGHT_BADGE_COLORS)[badgeVariant];
  const badgeBg = isBlackTile && badgeVariant === "neutral" ? DARK_NEUTRAL_ON_BLACK_TILE.bg : rawBadge.bg;
  const badgeText = isBlackTile && badgeVariant === "neutral" ? DARK_NEUTRAL_ON_BLACK_TILE.text : rawBadge.text;
  const iconBg = lightText ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.08)";

  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper
      onPress={onPress}
      style={[
        {
          backgroundColor: c.bg,
          borderRadius: 20,
          padding: TILE_PADDING,
          minHeight,
          justifyContent: "space-between",
          overflow: "hidden",
        },
        style,
      ]}
    >
      {watermark && (
        <View style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} pointerEvents="none">
          {watermark}
        </View>
      )}

      {icon && (
        <View
          style={{
            position: "absolute",
            top: TILE_PADDING,
            right: TILE_PADDING,
            width: 30,
            height: 30,
            borderRadius: 15,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: iconBg,
          }}
        >
          {icon}
        </View>
      )}

      <View>
        <Text
          style={{ fontSize: 10.5, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", color: c.label }}
        >
          {label}
        </Text>
        {sub && <Text style={{ fontSize: 11, color: c.sub, marginTop: 3 }}>{sub}</Text>}
      </View>
      <View>
        <Text style={{ fontSize: 28, fontWeight: "900", letterSpacing: -1, color: c.value, marginBottom: 6 }}>
          {value}
          {suffix ? <Text style={{ fontSize: 15 }}>{suffix}</Text> : null}
        </Text>
        {badge && (
          <View style={{ backgroundColor: badgeBg, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, alignSelf: "flex-start" }}>
            <Text style={{ fontSize: 10.5, fontWeight: "800", color: badgeText }}>{badge}</Text>
          </View>
        )}
      </View>
    </Wrapper>
  );
}

export { TILE_PADDING };

/**
 * Color to pass to an <Icon /> element used as BentoTile's `icon` prop, matched to the
 * tile's text tone. "card" tiles follow the active app theme, so this must be a hook.
 */
export function useTileIconColor(variant: TileVariant): string {
  const { isDark: appIsDark } = useAppTheme();
  const lightText = variant === "card" ? appIsDark : LIGHT_TEXT_TONES.has(variant);
  return lightText ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.55)";
}
