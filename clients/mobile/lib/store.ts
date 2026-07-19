import { create } from "zustand";

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
  requestQuickAddEntry: () => void;
};

export const useSalliStore = create<SalliStore>((set) => ({
  token: null,
  setToken: (token) => set({ token }),

  authReady: false,
  setAuthReady: (authReady) => set({ authReady }),

  onboardingComplete: false,
  setOnboardingComplete: (onboardingComplete) => set({ onboardingComplete }),

  quickAddEntryRequest: 0,
  requestQuickAddEntry: () =>
    set((s) => ({ quickAddEntryRequest: s.quickAddEntryRequest + 1 })),
}));
