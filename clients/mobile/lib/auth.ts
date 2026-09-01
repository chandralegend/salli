import AsyncStorage from "@react-native-async-storage/async-storage";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import * as Linking from "expo-linking";
import { useEffect } from "react";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";

import { getSupabase, isSupabaseConfigured } from "./supabase";
import { useSalliStore } from "./store";

WebBrowser.maybeCompleteAuthSession();

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
  const setUserId = useSalliStore((s) => s.setUserId);
  const setAuthReady = useSalliStore((s) => s.setAuthReady);

  useEffect(() => {
    let cancelled = false;

    if (!isSupabaseConfigured()) {
      AsyncStorage.getItem(DEV_TOKEN_KEY).then((stored) => {
        if (!cancelled) {
          setToken(stored);
          // With no Supabase configured the backend treats the bearer token as
          // the user id, so the two are the same string here.
          setUserId(stored);
          setAuthReady(true);
        }
      });
      return;
    }

    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) {
        setToken(data.session?.access_token ?? null);
        setUserId(data.session?.user?.id ?? null);
        setAuthReady(true);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setToken(session?.access_token ?? null);
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [setToken, setUserId, setAuthReady]);

  return { token, authReady };
}

/** Dev-only: log in with a raw token string (== user id) when Supabase isn't configured. */
export async function devLogin(rawToken: string): Promise<void> {
  await AsyncStorage.setItem(DEV_TOKEN_KEY, rawToken);
  useSalliStore.getState().setToken(rawToken);
  useSalliStore.getState().setUserId(rawToken);
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

/** Extracts OAuth redirect params from either the URL hash (implicit flow,
 * `#access_token=...`) or query string, whichever the provider used. */
function parseRedirectParams(url: string): Record<string, string> {
  const fragment = url.split("#")[1] ?? url.split("?")[1] ?? "";
  return Object.fromEntries(new URLSearchParams(fragment));
}

/** Google via the system browser: Supabase issues the provider URL, the user
 * completes sign-in in an in-app browser tab, and the redirect back into the
 * app (via our `salli://` scheme) carries the session tokens in the URL. */
export async function signInWithGoogle(): Promise<void> {
  const redirectTo = Linking.createURL("auth/callback");
  const { data, error } = await getSupabase().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error("No sign-in URL returned.");

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success" || !result.url) {
    throw new Error("Google sign-in was cancelled.");
  }

  const params = parseRedirectParams(result.url);
  if (params.error) throw new Error(params.error_description ?? params.error);
  if (!params.access_token || !params.refresh_token) {
    throw new Error("Google sign-in did not return a session.");
  }

  const { error: sessionError } = await getSupabase().auth.setSession({
    access_token: params.access_token,
    refresh_token: params.refresh_token,
  });
  if (sessionError) throw sessionError;
}

/** Sign in with Apple is iOS-only (and requires a physical/simulator device
 * signed into an Apple ID) — gate the button on this before rendering it. */
export function isAppleAuthAvailable(): Promise<boolean> {
  if (Platform.OS !== "ios") return Promise.resolve(false);
  return AppleAuthentication.isAvailableAsync();
}

/** Native "Sign in with Apple" — the nonce round-trip (raw → SHA-256 → Apple,
 * raw → Supabase) is Supabase's documented way to verify the identity token
 * actually belongs to this sign-in attempt. */
export async function signInWithApple(): Promise<void> {
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });

  if (!credential.identityToken) {
    throw new Error("Apple sign-in did not return an identity token.");
  }

  const { error } = await getSupabase().auth.signInWithIdToken({
    provider: "apple",
    token: credential.identityToken,
    nonce: rawNonce,
  });
  if (error) throw error;
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
