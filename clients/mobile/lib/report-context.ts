import Constants from "expo-constants";
import { Platform } from "react-native";

import type { BugContext } from "@/lib/api/types.gen";
import { useSalliStore } from "@/lib/store";

/**
 * Diagnostic snapshot attached to a bug report — mirrors web's report-context.ts
 * allow-list discipline (hand-written fields only, nothing scraped), but scoped
 * to what this app can actually populate. Deliberately omitted vs web:
 *  - `recent_failures` / `client_error` — no diagnostics module or error
 *    boundary exists on mobile to source them from.
 *  - `token_exp` — no JWT-parsing helper exists here.
 * Better to leave a field out than to fake it.
 */
export function buildReportContext(route: string, theme: "dark" | "light"): BugContext {
  return {
    route,
    app_commit: Constants.expoConfig?.version ?? null,
    user_agent: `Salli/${Constants.expoConfig?.version ?? "?"} (${Platform.OS} ${Platform.Version})`,
    language: Intl.DateTimeFormat().resolvedOptions().locale ?? null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? null,
    theme,
    onboarding_complete: useSalliStore.getState().onboardingComplete,
  };
}
