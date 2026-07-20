import { create } from "zustand";

import type { ParsedEntryDraft } from "@/lib/api/types.gen";

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
}));
