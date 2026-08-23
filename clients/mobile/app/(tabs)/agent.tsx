import { useRouter } from "expo-router";
import { useEffect } from "react";

/**
 * Pro Mode's "Salli AI" tab now enters Buddy Mode directly instead of its own
 * screen — the separate Scrooge persona/tone is retired. This stub only exists
 * because Expo Router's <Tabs> needs a real screen per visible tab entry;
 * FloatingTabBar already intercepts the tab press and navigates straight to
 * /(buddy), so this only fires as defense-in-depth against a stray deep link.
 */
export default function AgentTabRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/(buddy)");
  }, [router]);
  return null;
}
