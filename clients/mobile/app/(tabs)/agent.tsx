import { useEffect } from "react";

import { useSalliSheet } from "@/hooks/useSalliSheet";

/**
 * Pro Mode's "Salli" tab presents the Salli sheet rather than navigating to its
 * own screen. This stub only exists because Expo Router's <Tabs> needs a real
 * screen per visible tab entry; FloatingTabBar already intercepts the press, so
 * this fires only as defence against a stray deep link to /(tabs)/agent.
 */
export default function AgentTabRedirect() {
  const { open } = useSalliSheet();
  useEffect(() => {
    open();
  }, [open]);
  return null;
}
