import { Redirect, Stack } from "expo-router";

import { useSalliStore } from "@/lib/store";
import { useThemeColors } from "@/lib/theme";

export default function AuthLayout() {
  const colors = useThemeColors();
  const token = useSalliStore((s) => s.token);
  const authReady = useSalliStore((s) => s.authReady);

  // Leaving the auth group is a property of being signed in, not something each
  // button has to remember to do.
  //
  // Every route in this group used to navigate by hand after a successful
  // sign-in, and the social buttons — shared by login and signup — never did.
  // So Apple sign-in worked completely: the sheet appeared, the identity token
  // came back, Supabase opened a session and `onAuthStateChange` put the token
  // in the store. Then the app sat on the login screen, because `app/index.tsx`
  // is the only route that reads the token to decide where to go and it had
  // already been replaced by this group. Google had the same hole.
  //
  // Watching the token here fixes every sign-in route at once, including any
  // added later, and it also removes a race the hand-navigation had: a
  // `router.replace("/")` fired the instant an await resolved could reach the
  // index guard before the token reached the store, which bounced the user
  // straight back here.
  if (authReady && token) return <Redirect href="/" />;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
  );
}
