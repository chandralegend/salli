import { Text, View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";

import { BLOUB, BLOUB_VIEWBOX } from "@/components/agent/bloub-geometry";
import { useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** Frontal eyes, matching the app icon.
 *
 * Deliberately not any of the mascot's moods: every one of those places the
 * eyes off-centre and tilted, which is what makes a live face look like it is
 * paying attention, and what makes a 28px logo look like it is falling over.
 * The icon generator (scripts/make_brand_assets.py) uses these same numbers. */
const EYE = { x: 30, y: 2, rx: 11.9, ry: 26.4 };
const OUTLINE_GROW = (192 + 16) / 192;

/**
 * Salli's face, as a mark.
 *
 * The same silhouette as the app icon and as Bloub in the conversation, taken
 * from the one geometry file so the three cannot drift apart.
 */
export function Mark({ size = 30 }: { size?: number }) {
  const colors = useThemeColors();
  return (
    <Svg width={size} height={size} viewBox={BLOUB_VIEWBOX}>
      {/* The outline is a larger copy of the same path rather than a stroke, so
          its corners stay as round as the body's. */}
      <Path d={BLOUB.neutral.bodyMask} fill={colors.background} scale={OUTLINE_GROW} />
      <Path d={BLOUB.neutral.bodyMask} fill={colors.accent} />
      {[-EYE.x, EYE.x].map((cx) => (
        <Rect
          key={cx}
          x={cx - EYE.rx}
          y={EYE.y - EYE.ry}
          width={EYE.rx * 2}
          height={EYE.ry * 2}
          rx={EYE.rx}
          fill={colors.foreground}
        />
      ))}
    </Svg>
  );
}

/**
 * The brand lockup: the mark, then the wordmark.
 *
 * The wordmark alone used to stand for the whole brand here, which meant the
 * first screen of the app shared nothing with the icon the user had just
 * tapped. Pass `markOnly` where the name is already on screen.
 */
export function Logo({
  size = 40,
  markOnly = false,
  className,
}: {
  size?: number;
  markOnly?: boolean;
  className?: string;
}) {
  const colors = useThemeColors();
  if (markOnly) return <Mark size={size} />;

  return (
    <View className={cn("flex-row items-center", className)} style={{ gap: size * 0.28 }}>
      <Mark size={size * 1.08} />
      <Text
        style={{
          fontFamily: "BricolageGrotesque_800ExtraBold",
          fontSize: size,
          letterSpacing: size * -0.04,
          color: colors.foreground,
        }}
      >
        Salli
        <Text className="text-salli-accent">.</Text>
      </Text>
    </View>
  );
}
