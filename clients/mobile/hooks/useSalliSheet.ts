import { useRouter } from "expo-router";
import { useCallback } from "react";

import { useSalliStore } from "@/lib/store";

/**
 * Opening and closing Salli.
 *
 * This replaces `useModeSwitch`, and the rename is the point. Salli and Pro
 * Mode were two "modes" you switched between, which meant the app had to hold a
 * stored mode, a boot branch, and an edge-swipe that toggled the two. The store
 * and the visible screen could disagree, and did: the old hook's own docstring
 * records a bug where the first swipe out of Salli silently corrected the store
 * instead of moving, so it took two swipes to leave.
 *
 * Salli is now a sheet presented over Pro Mode. There is nothing to keep in
 * sync, because the navigator itself is the only record of whether it is open.
 *
 * `mode` survives in the store, but it now answers a much smaller question:
 * should Salli be open when the app launches. See app/index.tsx.
 */
export function useSalliSheet() {
  const router = useRouter();
  const setMode = useSalliStore((s) => s.setMode);

  /**
   * Remembering the last surface used, so a chat-first user keeps landing in
   * chat. Writing it here rather than at each call site is what stops the two
   * from drifting, which was the original hook's whole job.
   */
  const open = useCallback(() => {
    setMode("buddy");
    router.push("/(buddy)");
  }, [router, setMode]);

  const close = useCallback(() => {
    setMode("pro");
    // `back`, not a push to /(tabs): the sheet sits on top of Pro Mode, so
    // dismissing it must pop rather than stack another copy underneath.
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  }, [router, setMode]);

  return { open, close };
}
