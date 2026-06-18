"use client";

import { create } from "zustand";

interface SalliStore {
  token: string | null;
  setToken: (token: string | null) => void;
  threadId: string;
  setThreadId: (id: string) => void;
}

export const useSalliStore = create<SalliStore>((set) => ({
  token: null,
  setToken: (token) => set({ token }),
  threadId: crypto.randomUUID(),
  setThreadId: (id) => set({ threadId: id }),
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
