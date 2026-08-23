"use client";

import { Suspense, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Copy, ExternalLink, Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusChip } from "@/components/shared/StatusChip";
import { UsageMeter } from "@/components/billing/UsageMeter";
import { UpgradeDialog } from "@/components/billing/UpgradeDialog";
import { DangerZone } from "@/components/settings/DangerZone";
import { LlmKeysCard } from "@/components/settings/LlmKeysCard";
import { McpConnectionsCard } from "@/components/settings/McpConnectionsCard";
import { HelpFeedbackCard } from "@/components/support/HelpFeedbackCard";
import { useSubscription, useBillingPortal, type BillingCycle } from "@/hooks/useBilling";
import { useDailyBriefing, useSetDailyBriefing } from "@/hooks/useAdvisorSettings";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://salli.leafmonkey.org";

function maskToken(token: string | null): string {
  if (!token) return "—";
  return token.length <= 8 ? "••••" : `${token.slice(0, 4)}••••••••${token.slice(-4)}`;
}

/** True after hydration — the token comes from localStorage, so SSR renders "—". */
function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

function SettingsContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { token, logout } = useAuth();
  const subscription = useSubscription();
  const portal = useBillingPortal();
  const dailyBriefing = useDailyBriefing();
  const setDailyBriefing = useSetDailyBriefing();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const mounted = useMounted();

  // Every 402 upgrade banner in the app lands here with ?upgrade=1. A plan
  // key (?upgrade=plus / ?upgrade=pro) also opens the dialog, additionally
  // highlighting that plan — used by plan-gated features (e.g. MCP) and the
  // marketing site's pricing CTAs.
  const upgradeParam = params.get("upgrade");
  useEffect(() => {
    if (upgradeParam) {
      const t = setTimeout(() => setUpgradeOpen(true), 0);
      return () => clearTimeout(t);
    }
  }, [upgradeParam]);

  const sub = subscription.data;

  // An explicit ?cycle= wins (the marketing site's annual CTA links here and must
  // land on Annual). Otherwise open on what the user is already paying, so an
  // annual subscriber isn't shown monthly prices for their own plan.
  const cycleParam = params.get("cycle");
  const initialCycle: BillingCycle =
    cycleParam === "year" || cycleParam === "month"
      ? cycleParam
      : (sub?.billing_cycle ?? "month");

  async function openPortal() {
    try {
      const { url } = await portal.mutateAsync();
      window.location.assign(url);
    } catch (err) {
      // Same reasoning as UpgradeDialog: the backend's detail is the actionable
      // text (e.g. "No billing customer for this user yet", which means checkout
      // has never completed), not a transient-sounding retry prompt.
      toast.error(
        err instanceof Error ? err.message : "Billing portal unavailable — try again shortly.",
      );
    }
  }

  function redoProfile() {
    localStorage.removeItem("salli_onboarding_complete");
    router.push("/onboarding");
  }

  async function signOut() {
    await logout();
    localStorage.removeItem("salli_onboarding_complete");
    router.replace("/login");
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Plan, usage, and account" />

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Subscription */}
        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-semibold">Subscription</h2>
            {sub && (
              <StatusChip tone={sub.status === "active" ? "success" : "neutral"}>
                {sub.status === "active" ? "Active" : sub.status}
              </StatusChip>
            )}
          </div>
          {subscription.isLoading ? (
            <Skeleton className="h-20" />
          ) : sub ? (
            <>
              <p className="text-2xl font-semibold">
                {sub.plan_name || sub.plan}
                <span className="text-sm font-normal text-muted-foreground">
                  {sub.billing_cycle ? (sub.billing_cycle === "year" ? " · Annual" : " · Monthly") : ""}
                  {" · billed via Paddle"}
                </span>
              </p>
              <p className="text-[13px] text-muted-foreground mt-1">
                {sub.cancel_at_period_end
                  ? `Cancels ${formatDate(sub.current_period_end)}`
                  : sub.current_period_end
                    ? `Renews ${formatDate(sub.current_period_end)}`
                    : "Free plan — no billing date"}
              </p>
              {/* Shown on the card, not just inside the dialog: a past_due subscriber
                  needs to know why before hunting for a button that won't work. */}
              {sub.change_mode === "blocked" && (
                <p className="text-[13px] text-muted-foreground mt-2">
                  {sub.change_blocked_reason === "past_due"
                    ? "There's an unpaid invoice — settle it in the billing portal to change plans."
                    : sub.change_blocked_reason === "paused"
                      ? "Your subscription is paused. Resume it to change plans."
                      : sub.change_blocked_reason === "scheduled_change"
                        ? "A cancellation is already scheduled. Manage it in the billing portal."
                        : "Manage this subscription in the billing portal."}
                </p>
              )}
              <div className="flex gap-2 mt-5">
                <Button variant="outline" onClick={openPortal} disabled={portal.isPending}>
                  {portal.isPending ? <Loader2 className="size-4 animate-spin" /> : <ExternalLink className="size-4" />}
                  Manage billing
                </Button>
                <Button onClick={() => setUpgradeOpen(true)}>Change plan</Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Couldn&apos;t load subscription.</p>
          )}
        </div>

        {/* Usage */}
        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-semibold">Usage this month</h2>
            {sub?.usage?.[0]?.resets_at && (
              <span className="text-xs text-muted-foreground">Resets {formatDate(sub.usage[0].resets_at)}</span>
            )}
          </div>
          {subscription.isLoading ? (
            <Skeleton className="h-24" />
          ) : (
            <div className="space-y-5">
              {(sub?.usage ?? []).map((m) => (
                <UsageMeter key={m.metric} metric={m} />
              ))}
              {sub && (
                <p className="text-xs text-muted-foreground">
                  Quotas are per calendar month on the {sub.plan_name || sub.plan} plan.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="rounded-lg border bg-card p-5">
          <h2 className="text-[15px] font-semibold mb-3">Profile</h2>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            Your tax profile, income sources, and goals drive your chart of accounts and the
            advisor&apos;s guidance. Rerun setup if your situation changes — existing accounts and
            entries are never deleted.
          </p>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={redoProfile}>
              Redo profile setup
            </Button>
            <Button variant="outline" onClick={() => router.push("/dashboard?tour=1")}>
              Take a tour
            </Button>
          </div>

          <div className="mt-5 flex items-start justify-between gap-4 border-t pt-4">
            <div className="min-w-0">
              <p className="text-[13px] font-medium">Daily briefing</p>
              <p className="mt-0.5 text-[12px] text-muted-foreground leading-relaxed">
                A wealth-advisor run each morning. Uses one of your monthly advisor runs.
              </p>
            </div>
            {dailyBriefing.isLoading ? (
              <Skeleton className="h-5 w-9 shrink-0 rounded-full" />
            ) : (
              <Switch
                className="shrink-0"
                checked={dailyBriefing.data?.enabled ?? false}
                onCheckedChange={(next) => setDailyBriefing.mutate(next)}
                disabled={setDailyBriefing.isPending}
                aria-label="Enable the daily briefing"
              />
            )}
          </div>
        </div>

        {/* Session */}
        <div className="rounded-lg border bg-card p-5">
          <h2 className="text-[15px] font-semibold mb-3">Session</h2>
          <p className="text-xs text-muted-foreground mb-1.5">API token</p>
          <div className="flex items-center gap-2">
            <code className="rounded-md bg-muted px-3 py-1.5 font-mono text-[13px]">
              {mounted ? maskToken(token) : "—"}
            </code>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Copy token"
              onClick={() => {
                if (token) {
                  navigator.clipboard.writeText(token);
                  toast.success("Token copied");
                }
              }}
            >
              <Copy className="size-3.5" />
            </Button>
          </div>
          <Button variant="destructive" className="mt-5" onClick={signOut}>
            <LogOut className="size-4" /> Sign out
          </Button>
          <p className="text-xs text-muted-foreground mt-2">Signs you out on this device only.</p>
        </div>

        {/* MCP: connect an AI assistant */}
        <LlmKeysCard />

        <McpConnectionsCard />

        <HelpFeedbackCard />

        {/* Danger zone */}
        <DangerZone
          onDeleted={async () => {
            await logout();
            localStorage.removeItem("salli_onboarding_complete");
            router.replace("/login");
          }}
        />
      </div>

      <footer className="text-center text-[13px] text-muted-foreground pt-4">
        <Link href={`${SITE_URL}/terms`} className="hover:text-foreground">Terms</Link>
        {" · "}
        <Link href={`${SITE_URL}/privacy`} className="hover:text-foreground">Privacy</Link>
        {" · "}
        <Link href={`${SITE_URL}/security`} className="hover:text-foreground">Security</Link>
        {" · "}
        <Link href={`${SITE_URL}/cookies`} className="hover:text-foreground">Cookies</Link>
        <span className="block text-xs mt-1.5">Salli · © 2026</span>
      </footer>

      <UpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        currentPlan={sub?.plan ?? "free"}
        currentCycle={sub?.billing_cycle ?? null}
        // Default to checkout while the subscription is still loading: it's the
        // conservative branch, since it can't charge a card without the Paddle overlay.
        changeMode={sub?.change_mode ?? "checkout"}
        blockedReason={sub?.change_blocked_reason ?? null}
        highlightPlan={upgradeParam && upgradeParam !== "1" ? upgradeParam : undefined}
        initialCycle={initialCycle}
      />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsContent />
    </Suspense>
  );
}
