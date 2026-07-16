"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/lib/auth";
import { useSubscription, useBillingPortal } from "@/hooks/useBilling";
import { PageShell, PageHeader, CardContainer } from "@/components/ui/page-shell";
import { UsageMeter } from "@/components/billing/UsageMeter";
import { UpgradeDialog } from "@/components/billing/UpgradeDialog";
import { downloadDataExport, decodeEmailFromToken, useDeleteAccount } from "@/hooks/useDataPortability";
import { toast } from "sonner";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://salli.leafmonkey.org";

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

  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const deleteAccount = useDeleteAccount();
  const accountEmail = decodeEmailFromToken(token);

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  async function handleExportData() {
    setExporting(true);
    try {
      await downloadDataExport();
      toast.success("Export downloaded");
    } catch (e) {
      toast.error(`Export failed: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteAccount() {
    try {
      await deleteAccount.mutateAsync(confirmEmail);
      toast.success("Account deleted");
      logout();
      router.replace("/login");
    } catch (e) {
      toast.error(`Delete failed: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setDeleteOpen(false);
      setConfirmEmail("");
    }
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

        {/* Danger Zone */}
        <CardContainer>
          <SectionLabel>Danger Zone</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: "var(--foreground)" }}>Export my data</div>
              <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 10, lineHeight: 1.5 }}>
                Download everything Salli has stored about you as one JSON file.
              </p>
              <button
                onClick={handleExportData}
                disabled={exporting}
                style={{ padding: "10px 22px", border: "1.5px solid var(--border)", borderRadius: 999, background: "var(--card)", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: "var(--foreground)", display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Download className="size-3.5" /> {exporting ? "Exporting…" : "Export my data"}
              </button>
            </div>
            <div style={{ height: 1, background: "var(--border)" }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: "#DC2626" }}>Delete my account</div>
              <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 10, lineHeight: 1.5 }}>
                Permanently delete every row Salli has stored for you. This cannot be undone.
              </p>
              <button
                onClick={() => setDeleteOpen(true)}
                style={{ padding: "10px 22px", background: "#DC2626", color: "#fff", border: "none", borderRadius: 999, fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
              >
                Delete my account
              </button>
            </div>
          </div>
        </CardContainer>

        {/* Legal footer */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, paddingTop: 8, paddingBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 12, color: "var(--muted-foreground)" }}>
            <a href={`${SITE_URL}/terms`} style={{ color: "inherit" }}>Terms</a>
            <span style={{ opacity: 0.4 }}>·</span>
            <a href={`${SITE_URL}/privacy`} style={{ color: "inherit" }}>Privacy</a>
            <span style={{ opacity: 0.4 }}>·</span>
            <a href={`${SITE_URL}/security`} style={{ color: "inherit" }}>Security</a>
            <span style={{ opacity: 0.4 }}>·</span>
            <a href={`${SITE_URL}/cookies`} style={{ color: "inherit" }}>Cookies</a>
          </div>
          <p style={{ fontSize: 11, color: "var(--muted-foreground)", opacity: 0.6 }}>© 2026 Salli. All rights reserved.</p>
        </div>

      </div>

      {/* ── Delete Account Confirm ── */}
      <AlertDialog open={deleteOpen} onOpenChange={(open) => { setDeleteOpen(open); if (!open) setConfirmEmail(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes every row Salli has stored for you — accounts, entries,
              budgets, debts, holdings, policies, everything. This cannot be undone. Type your
              account email{accountEmail ? <> (<strong>{accountEmail}</strong>)</> : ""} to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-1.5 py-2">
            <Label>Email</Label>
            <Input value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!confirmEmail || deleteAccount.isPending}
              onClick={handleDeleteAccount}
            >
              {deleteAccount.isPending ? "Deleting…" : "Permanently delete"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
