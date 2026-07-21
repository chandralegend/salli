"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard, AuthDivider, GoogleIcon } from "@/components/auth/AuthCard";
import {
  useAuth,
  signInWithPassword,
  signInWithOAuth,
  resolvePostLoginRoute,
  isSupabaseConfigured,
} from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const supabaseReady = isSupabaseConfigured();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { session } = await signInWithPassword(email, password);
      const token = session?.access_token;
      if (!token) throw new Error("No session returned");
      router.replace(await resolvePostLoginRoute(token));
    } catch {
      setError("Invalid email or password.");
      setBusy(false);
    }
  }

  async function handleDevLogin() {
    setBusy(true);
    const token = "dev-seed-user";
    login(token);
    router.replace(await resolvePostLoginRoute(token));
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to your Salli account"
      footer={
        <span>
          No account?{" "}
          <Link href="/signup" className="font-medium text-foreground hover:underline">
            Create one
          </Link>
        </span>
      }
    >
      {supabaseReady && (
        <>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => signInWithOAuth("google").catch(() => setError("Google sign-in failed."))}
          >
            <GoogleIcon /> Continue with Google
          </Button>
          <AuthDivider />
        </>
      )}

      {supabaseReady ? (
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
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-[13px] text-muted-foreground hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-[13px] text-destructive">{error}</p>}
          <Button type="submit" className="w-full h-11" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : "Sign in"}
          </Button>
        </form>
      ) : (
        <div className="space-y-3">
          <p className="text-[13px] text-muted-foreground">
            Supabase isn&apos;t configured — local development mode.
          </p>
          <Button className="w-full h-11" onClick={handleDevLogin} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : "Dev login (skip auth)"}
          </Button>
        </div>
      )}
    </AuthCard>
  );
}
