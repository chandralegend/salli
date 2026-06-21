"use client";

import { create } from "zustand";

interface SalliStore {
  token: string | null;
  setToken: (token: string | null) => void;
  onboardingComplete: boolean;
  setOnboardingComplete: (v: boolean) => void;
}

export const useSalliStore = create<SalliStore>((set) => ({
  token: null,
  setToken: (token) => set({ token }),
  onboardingComplete: false,
  setOnboardingComplete: (v) => set({ onboardingComplete: v }),
}));

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
