"use client";

import { useEffect } from "react";
import { useSalliStore, getStoredToken, setStoredToken, getOnboardingComplete, setOnboardingComplete } from "./store";
import { getSupabase, isSupabaseConfigured } from "./supabase";
import { API_URL } from "./api-client";

const SITE_URL =
  typeof window !== "undefined" ? window.location.origin : "";

export function useAuth() {
  const { token, setToken } = useSalliStore();

  // Keep the bearer token in sync. With Supabase, the access token (and its
  // refreshes) is mirrored into localStorage so the existing API interceptor
  // keeps working. Without Supabase (local dev) we just read the stored token.
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      const stored = getStoredToken();
      if (stored && !token) setToken(stored);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      const t = data.session?.access_token ?? null;
      setStoredToken(t);
      setToken(t);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const t = session?.access_token ?? null;
      setStoredToken(t);
      setToken(t);
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Dev-login path (no Supabase): the token IS the user id. */
  function login(newToken: string) {
    setStoredToken(newToken);
    setToken(newToken);
  }

  async function logout() {
    const supabase = getSupabase();
    if (supabase) await supabase.auth.signOut();
    setStoredToken(null);
    setToken(null);
  }

  return { token: token ?? getStoredToken(), login, logout };
}

// ── Supabase auth actions (used by login / signup pages) ──────────────────────

export async function signInWithPassword(email: string, password: string) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpWithPassword(email: string, password: string) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${SITE_URL}/auth/callback` },
  });
  if (error) throw error;
  return data;
}

export async function signInWithOAuth(provider: "google" | "apple") {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${SITE_URL}/auth/callback` },
  });
  if (error) throw error;
}

export async function sendPasswordReset(email: string) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${SITE_URL}/auth/callback`,
  });
  if (error) throw error;
}

/**
 * Where to send a user right after a session is established: the onboarding
 * wizard if their profile isn't complete yet, otherwise the dashboard.
 * Mirrors the check in `(app)/layout.tsx` so login/signup/OAuth all land in
 * the right place immediately instead of flashing the dashboard first.
 */
export async function resolvePostLoginRoute(token: string): Promise<string> {
  if (getOnboardingComplete()) return "/dashboard";
  try {
    const res = await fetch(`${API_URL}/onboarding/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data: { complete: boolean } = await res.json();
    if (data.complete) {
      setOnboardingComplete();
      return "/dashboard";
    }
    return "/onboarding";
  } catch {
    return "/dashboard"; // network error — don't block the app
  }
}

export { isSupabaseConfigured };
