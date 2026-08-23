import { Stack } from "expo-router";

/** Buddy Mode fully replaces the tab UI while active — no tab bar, just this
 * one fullscreen chat screen. Pro Mode's (tabs) group is untouched by this. */
export default function BuddyLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="voice" />
    </Stack>
  );
}
