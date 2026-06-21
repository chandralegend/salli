"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { getSupabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) {
      setError("Supabase not configured");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Set a new password" subtitle="Choose a strong password for your account.">
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium">New password</Label>
          <Input
            type="password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="h-10 text-[13px]"
          />
        </div>
        {error && (
          <p className="text-[12px] text-rose-600 bg-rose-50 rounded-md px-3 py-2 border border-rose-200">
            {error}
          </p>
        )}
        <Button type="submit" disabled={loading} className="w-full h-10">
          {loading && <Loader2 className="size-3.5 mr-2 animate-spin" />}
          Update password
        </Button>
      </form>
    </AuthShell>
  );
}
