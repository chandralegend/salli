"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSupabaseLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseKey) {
        setError("Supabase not configured. Use Dev Login.");
        return;
      }
      const { createClient } = await import("@supabase/supabase-js");
      const sb = createClient(supabaseUrl, supabaseKey);
      const { data, error: authError } = await sb.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) throw authError;
      const token = data.session?.access_token;
      if (!token) throw new Error("No token returned");
      login(token);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  function handleDevLogin() {
    login("dev-user");
    router.replace("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8">
          <span className="w-6 h-6 rounded-sm bg-primary" />
          <span className="text-xl font-semibold text-foreground tracking-tight">
            salli
          </span>
        </div>

        <h1 className="text-2xl font-semibold text-foreground mb-1">
          Sign in
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Personal finance & tax for Sri Lanka
        </p>

        <form onSubmit={handleSupabaseLogin} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="email" className="text-muted-foreground text-xs mb-1.5">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-secondary border-border"
              required
            />
          </div>
          <div>
            <Label htmlFor="password" className="text-muted-foreground text-xs mb-1.5">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-secondary border-border"
              required
            />
          </div>

          {error && (
            <p className="text-expense text-sm">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="bg-primary text-primary-foreground hover:bg-primary/90 w-full"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Sign in
          </Button>
        </form>

        <div className="mt-4 pt-4 border-t border-border">
          <Button
            variant="outline"
            className="w-full border-border text-muted-foreground hover:text-foreground"
            onClick={handleDevLogin}
          >
            Dev Login (skip auth)
          </Button>
          <p className="text-[11px] text-muted-foreground text-center mt-2">
            Sets token to &quot;dev-user&quot; — requires dev fallback on backend
          </p>
        </div>
      </div>
    </div>
  );
}
