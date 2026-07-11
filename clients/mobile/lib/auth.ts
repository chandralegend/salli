import { useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSalliStore } from "./store";
import { getSupabase, isSupabaseConfigured } from "./supabase";

const DEV_TOKEN_KEY = "salli_dev_token";

async function getStoredDevToken(): Promise<string | null> {
  return AsyncStorage.getItem(DEV_TOKEN_KEY);
}

async function setStoredDevToken(token: string | null): Promise<void> {
  if (token) await AsyncStorage.setItem(DEV_TOKEN_KEY, token);
  else await AsyncStorage.removeItem(DEV_TOKEN_KEY);
}

/**
 * Hydrates the in-memory token from Supabase (or the dev-login fallback) on
 * mount, then keeps it in sync via onAuthStateChange. The token is read
 * synchronously from the zustand store by the API client's request
 * interceptor — see lib/api-client.ts.
 */
export function useAuth() {
  const { token, setToken, authReady, setAuthReady } = useSalliStore();

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      getStoredDevToken().then((t) => {
        setToken(t);
        setAuthReady(true);
      });
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token ?? null);
      setAuthReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setToken(session?.access_token ?? null);
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Dev-login path (no Supabase): the token IS the user id. */
  async function login(newToken: string) {
    await setStoredDevToken(newToken);
    setToken(newToken);
  }

  async function logout() {
    const supabase = getSupabase();
    if (supabase) await supabase.auth.signOut();
    await setStoredDevToken(null);
    setToken(null);
  }

  return { token, authReady, login, logout };
}

// ── Supabase auth actions (used by login / signup screens) ────────────────────

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
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function sendPasswordReset(email: string) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

export { isSupabaseConfigured };
