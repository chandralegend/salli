import { View, Text } from "react-native";

interface LogoProps {
  /** Outer square size in px. Font size is derived to match the web badge's 48cqw ratio. */
  size?: number;
  radius?: number;
  bg?: string;
  fg?: string;
  className?: string;
}

/** The "රු" wordmark badge — mirrors clients/web/src/components/Logo.tsx. */
export function Logo({ size = 40, radius, bg = "#010001", fg = "#E8FC85", className }: LogoProps) {
  const r = radius ?? Math.round(size * 0.26);
  return (
    <View
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: r,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
      accessibilityRole="image"
      accessibilityLabel="Salli"
    >
      <Text
        style={{
          color: fg,
          fontFamily: "DMSans_900Black",
          fontSize: size * 0.48,
          lineHeight: size * 0.56,
          letterSpacing: -1,
        }}
      >
        රු
      </Text>
    </View>
  );
}
