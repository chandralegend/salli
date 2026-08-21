import { StyleSheet, useWindowDimensions, View } from "react-native";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";

import { useAppTheme } from "@/lib/theme";

type Field = { cx: string; cy: string; rx: number; ry: number; color: string; peakOpacity: number };

/**
 * Ambient warm-glow background — soft blurred radial color fields, not visible
 * circles or hard gradient edges. Built with react-native-svg's RadialGradient
 * (already a project dependency) rather than expo-blur (blurs content *behind*
 * it, doesn't paint fields) or LinearGradient (axis-based, can't feather
 * radially) — multi-stop radial fills give a true soft falloff natively, with
 * no blur pass needed. Static for now; the brief doesn't call for motion here.
 */
export function SalliBackground({ intensity = "subtle" }: { intensity?: "subtle" | "strong" }) {
  const { width, height } = useWindowDimensions();
  const { isDark } = useAppTheme();
  const scale = intensity === "strong" ? 1.5 : 1;
  const themeScale = isDark ? 1 : 0.45; // barely-there tints on a bright cream base

  const fields: Field[] = [
    { cx: "20%", cy: "42%", rx: width * 0.9, ry: height * 0.4, color: "#7B2A20", peakOpacity: 0.22 },
    { cx: "88%", cy: "78%", rx: width * 0.85, ry: height * 0.38, color: "#F15A32", peakOpacity: 0.16 },
    ...(isDark
      ? [{ cx: "82%", cy: "12%", rx: width * 0.7, ry: height * 0.25, color: "#3A2A1E", peakOpacity: 0.08 }]
      : []),
  ];

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      <Svg width={width} height={height}>
        <Defs>
          {fields.map((f, i) => (
            // No cx/cy/r passed here: RadialGradient defaults to gradientUnits
            // "objectBoundingBox" (cx=cy=50%, r=50%), which auto-stretches to
            // fill whatever shape it's applied to — so it fills the Ellipse
            // below edge-to-edge (elliptically) without a separate rx/ry prop
            // (radialGradient itself has no rx/ry attribute in SVG).
            <RadialGradient key={i} id={`glow-${i}`}>
              <Stop offset="0%" stopColor={f.color} stopOpacity={f.peakOpacity * scale * themeScale} />
              <Stop offset="60%" stopColor={f.color} stopOpacity={(f.peakOpacity * scale * themeScale) / 3} />
              <Stop offset="100%" stopColor={f.color} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        {fields.map((f, i) => (
          <Ellipse key={i} cx={f.cx} cy={f.cy} rx={f.rx} ry={f.ry} fill={`url(#glow-${i})`} />
        ))}
      </Svg>
    </View>
  );
}
