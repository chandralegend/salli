"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { LogOut, User, Shield, RefreshCw, Sparkles, Gauge, Loader2 } from "lucide-react";
import { useSubscription, useBillingPortal } from "@/hooks/useBilling";
import { UsageMeter } from "@/components/billing/UsageMeter";
import { UpgradeDialog } from "@/components/billing/UpgradeDialog";
import { toast } from "sonner";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  trialing: "bg-blue-50 text-blue-700 border-blue-200",
  past_due: "bg-rose-50 text-rose-700 border-rose-200",
  canceled: "bg-muted text-muted-foreground border-border",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

function SubscriptionCard() {
  const { data: sub, isLoading } = useSubscription();
  const portal = useBillingPortal();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  async function openPortal() {
    try {
      const { url } = await portal.mutateAsync();
      window.location.href = url;
    } catch {
      toast.error("Billing portal isn't available yet.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-muted-foreground" />
          <CardTitle className="text-base">Subscription</CardTitle>
        </div>
        <CardDescription>Your plan and billing</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading || !sub ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="font-ledger text-[22px]">{sub.plan_name}</span>
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider rounded-full border px-2 py-0.5 ${STATUS_STYLES[sub.status] ?? STATUS_STYLES.active}`}
              >
                {sub.cancel_at_period_end ? "Cancels soon" : sub.status}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {sub.plan !== "free" && (
                <Button variant="outline" size="sm" onClick={openPortal} disabled={portal.isPending}>
                  {portal.isPending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
                  Manage billing
                </Button>
              )}
              <Button size="sm" onClick={() => setUpgradeOpen(true)}>
                {sub.plan === "free" ? "Upgrade" : "Change plan"}
              </Button>
              <UpgradeDialog
                currentPlan={sub.plan}
                open={upgradeOpen}
                onOpenChange={setUpgradeOpen}
              />
            </div>
          </div>
        )}
        {sub?.current_period_end && (
          <p className="text-[11px] text-muted-foreground mt-3">
            {sub.cancel_at_period_end ? "Access until" : "Renews"} {fmtDate(sub.current_period_end)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function UsageCard() {
  const { data: sub, isLoading } = useSubscription();
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-muted-foreground" />
          <CardTitle className="text-base">Usage this month</CardTitle>
        </div>
        <CardDescription>Your AI and statement allowance resets on the 1st</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading || !sub ? (
          <>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </>
        ) : (
          sub.usage.map((u) => <UsageMeter key={u.metric} usage={u} />)
        )}
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { logout, token } = useAuth();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  function handleRedoOnboarding() {
    localStorage.removeItem("salli_onboarding_complete");
    router.replace("/onboarding");
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Account, plan, and preferences</p>
      </div>

      <div className="flex flex-col gap-4">
        <SubscriptionCard />
        <UsageCard />

        {/* Profile setup */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">Profile Setup</CardTitle>
            </div>
            <CardDescription>Update your tax profile, income sources, and chart of accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Re-run the setup wizard to change your residency status, income sources, or add new accounts. Existing accounts and memories won&apos;t be deleted — new ones will be added.
            </p>
            <Button variant="outline" onClick={handleRedoOnboarding} className="gap-2">
              <RefreshCw className="w-4 h-4" /> Redo profile setup
            </Button>
          </CardContent>
        </Card>

        {/* Session card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">Session</CardTitle>
            </div>
            <CardDescription>Your current authentication state</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-1.5">Auth token</p>
              <p className="text-xs bg-muted px-3 py-2 rounded font-mono truncate border">
                {token ?? "—"}
              </p>
            </div>
            <Separator className="my-4" />
            <Button variant="destructive" onClick={handleLogout} className="gap-2">
              <LogOut className="w-4 h-4" /> Sign out
            </Button>
          </CardContent>
        </Card>

        {/* Compliance notice */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">Data &amp; Privacy</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>Tax computations run on-device via a deterministic engine. The LLM never processes your financial figures.</p>
            <p>Your data is stored in your own PostgreSQL database. Anthropic does not retain conversation data per your DPA.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
