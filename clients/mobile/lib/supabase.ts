import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

let _client: SupabaseClient | null = null;

/** True when Supabase env is configured (prod). When false, the app uses dev-login. */
export function isSupabaseConfigured(): boolean {
  return Boolean(URL && ANON);
}

/** Returns the singleton Supabase client, or null if not configured. */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!_client) {
    _client = createClient(URL as string, ANON as string, {
      auth: {
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return _client;
}
