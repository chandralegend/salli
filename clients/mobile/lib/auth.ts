import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect } from "react";

import { getSupabase, isSupabaseConfigured } from "./supabase";
import { useSalliStore } from "./store";

const DEV_TOKEN_KEY = "salli_dev_token";

/**
 * Hydrates the store's token/authReady from whichever auth source is active,
 * and keeps token fresh via Supabase's onAuthStateChange (fires on its own
 * auto-refresh, so no separate refresh-timer logic is needed here).
 */
export function useAuth() {
  const token = useSalliStore((s) => s.token);
  const authReady = useSalliStore((s) => s.authReady);
  const setToken = useSalliStore((s) => s.setToken);
  const setAuthReady = useSalliStore((s) => s.setAuthReady);

  useEffect(() => {
    let cancelled = false;

    if (!isSupabaseConfigured()) {
      AsyncStorage.getItem(DEV_TOKEN_KEY).then((stored) => {
        if (!cancelled) {
          setToken(stored);
          setAuthReady(true);
        }
      });
      return;
    }

    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) {
        setToken(data.session?.access_token ?? null);
        setAuthReady(true);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setToken(session?.access_token ?? null);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [setToken, setAuthReady]);

  return { token, authReady };
}

/** Dev-only: log in with a raw token string (== user id) when Supabase isn't configured. */
export async function devLogin(rawToken: string): Promise<void> {
  await AsyncStorage.setItem(DEV_TOKEN_KEY, rawToken);
  useSalliStore.getState().setToken(rawToken);
}

export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpWithPassword(email: string, password: string) {
  const { data, error } = await getSupabase().auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function sendPasswordReset(email: string) {
  const { error } = await getSupabase().auth.resetPasswordForEmail(email);
  if (error) throw error;
}

export async function logout(): Promise<void> {
  if (isSupabaseConfigured()) {
    await getSupabase().auth.signOut();
  } else {
    await AsyncStorage.removeItem(DEV_TOKEN_KEY);
  }
  useSalliStore.getState().setToken(null);
}
