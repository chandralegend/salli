"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthCard } from "@/components/auth/AuthCard";
import { useMcpConsentInfo, useMcpConsentDecision } from "@/hooks/useMcp";
import { getStoredToken } from "@/lib/store";

const SCOPE_LABELS: Record<string, string> = {
  "": "Full access to your Salli account",
};

function describeScope(scope: string): string {
  return SCOPE_LABELS[scope] ?? scope;
}

function ConsentContent() {
  const params = useSearchParams();
  const rt = params.get("rt");
  const [decided, setDecided] = useState<"allow" | "deny" | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Computed once at mount, before any render — keeps us from firing an
  // unauthenticated consent-info request (and flashing "Link expired") in
  // the instant before the login redirect below kicks in.
  const [hasSession] = useState<boolean | null>(() =>
    typeof window === "undefined" ? null : !!getStoredToken()
  );

  const consentInfo = useMcpConsentInfo(hasSession ? rt : null);
  const decision = useMcpConsentDecision();

  // No active session — send the user to log in, then straight back here.
  useEffect(() => {
    if (!rt || hasSession !== false) return;
    const next = `/oauth/consent?rt=${encodeURIComponent(rt)}`;
    window.location.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [rt, hasSession]);

  async function decide(approve: boolean) {
    if (!rt) return;
    setDecided(approve ? "allow" : "deny");
    setError(null);
    try {
      const { redirect_url } = await decision.mutateAsync({ rt, approve });
      setRedirecting(true);
      window.location.assign(redirect_url);
    } catch {
      setDecided(null);
      setError(
        approve
          ? "Couldn't complete this — enable MCP access in Settings first, or ask for a fresh connection link."
          : "Couldn't complete this — try again from the app you're connecting."
      );
    }
  }

  if (!rt) {
    return (
      <AuthCard title="Missing request" subtitle="This link is incomplete.">
        <p className="text-[13px] text-muted-foreground">
          Start the connection again from the AI assistant you&apos;re trying to connect to Salli.
        </p>
      </AuthCard>
    );
  }

  if (hasSession === null || consentInfo.isLoading || redirecting) {
    return (
      <AuthCard title="One moment" subtitle="Loading this request&hellip;">
        <div className="flex justify-center py-4">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      </AuthCard>
    );
  }

  if (consentInfo.isError) {
    return (
      <AuthCard title="Link expired" subtitle="This connection request is no longer valid.">
        <p className="text-[13px] text-muted-foreground">
          Authorization requests expire after a few minutes. Go back to the AI assistant and start
          connecting again.
        </p>
      </AuthCard>
    );
  }

  const info = consentInfo.data;

  return (
    <AuthCard title="Connect to Salli" subtitle={`${info?.client_name ?? "An application"} wants access`}>
      <div className="rounded-md border bg-muted/40 p-4">
        <p className="text-[13px] font-medium">{describeScope(info?.scope ?? "")}</p>
        <ul className="mt-2 space-y-1 text-[13px] text-muted-foreground">
          <li>Net worth, budgets, and debt payoff plans</li>
          <li>Portfolio, subscriptions, and insurance coverage</li>
          <li>Tax computations, documents, and saved memories</li>
          <li>Creating accounts, reminders, and journal entries</li>
        </ul>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {info?.client_name ?? "This application"} will have the same access to your account that
        Scrooge (Salli&apos;s own assistant) has — including creating records, not just reading them.
        Every action is logged to your audit log, and you can revoke access anytime from Settings.
      </p>

      {error && <p className="mt-3 text-[13px] text-destructive">{error}</p>}

      <div className="mt-5 flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => decide(false)} disabled={!!decided}>
          {decided === "deny" ? <Loader2 className="size-4 animate-spin" /> : "Deny"}
        </Button>
        <Button className="flex-1" onClick={() => decide(true)} disabled={!!decided}>
          {decided === "allow" ? <Loader2 className="size-4 animate-spin" /> : "Allow"}
        </Button>
      </div>
    </AuthCard>
  );
}

export default function OAuthConsentPage() {
  return (
    <Suspense fallback={null}>
      <ConsentContent />
    </Suspense>
  );
}
