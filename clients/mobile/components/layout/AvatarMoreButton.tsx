import { useRouter } from "expo-router";
import { Text } from "react-native";

import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { profileInitial, useProfile } from "@/hooks/useMore";

/** Header avatar button → More hub. `.avatar` from the mockup: a 44px rounded
 *  square on the surface colour with a 2px ink border and the initial in ink —
 *  not a filled accent circle. Orange is reserved for state now, and an
 *  always-orange avatar was the loudest thing on an otherwise quiet screen.
 *
 *  It reads the profile itself rather than taking an `initial` prop. The prop
 *  is why Home showed a hardcoded "D" for every user: the literal came off the
 *  mockup's demo name and nothing ever replaced it. There is no profile picture
 *  to show — the API's profile carries only display_name, email and id — so the
 *  initial is the whole of what exists.
 */
export function AvatarMoreButton() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const initial = profileInitial(profile);

  return (
    <AnimatedPressable
      onPress={() => router.push("/(tabs)/more")}
      accessibilityRole="button"
      accessibilityLabel={profile?.display_name ? `More · ${profile.display_name}` : "More"}
      className="h-11 w-11 items-center justify-center rounded-[11px] border-2 border-foreground bg-card"
    >
      <Text className="font-sans-extrabold text-[17px] text-foreground">{initial}</Text>
    </AnimatedPressable>
  );
}
