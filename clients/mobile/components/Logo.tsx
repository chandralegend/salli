import { Text } from "react-native";
import { cn } from "@/lib/utils";

type LogoProps = {
  size?: number;
  className?: string;
};

/** "Salli." wordmark — the same logotype used on the marketing site
 * (Bricolage Grotesque, extra-bold, with an accent-colored trailing period),
 * ported here so the brand mark reads consistently across web, mobile, and
 * the marketing site instead of three different treatments. */
export function Logo({ size = 40, className }: LogoProps) {
  return (
    <Text
      className={cn(className)}
      style={{
        fontFamily: "BricolageGrotesque_800ExtraBold",
        fontSize: size,
        letterSpacing: size * -0.04,
      }}
    >
      Salli
      <Text className="text-salli-accent">.</Text>
    </Text>
  );
}
