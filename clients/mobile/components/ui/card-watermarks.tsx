import { View } from "react-native";
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { Landmark } from "lucide-react-native";

/** Mirrors clients/web/src/components/ui/card-watermarks.tsx (SVG shapes ported to react-native-svg). */

export function SparklineWatermark({ color = "#FFFFFF" }: { color?: string }) {
  const linePath =
    "M0,52 C20,48 30,38 45,40 C60,42 65,28 80,24 C95,20 105,32 120,26 C135,20 145,4 160,2 C175,0 185,8 200,0";
  const areaPath = `${linePath} L200,64 L0,64 Z`;
  return (
    <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, width: "100%", height: 80 }}>
      <Svg viewBox="0 0 200 64" preserveAspectRatio="none" width="100%" height="100%">
        <Defs>
          <LinearGradient id="sparkline-fade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={areaPath} fill="url(#sparkline-fade)" stroke="none" />
        <Path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" opacity={0.35} />
      </Svg>
    </View>
  );
}

export function BarsWatermark({ color = "#FFFFFF" }: { color?: string }) {
  const heights = [26, 34, 30, 42, 38, 50, 46];
  return (
    <View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: 80,
        flexDirection: "row",
        alignItems: "flex-end",
        gap: 3,
        opacity: 0.2,
      }}
    >
      {heights.map((h, i) => (
        <View key={i} style={{ flex: 1, height: h, borderTopLeftRadius: 3, borderTopRightRadius: 3, backgroundColor: color }} />
      ))}
    </View>
  );
}

export function RingWatermark({ color = "#FFFFFF" }: { color?: string }) {
  const r = 42;
  const circumference = 2 * Math.PI * r;
  const progress = 0.62;
  return (
    <View style={{ position: "absolute", right: 16, bottom: 16, width: 112, height: 112, opacity: 0.25 }}>
      <Svg viewBox="0 0 120 120" width="100%" height="100%">
        <Circle
          cx={60}
          cy={60}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeDasharray={`${circumference * progress} ${circumference}`}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
        />
      </Svg>
    </View>
  );
}

export function LandmarkWatermark({ color = "#171208" }: { color?: string }) {
  return (
    <View style={{ position: "absolute", right: -16, bottom: -16, opacity: 0.14 }}>
      <Landmark size={128} strokeWidth={1.25} color={color} />
    </View>
  );
}
