import { Stack } from "expo-router";

export default function BuddyLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      {/* Voice Mode takes over the whole screen and is a *mode*, not a place
          you drill into — a rise from the bottom reads that way, where the
          default push-from-the-right reads like another page of chat. */}
      <Stack.Screen name="voice" options={{ animation: "slide_from_bottom" }} />
    </Stack>
  );
}
