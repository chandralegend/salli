"use client";

import { useState } from "react";
import Link from "next/link";
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
    <AuthShell title="Reset password" subtitle="We'll send a link to your email.">
      {sent ? (
        <div className="flex flex-col items-center text-center gap-4 py-6">
          <div className="w-14 h-14 rounded-2xl bg-[#E8FC85] flex items-center justify-center">
            <MailCheck className="size-6 text-[#010001]" />
          </div>
          <p className="text-[13px] text-muted-foreground max-w-xs leading-relaxed">
            If an account exists for{" "}
            <span className="font-semibold text-foreground">{email}</span>, a reset link is on its way.
          </p>
          <Link
            href="/login"
            className="border border-border rounded-full px-5 py-2.5 text-[13.5px] font-bold text-foreground hover:bg-muted transition-colors"
          >
            ← Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={!supabaseOn}
            className="w-full px-4 py-3 border-[1.5px] border-border rounded-[14px] text-[14px] font-normal text-foreground bg-muted outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground disabled:opacity-50"
          />
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
            Send reset link
          </button>
          <p className="text-[13.5px] text-muted-foreground text-center">
            <Link href="/login" className="text-foreground font-bold hover:underline">
              ← Back to sign in
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
