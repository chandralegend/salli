import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

import type { ParsedEntryDraft } from "@/lib/api/types.gen";
import { TOUR_STEPS } from "@/lib/tour/steps";

const TOUR_COMPLETE_KEY = "salli-tour-complete";

export type TourRect = { x: number; y: number; width: number; height: number };

type SalliStore = {
  /** Bearer token (Supabase access_token, or the raw dev-login string). Lives here
   * rather than React context so interceptors/fetch wrappers can read it synchronously. */
  token: string | null;
  setToken: (token: string | null) => void;

  /** True once the initial session check has resolved (avoids a login-screen flash). */
  authReady: boolean;
  setAuthReady: (ready: boolean) => void;

  onboardingComplete: boolean;
  setOnboardingComplete: (complete: boolean) => void;

  /** Cross-screen signal: the floating "+" tab-bar button increments this so the
   * Ledger tab (wherever it's mounted) knows to open its New Entry modal. */
  quickAddEntryRequest: number;
  /** Optional AI-parsed draft to pre-fill the New Entry form (voice/text quick-add). */
  quickAddDraft: ParsedEntryDraft | null;
  requestQuickAddEntry: (draft?: ParsedEntryDraft | null) => void;

  /** Guided tour — the mobile equivalent of web's NextStepJS walkthrough.
   * `tourComplete` is AsyncStorage-backed (loaded once, see loadTourComplete),
   * same pattern as the dark-mode persistence in lib/theme.tsx. */
  tourComplete: boolean;
  tourActive: boolean;
  tourStepIndex: number;
  tourTargetRects: Record<string, TourRect>;
  loadTourComplete: () => Promise<void>;
  registerTourTarget: (id: string, rect: TourRect) => void;
  unregisterTourTarget: (id: string) => void;
  startTour: () => void;
  nextTourStep: () => void;
  prevTourStep: () => void;
  skipTour: () => void;
};

export const useSalliStore = create<SalliStore>((set) => ({
  token: null,
  setToken: (token) => set({ token }),

  authReady: false,
  setAuthReady: (authReady) => set({ authReady }),

  onboardingComplete: false,
  setOnboardingComplete: (onboardingComplete) => set({ onboardingComplete }),

  quickAddEntryRequest: 0,
  quickAddDraft: null,
  requestQuickAddEntry: (draft = null) =>
    set((s) => ({ quickAddEntryRequest: s.quickAddEntryRequest + 1, quickAddDraft: draft })),

  tourComplete: true, // assume complete until loadTourComplete resolves — never auto-starts on a stale/failed read
  tourActive: false,
  tourStepIndex: 0,
  tourTargetRects: {},

  loadTourComplete: async () => {
    const stored = await AsyncStorage.getItem(TOUR_COMPLETE_KEY);
    set({ tourComplete: stored === null ? false : stored === "true" });
  },

  registerTourTarget: (id, rect) =>
    set((s) => ({ tourTargetRects: { ...s.tourTargetRects, [id]: rect } })),
  unregisterTourTarget: (id) =>
    set((s) => {
      const next = { ...s.tourTargetRects };
      delete next[id];
      return { tourTargetRects: next };
    }),

  // Deliberately doesn't reset tourTargetRects: targets already mounted (e.g.
  // the tab bar, the dashboard) only register on mount/relayout, not on tour
  // start, so clearing the map here would wipe their rects with nothing left
  // to re-trigger onLayout — the exact cause of early steps showing no spotlight.
  startTour: () => set({ tourActive: true, tourStepIndex: 0 }),
  nextTourStep: () =>
    set((s) => {
      if (s.tourStepIndex >= TOUR_STEPS.length - 1) {
        AsyncStorage.setItem(TOUR_COMPLETE_KEY, "true");
        return { tourActive: false, tourComplete: true };
      }
      return { tourStepIndex: s.tourStepIndex + 1 };
    }),
  prevTourStep: () => set((s) => ({ tourStepIndex: Math.max(0, s.tourStepIndex - 1) })),
  skipTour: () => {
    AsyncStorage.setItem(TOUR_COMPLETE_KEY, "true");
    set({ tourActive: false, tourComplete: true });
  },
}));
