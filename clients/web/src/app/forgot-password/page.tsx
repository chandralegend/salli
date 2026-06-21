"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MailCheck } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { sendPasswordReset, isSupabaseConfigured } from "@/lib/auth";

export default function ForgotPasswordPage() {
  const supabaseOn = isSupabaseConfigured();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send reset email");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Reset password" subtitle="We'll email you a reset link.">
      {sent ? (
        <div className="flex flex-col items-center text-center gap-4 py-6">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <MailCheck className="size-5 text-primary" />
          </div>
          <p className="text-[13px] text-muted-foreground max-w-xs">
            If an account exists for{" "}
            <span className="font-medium text-foreground">{email}</span>, a reset link is on its way.
          </p>
          <Button variant="outline" render={<Link href="/login" />}>
            Back to sign in
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3.5">
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
          {error && (
            <p className="text-[12px] text-rose-600 bg-rose-50 rounded-md px-3 py-2 border border-rose-200">
              {error}
            </p>
          )}
          <Button type="submit" disabled={loading || !supabaseOn} className="w-full h-10">
            {loading && <Loader2 className="size-3.5 mr-2 animate-spin" />}
            Send reset link
          </Button>
          <p className="text-[12px] text-muted-foreground text-center pt-1">
            <Link href="/login" className="text-primary font-medium hover:underline">
              Back to sign in
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
