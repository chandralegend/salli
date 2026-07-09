"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { useSubscription, useBillingPortal } from "@/hooks/useBilling";
import { PageShell, PageHeader, CardContainer } from "@/components/ui/page-shell";
import { UsageMeter } from "@/components/billing/UsageMeter";
import { UpgradeDialog } from "@/components/billing/UpgradeDialog";
import { toast } from "sonner";

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  active:   { bg: "#DCFCE7", color: "#16A34A" },
  trialing: { bg: "#DBEAFE", color: "#2563EB" },
  past_due: { bg: "#FEE2E2", color: "#DC2626" },
  canceled: { bg: "#F1F7F7", color: "#7DA6A9" },
};

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return ""; }
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#7DA6A9", marginBottom: 16 }}>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { logout, token } = useAuth();
  const router = useRouter();
  const { data: sub, isLoading } = useSubscription();
  const portal = useBillingPortal();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  function handleRedoOnboarding() {
    localStorage.removeItem("salli_onboarding_complete");
    router.replace("/onboarding");
  }

  async function openPortal() {
    try {
      const { url } = await portal.mutateAsync();
      window.location.href = url;
    } catch {
      toast.error("Billing portal isn't available yet.");
    }
  }

  const statusStyle = sub ? (STATUS_STYLES[sub.status] ?? STATUS_STYLES.active) : STATUS_STYLES.active;

  return (
    <PageShell>
      <PageHeader title="Settings" subtitle="Subscription, usage, profile, session" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

        {/* Subscription */}
        <CardContainer>
          <SectionLabel>Subscription</SectionLabel>
          {isLoading || !sub ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.04em" }}>{sub.plan_name}</div>
                  <div style={{ fontSize: 13, color: "#7DA6A9", marginTop: 2 }}>
                    {sub.cancel_at_period_end ? "Access until" : "Renews"} {fmtDate(sub.current_period_end)}
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 999, ...statusStyle }}>
                  {sub.cancel_at_period_end ? "Cancels soon" : sub.status}
                </span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {sub.plan !== "free" && (
                  <button
                    onClick={openPortal}
                    disabled={portal.isPending}
                    style={{ flex: 1, padding: 10, border: "1.5px solid var(--border)", borderRadius: 999, background: "var(--card)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: "var(--foreground)" }}
                  >
                    {portal.isPending && <Loader2 className="inline size-3.5 mr-1.5 animate-spin" />}
                    Manage billing
                  </button>
                )}
                <button
                  onClick={() => setUpgradeOpen(true)}
                  style={{ flex: 1, padding: 10, background: "var(--foreground)", color: "var(--background)", border: "none", borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                >
                  {sub.plan === "free" ? "Upgrade" : "Change plan"}
                </button>
              </div>
            </>
          )}
          <UpgradeDialog currentPlan={sub?.plan ?? "free"} open={upgradeOpen} onOpenChange={setUpgradeOpen} />
        </CardContainer>

        {/* Usage */}
        <CardContainer>
          <SectionLabel>Usage · Resets 1st of month</SectionLabel>
          {isLoading || !sub ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {sub.usage.map((u) => <UsageMeter key={u.metric} usage={u} />)}
            </div>
          )}
        </CardContainer>

        {/* Profile Setup */}
        <CardContainer>
          <SectionLabel>Profile Setup</SectionLabel>
          <p style={{ fontSize: 14, color: "var(--muted-foreground)", marginBottom: 16, lineHeight: 1.6 }}>
            Your profile configures default accounts and personalises tax and FIRE calculations.
          </p>
          <button
            onClick={handleRedoOnboarding}
            style={{ padding: "10px 22px", border: "1.5px solid var(--border)", borderRadius: 999, background: "var(--card)", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: "var(--foreground)" }}
          >
            Redo profile setup
          </button>
        </CardContainer>

        {/* Session */}
        <CardContainer>
          <SectionLabel>Session</SectionLabel>
          <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 6 }}>Signed in as</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 20, color: "var(--foreground)" }}>
            {token ? `${token.slice(0, 8)}…` : "—"}
          </div>
          <button
            onClick={handleLogout}
            style={{ padding: "10px 22px", background: "#DC2626", color: "#fff", border: "none", borderRadius: 999, fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
          >
            Sign out
          </button>
        </CardContainer>

      </div>
    </PageShell>
  );
}
