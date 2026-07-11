import { create } from "zustand";

interface SalliStore {
  token: string | null;
  setToken: (token: string | null) => void;
  authReady: boolean;
  setAuthReady: (v: boolean) => void;
  onboardingComplete: boolean;
  setOnboardingComplete: (v: boolean) => void;
  /** Set by the floating dock's "+" button; Ledger opens its New Entry modal in response. */
  quickAddEntryRequest: number;
  requestQuickAddEntry: () => void;
}

export const useSalliStore = create<SalliStore>((set) => ({
  token: null,
  setToken: (token) => set({ token }),
  authReady: false,
  setAuthReady: (v) => set({ authReady: v }),
  onboardingComplete: false,
  setOnboardingComplete: (v) => set({ onboardingComplete: v }),
  quickAddEntryRequest: 0,
  requestQuickAddEntry: () => set((s) => ({ quickAddEntryRequest: s.quickAddEntryRequest + 1 })),
}));
