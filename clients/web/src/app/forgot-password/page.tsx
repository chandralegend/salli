"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/components/auth/AuthCard";
import { sendPasswordReset } from "@/lib/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await sendPasswordReset(email);
    } catch {
      // Deliberately identical outcome — don't reveal whether the account exists.
    }
    setSent(true);
    setBusy(false);
  }

  if (sent) {
    return (
      <AuthCard title="" footer={<Link href="/login" className="hover:underline">Back to sign in</Link>}>
        <div className="flex flex-col items-center text-center gap-3 py-4">
          <div className="size-12 rounded-full bg-muted flex items-center justify-center">
            <CheckCircle2 className="size-6 text-muted-foreground" />
          </div>
          <p className="text-[20px] font-semibold">Link sent</p>
          <p className="text-sm text-muted-foreground">
            If an account exists for that address, a reset link is on its way.
          </p>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Reset password"
      subtitle="We'll email you a reset link."
      footer={
        <span>
          Back to{" "}
          <Link href="/login" className="font-medium text-foreground hover:underline">
            sign in
          </Link>
        </span>
      }
    >
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
        <Button type="submit" className="w-full h-11" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : "Send reset link"}
        </Button>
      </form>
    </AuthCard>
  );
}
