"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MailCheck } from "lucide-react";
import { AuthShell, GoogleIcon, AppleIcon } from "@/components/auth/AuthShell";
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
        router.replace("/onboarding"); // auto-confirmed
      } else {
        setSent(true); // needs email confirmation
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
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <MailCheck className="size-5 text-primary" />
          </div>
          <p className="text-[13px] text-muted-foreground max-w-xs">
            We sent a confirmation link to <span className="font-medium text-foreground">{email}</span>.
            Open it to activate your account, then sign in.
          </p>
          <Button variant="outline" onClick={() => router.replace("/login")}>
            Back to sign in
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create your account" subtitle="Start tracking your finances and tax.">
      {supabaseOn && (
        <div className="space-y-2.5 mb-5">
          <Button
            variant="outline"
            className="w-full h-10 gap-2.5 text-[13px]"
            onClick={() => handleOAuth("google")}
            disabled={!!oauthBusy}
          >
            {oauthBusy === "google" ? <Loader2 className="size-4 animate-spin" /> : <GoogleIcon />}
            Continue with Google
          </Button>
          <Button
            variant="outline"
            className="w-full h-10 gap-2.5 text-[13px]"
            onClick={() => handleOAuth("apple")}
            disabled={!!oauthBusy}
          >
            {oauthBusy === "apple" ? <Loader2 className="size-4 animate-spin" /> : <AppleIcon />}
            Continue with Apple
          </Button>
          <div className="flex items-center gap-3 py-1">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[11px] text-muted-foreground">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>
        </div>
      )}

      <form onSubmit={handleSignup} className="space-y-3.5">
        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium">Email</Label>
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={!supabaseOn}
            className="h-10 text-[13px]"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium">Password</Label>
          <Input
            type="password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            disabled={!supabaseOn}
            className="h-10 text-[13px]"
          />
        </div>

        {error && (
          <p className="text-[12px] text-rose-600 bg-rose-50 rounded-md px-3 py-2 border border-rose-200">
            {error}
          </p>
        )}

        <Button type="submit" disabled={loading || !supabaseOn} className="w-full h-10">
          {loading && <Loader2 className="size-3.5 mr-2 animate-spin" />}
          Create account
        </Button>
      </form>

      {!supabaseOn && (
        <p className="text-[12px] text-muted-foreground text-center mt-4 bg-muted rounded-md px-3 py-2">
          Sign up needs Supabase configured. Use{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Dev login
          </Link>{" "}
          for local testing.
        </p>
      )}

      <p className="text-[12px] text-muted-foreground text-center mt-5">
        Already have an account?{" "}
        <Link href="/login" className="text-primary font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
