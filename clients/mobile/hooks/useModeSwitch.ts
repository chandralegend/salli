import { useRouter } from "expo-router";
import { useCallback } from "react";

import { useSalliStore, type AppMode } from "@/lib/store";

const HREF: Record<AppMode, "/(buddy)" | "/(tabs)"> = {
  buddy: "/(buddy)",
  pro: "/(tabs)",
};

/**
 * The only way to move between Buddy Mode and Pro Mode.
 *
 * Navigating and setting the stored mode have to happen together. Several places
 * used to do just the navigation — the tab bar's "Salli AI", the dashboard's
 * "Ask Salli AI", the retired-agent redirect — which left the store saying "pro"
 * while the user was looking at Buddy Mode. The edge-swipe reads that store to
 * decide where to go, so the first swipe out of Buddy would compute
 * `targetMode = "buddy"`, quietly correct the store, and re-navigate to the
 * screen already on show. It took two swipes to reach Pro Mode.
 *
 * Routing every entry point through here means the store and the visible screen
 * cannot disagree.
 */
export function useModeSwitch() {
  const router = useRouter();
  const setMode = useSalliStore((s) => s.setMode);

  const enter = useCallback(
    (mode: AppMode, opts?: { replace?: boolean }) => {
      setMode(mode);
      if (opts?.replace) router.replace(HREF[mode]);
      else router.push(HREF[mode]);
    },
    [router, setMode],
  );

  return {
    enter,
    enterBuddy: useCallback(() => enter("buddy"), [enter]),
    enterPro: useCallback(() => enter("pro"), [enter]),
  };
}
