import { useRouter } from "expo-router";
import { Text } from "react-native";

import { AnimatedPressable } from "@/components/ui/animated-pressable";

type AvatarMoreButtonProps = {
  initial?: string;
};

/** Header avatar button → More hub. `.avatar` from the mockup: a 44px rounded
 *  square on the surface colour with a 2px ink border and the initial in ink —
 *  not a filled accent circle. Orange is reserved for state now, and an
 *  always-orange avatar was the loudest thing on an otherwise quiet screen. */
export function AvatarMoreButton({ initial = "?" }: AvatarMoreButtonProps) {
  const router = useRouter();
  return (
    <AnimatedPressable
      onPress={() => router.push("/(tabs)/more")}
      accessibilityRole="button"
      accessibilityLabel="More"
      className="h-11 w-11 items-center justify-center rounded-[11px] border-2 border-foreground bg-card"
    >
      <Text className="font-sans-extrabold text-[17px] text-foreground">{initial}</Text>
    </AnimatedPressable>
  );
}
