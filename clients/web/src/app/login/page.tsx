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
      const { data, error: authError } = await sb.auth.signInWithPassword({ email, password });
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
      <div className="w-full max-w-[340px]">
        {/* Wordmark */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-foreground text-background font-bold text-base mb-4">
            S
          </div>
          <h1 className="text-[20px] font-semibold tracking-tight text-foreground">Salli</h1>
          <p className="text-meta mt-1">Personal finance &amp; tax · Sri Lanka</p>
        </div>

        {/* Card */}
        <div className="bg-card rounded-xl ring-1 ring-foreground/8 shadow-sm overflow-hidden">
          <div className="px-6 py-5">
            <form onSubmit={handleSupabaseLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[12px] font-medium text-foreground">Email</Label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-9 text-[13px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] font-medium text-foreground">Password</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-9 text-[13px]"
                />
              </div>

              {error && (
                <p className="text-[12px] text-rose-600 bg-rose-50 rounded-md px-3 py-2 border border-rose-200">
                  {error}
                </p>
              )}

              <Button type="submit" disabled={loading} className="w-full h-9">
                {loading && <Loader2 className="size-3.5 mr-2 animate-spin" />}
                Sign in
              </Button>
            </form>
          </div>

          <div className="border-t border-border/60 px-6 py-4 bg-muted/40">
            <Button
              variant="outline"
              className="w-full h-8 text-[12px] text-muted-foreground"
              onClick={handleDevLogin}
            >
              Dev Login (skip auth)
            </Button>
            <p className="text-[11px] text-muted-foreground text-center mt-2">
              Sets token to &ldquo;dev-user&rdquo; — requires backend dev fallback
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
