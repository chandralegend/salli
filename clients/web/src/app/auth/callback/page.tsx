"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getSupabase } from "@/lib/supabase";

/**
 * Lands here after an OAuth redirect, an email confirmation, or a password-reset
 * link. The Supabase client (detectSessionInUrl) parses the URL and establishes
 * the session; we then route the user onward. The (app) layout decides whether a
 * returning user needs onboarding.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      router.replace("/login");
      return;
    }

    // Password-recovery links arrive with type=recovery in the URL hash.
    const isRecovery =
      typeof window !== "undefined" && window.location.hash.includes("type=recovery");

    let settled = false;
    const finish = (session: unknown) => {
      if (settled) return;
      settled = true;
      if (isRecovery) router.replace("/reset-password");
      else if (session) router.replace("/dashboard");
      else router.replace("/login");
    };

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) finish(data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) finish(session);
    });

    const t = setTimeout(() => finish(null), 5000);
    return () => {
      clearTimeout(t);
      sub.subscription.unsubscribe();
    };
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background ledger-paper">
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
      <p className="text-[13px] text-muted-foreground">
        {error || "Signing you in…"}
      </p>
    </div>
  );
}
