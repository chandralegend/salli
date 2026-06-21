"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { LogOut, User, Shield, RefreshCw } from "lucide-react";

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
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Account and application preferences</p>
      </div>

      <div className="flex flex-col gap-4">
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
