import { View, Text, Pressable } from "react-native";
import { useThemeColors } from "@/lib/theme";

export type TileVariant = "mint" | "teal" | "lime" | "dark" | "card";
export type BadgeVariant = "green" | "amber" | "red" | "neutral";

// mint/teal/lime/dark are theme-invariant brand tiles (fixed across light/dark,
// matching web's page-shell.tsx) — only "card" follows the active theme.
const FIXED_TILE_COLORS: Record<Exclude<TileVariant, "card">, { bg: string; label: string; sub: string; value: string }> = {
  mint: { bg: "#A5FFB9", label: "rgba(0,0,0,0.45)", sub: "rgba(0,0,0,0.35)", value: "#010001" },
  teal: { bg: "#D5E9EA", label: "rgba(0,0,0,0.45)", sub: "rgba(0,0,0,0.35)", value: "#010001" },
  lime: { bg: "#E8FC85", label: "rgba(0,0,0,0.45)", sub: "rgba(0,0,0,0.35)", value: "#010001" },
  dark: { bg: "#010001", label: "rgba(255,255,255,0.3)", sub: "rgba(255,255,255,0.28)", value: "#E8FC85" },
};

const BADGE_COLORS: Record<BadgeVariant, { bg: string; text: string }> = {
  green: { bg: "#DCFCE7", text: "#16A34A" },
  amber: { bg: "#FEF3C7", text: "#D97706" },
  red: { bg: "#FEE2E2", text: "#DC2626" },
  neutral: { bg: "rgba(0,0,0,0.1)", text: "#010001" },
};

const DARK_NEUTRAL_BADGE = { bg: "rgba(255,255,255,0.12)", text: "#E8FC85" };

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
}

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
}: BentoTileProps) {
  const theme = useThemeColors();
  const c =
    variant === "card"
      ? { bg: theme.card, label: theme.mutedForeground, sub: theme.mutedForeground, value: theme.foreground }
      : FIXED_TILE_COLORS[variant];
  const isDark = variant === "dark";
  const rawBadge = BADGE_COLORS[badgeVariant];
  const badgeBg = isDark && badgeVariant === "neutral" ? DARK_NEUTRAL_BADGE.bg : rawBadge.bg;
  const badgeText = isDark && badgeVariant === "neutral" ? DARK_NEUTRAL_BADGE.text : rawBadge.text;

  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper
      onPress={onPress}
      style={[
        { backgroundColor: c.bg, borderRadius: 20, padding: 18, minHeight, justifyContent: "space-between" },
        style,
      ]}
    >
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
