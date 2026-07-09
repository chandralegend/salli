"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, MailCheck } from "lucide-react";
import { AuthShell, GoogleIcon } from "@/components/auth/AuthShell";
import {
  signUpWithPassword,
  signInWithOAuth,
  isSupabaseConfigured,
} from "@/lib/auth";

export default function SignupPage() {
  const router = useRouter();
  const supabaseOn = isSupabaseConfigured();
  const [loading, setLoading] = useState(false);
  const [oauthBusy, setOauthBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { session } = await signUpWithPassword(email, password);
      if (session) {
        router.replace("/onboarding");
      } else {
        setSent(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: "google" | "apple") {
    setOauthBusy(provider);
    setError("");
    try {
      await signInWithOAuth(provider);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
      setOauthBusy(null);
    }
  }

  if (sent) {
    return (
      <AuthShell title="Check your inbox" subtitle="One more step to get started.">
        <div className="flex flex-col items-center text-center gap-4 py-6">
          <div className="w-14 h-14 rounded-2xl bg-[#E8FC85] flex items-center justify-center">
            <MailCheck className="size-6 text-[#010001]" />
          </div>
          <p className="text-[13px] text-muted-foreground max-w-xs leading-relaxed">
            We sent a confirmation link to{" "}
            <span className="font-semibold text-foreground">{email}</span>.
            Open it to activate your account, then sign in.
          </p>
          <Link
            href="/login"
            className="border border-border rounded-full px-5 py-2.5 text-[13.5px] font-bold text-foreground hover:bg-muted transition-colors"
          >
            Back to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create account" subtitle="Your FIRE journey starts here.">
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

      <form onSubmit={handleSignup} className="flex flex-col gap-3">
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
          placeholder="Password (min 8 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          disabled={!supabaseOn}
          className="w-full px-4 py-3 border-[1.5px] border-border rounded-[14px] text-[14px] font-normal text-foreground bg-muted outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground disabled:opacity-50"
        />

        {error && (
          <p className="text-[12px] text-rose-600 bg-rose-50 rounded-xl px-3 py-2.5 border border-rose-200">
            {error}
          </p>
        )}

        {!supabaseOn && (
          <p className="text-[12px] text-muted-foreground text-center bg-muted rounded-xl px-3 py-2.5">
            Sign up needs Supabase.{" "}
            <Link href="/login" className="text-foreground font-semibold hover:underline">
              Dev login instead
            </Link>
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !supabaseOn}
          className="w-full py-[14px] bg-[#010001] text-white border-none rounded-full text-[15px] font-bold cursor-pointer hover:bg-[#1a1a1a] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
        >
          {loading && <Loader2 className="size-4 animate-spin" />}
          Create account
        </button>
      </form>

      <p className="text-[13.5px] text-muted-foreground text-center mt-4">
        Have an account?{" "}
        <Link href="/login" className="text-foreground font-bold hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
