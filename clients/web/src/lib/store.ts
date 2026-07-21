"use client";

import { create } from "zustand";

interface SalliStore {
  token: string | null;
  setToken: (token: string | null) => void;
  onboardingComplete: boolean;
  setOnboardingComplete: (v: boolean) => void;
  /** Incrementing counter — bump it to signal "open the new-entry flow" from
   * anywhere (e.g. the mobile bottom-dock's + button) without route coupling.
   * Since the request usually fires just before a route change (a fresh
   * mount of the ledger page), the "already consumed" marker must live here
   * too — a component-local ref can't tell "new request" from "request that
   * fired before I mounted" once the page has remounted. */
  quickAddEntryRequest: number;
  quickAddEntryConsumed: number;
  requestQuickAddEntry: () => void;
  consumeQuickAddEntry: () => void;
}

export const useSalliStore = create<SalliStore>((set, get) => ({
  token: null,
  setToken: (token) => set({ token }),
  onboardingComplete: false,
  setOnboardingComplete: (v) => set({ onboardingComplete: v }),
  quickAddEntryRequest: 0,
  quickAddEntryConsumed: 0,
  requestQuickAddEntry: () => set((s) => ({ quickAddEntryRequest: s.quickAddEntryRequest + 1 })),
  consumeQuickAddEntry: () => set({ quickAddEntryConsumed: get().quickAddEntryRequest }),
}));

// ── Scrooge panel ─────────────────────────────────────────────────────────────

const PANEL_MIN_WIDTH = 320;
const PANEL_DEFAULT_WIDTH = 460;

function readStoredWidth(): number {
  if (typeof window === "undefined") return PANEL_DEFAULT_WIDTH;
  const v = parseInt(localStorage.getItem("scrooge_panel_width") ?? "", 10);
  return !isNaN(v) && v >= PANEL_MIN_WIDTH ? v : PANEL_DEFAULT_WIDTH;
}

interface ScroogePanelStore {
  isOpen: boolean;
  threadId: string;
  width: number;
  isFullPage: boolean;
  /** Question queued by a CTA (dashboard pills) for the composer to pick up. */
  pendingPrompt: string | null;
  open: (threadId?: string) => void;
  openWithPrompt: (prompt: string) => void;
  consumePendingPrompt: () => void;
  close: () => void;
  toggle: () => void;
  setThread: (id: string) => void;
  setWidth: (w: number) => void;
  toggleFullPage: () => void;
}

const initialThreadId = () =>
  typeof globalThis.crypto !== "undefined" ? globalThis.crypto.randomUUID() : `t-${Date.now()}`;

export const useScroogePanel = create<ScroogePanelStore>((set) => ({
  isOpen: false,
  threadId: initialThreadId(),
  width: readStoredWidth(),
  isFullPage: false,
  pendingPrompt: null,
  open: (threadId?: string) =>
    set((s) => ({ isOpen: true, threadId: threadId ?? s.threadId })),
  openWithPrompt: (prompt: string) => set({ isOpen: true, pendingPrompt: prompt }),
  consumePendingPrompt: () => set({ pendingPrompt: null }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  setThread: (id: string) => set({ threadId: id }),
  setWidth: (w: number) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("scrooge_panel_width", String(w));
    }
    set({ width: w });
  },
  toggleFullPage: () => set((s) => ({ isFullPage: !s.isFullPage })),
}));

export { PANEL_MIN_WIDTH };

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("salli_token");
}

export function setStoredToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem("salli_token", token);
  } else {
    localStorage.removeItem("salli_token");
  }
}

export function getOnboardingComplete(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("salli_onboarding_complete") === "true";
}

export function setOnboardingComplete(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("salli_onboarding_complete", "true");
}
