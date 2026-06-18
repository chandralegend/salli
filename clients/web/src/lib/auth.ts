"use client";

import { useEffect } from "react";
import { useSalliStore, getStoredToken, setStoredToken } from "./store";

export function useAuth() {
  const { token, setToken } = useSalliStore();

  useEffect(() => {
    const stored = getStoredToken();
    if (stored && !token) {
      setToken(stored);
    }
  }, [token, setToken]);

  function login(newToken: string) {
    setStoredToken(newToken);
    setToken(newToken);
  }

  function logout() {
    setStoredToken(null);
    setToken(null);
  }

  return { token: token ?? getStoredToken(), login, logout };
}
