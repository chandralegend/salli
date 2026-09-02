import { useRouter } from "expo-router";
import { Text } from "react-native";

import { AnimatedPressable } from "@/components/ui/animated-pressable";

type AvatarMoreButtonProps = {
  initial?: string;
};

/** Header avatar button → More hub. Mockup: a filled blue circle with the
 * user's first-initial (not a hamburger/User icon). */
export function AvatarMoreButton({ initial = "?" }: AvatarMoreButtonProps) {
  const router = useRouter();
  return (
    <AnimatedPressable
      onPress={() => router.push("/(tabs)/more")}
      accessibilityRole="button"
      accessibilityLabel="More"
      className="h-11 w-11 items-center justify-center rounded-full border-2 border-foreground bg-salli-accent"
    >
      <Text className="font-sans-bold text-[17px] text-white">{initial}</Text>
    </AnimatedPressable>
  );
}
