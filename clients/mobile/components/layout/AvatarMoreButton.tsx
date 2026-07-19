import { useRouter } from "expo-router";
import { Pressable, Text } from "react-native";

type AvatarMoreButtonProps = {
  initial?: string;
};

/** Header avatar button → More hub. Mockup: a filled blue circle with the
 * user's first-initial (not a hamburger/User icon). */
export function AvatarMoreButton({ initial = "?" }: AvatarMoreButtonProps) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push("/(tabs)/more")}
      accessibilityRole="button"
      accessibilityLabel="More"
      className="h-9 w-9 items-center justify-center rounded-full bg-salli-accent"
    >
      <Text className="font-sans-bold text-[15px] text-white">{initial}</Text>
    </Pressable>
  );
}
