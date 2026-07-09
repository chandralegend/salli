"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AuthShell, GoogleIcon } from "@/components/auth/AuthShell";
import {
  useAuth,
  signInWithPassword,
  signInWithOAuth,
  isSupabaseConfigured,
} from "@/lib/auth";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const supabaseOn = isSupabaseConfigured();
  const [loading, setLoading] = useState(false);
  const [oauthBusy, setOauthBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signInWithPassword(email, password);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: "google" | "apple") {
    setOauthBusy(provider);
    setError("");
    try {
      await signInWithOAuth(provider); // redirects away
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
      setOauthBusy(null);
    }
  }

  function handleDevLogin() {
    login("dev-seed-user");
    router.replace("/dashboard");
  }

  return (
    <AuthShell title="Welcome back" subtitle="Your numbers are waiting.">
      {supabaseOn && (
        <div className="space-y-3 mb-5">
          <button
            type="button"
            onClick={() => handleOAuth("google")}
            disabled={!!oauthBusy}
            className="flex items-center justify-center gap-2.5 w-full py-3 border-[1.5px] border-border rounded-full bg-card text-[14px] font-semibold text-foreground cursor-pointer hover:bg-muted transition-colors disabled:opacity-50"
          >
            {oauthBusy === "google" ? <Loader2 className="size-4 animate-spin" /> : <GoogleIcon />}
            Continue with Google
          </button>
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[11px] text-muted-foreground font-semibold tracking-[0.08em] uppercase">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>
        </div>
      )}

      <form onSubmit={handleLogin} className="flex flex-col gap-3">
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={!supabaseOn}
          className="w-full px-4 py-3 border-[1.5px] border-border rounded-[14px] text-[14px] font-normal text-foreground bg-muted outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground disabled:opacity-50"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={!supabaseOn}
          className="w-full px-4 py-3 border-[1.5px] border-border rounded-[14px] text-[14px] font-normal text-foreground bg-muted outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground disabled:opacity-50"
        />
        <div className="text-right -mt-1">
          <Link href="/forgot-password" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">
            Forgot password?
          </Link>
        </div>

        {error && (
          <p className="text-[12px] text-rose-600 bg-rose-50 rounded-xl px-3 py-2.5 border border-rose-200">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !supabaseOn}
          className="w-full py-[14px] bg-[#010001] text-white border-none rounded-full text-[15px] font-bold cursor-pointer hover:bg-[#1a1a1a] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
        >
          {loading && <Loader2 className="size-4 animate-spin" />}
          Sign in
        </button>
      </form>

      <p className="text-[13.5px] text-muted-foreground text-center mt-4">
        New here?{" "}
        <Link href="/signup" className="text-foreground font-bold hover:underline">
          Create account
        </Link>
      </p>

      {!supabaseOn && (
        <div className="mt-5 border-t border-border/50 pt-4">
          <button
            type="button"
            onClick={handleDevLogin}
            className="w-full py-2.5 border border-border rounded-full text-[12px] text-muted-foreground hover:bg-muted transition-colors"
          >
            Dev login (skip auth)
          </button>
          <p className="text-[11px] text-muted-foreground/60 text-center mt-2">
            Supabase isn&apos;t configured — using the local dev account.
          </p>
        </div>
      )}
    </AuthShell>
  );
}
