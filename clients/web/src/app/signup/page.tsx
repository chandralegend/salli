"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard, AuthDivider, GoogleIcon, AppleIcon } from "@/components/auth/AuthCard";
import { signUpWithPassword, signInWithOAuth, isSupabaseConfigured } from "@/lib/auth";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const supabaseReady = isSupabaseConfigured();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      const { session } = await signUpWithPassword(email, password);
      if (session) {
        router.replace("/onboarding");
      } else {
        setSentTo(email);
      }
    } catch {
      setError("Couldn't create the account. Try a different email.");
    } finally {
      setBusy(false);
    }
  }

  if (sentTo) {
    return (
      <AuthCard title="" footer={<Link href="/login" className="hover:underline">Back to sign in</Link>}>
        <div className="flex flex-col items-center text-center gap-3 py-4">
          <div className="size-12 rounded-full bg-muted flex items-center justify-center">
            <MailCheck className="size-6 text-muted-foreground" />
          </div>
          <p className="text-[20px] font-semibold">Check your inbox</p>
          <p className="text-sm text-muted-foreground">
            We sent a confirmation link to <span className="font-medium text-foreground">{sentTo}</span>.
            Click it to activate your account.
          </p>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Create account"
      subtitle="Free to start. No card required."
      footer={
        <span>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground hover:underline">
            Sign in
          </Link>
        </span>
      }
    >
      {supabaseReady ? (
        <>
          <div className="space-y-2.5">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => signInWithOAuth("apple").catch(() => setError("Apple sign-in failed."))}
            >
              <AppleIcon /> Continue with Apple
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => signInWithOAuth("google").catch(() => setError("Google sign-in failed."))}
            >
              <GoogleIcon /> Continue with Google
            </Button>
          </div>
          <AuthDivider />
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">At least 8 characters</p>
            </div>
            {error && <p className="text-[13px] text-destructive">{error}</p>}
            <Button type="submit" className="w-full h-11" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : "Create account"}
            </Button>
          </form>
        </>
      ) : (
        <p className="text-[13px] text-muted-foreground">
          Supabase isn&apos;t configured. Use{" "}
          <Link href="/login" className="font-medium text-foreground hover:underline">
            dev login
          </Link>{" "}
          instead.
        </p>
      )}
    </AuthCard>
  );
}
