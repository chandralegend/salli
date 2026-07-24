import { Text, View } from "react-native";

type LogoProps = {
  size?: number;
  radius?: number;
  bg?: string;
  fg?: string;
  className?: string;
};

/** White rounded-square badge with the Sinhala "රු" wordmark — theme-invariant
 * (always white bg / red-orange glyph), per the mockup's Login/Onboarding hero. */
export function Logo({ size = 80, radius, bg = "#FFFFFF", fg = "#f5310f", className }: LogoProps) {
  const r = radius ?? Math.round(size * 0.3);
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
      }}
    >
      <Text
        style={{
          fontFamily: "BricolageGrotesque_700Bold",
          fontSize: Math.round(size * 0.42),
          color: fg,
        }}
      >
        රු
      </Text>
    </View>
  );
}
