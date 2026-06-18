"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export default function SettingsPage() {
  const { logout, token } = useAuth();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <div className="p-6 max-w-[1280px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Account and preferences
        </p>
      </div>

      <div className="rounded-[16px] bg-card border border-border p-6 max-w-md">
        <h2 className="text-sm font-semibold text-foreground mb-4">Session</h2>
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-1">Current token</p>
          <p className="font-mono text-xs text-foreground bg-secondary px-3 py-2 rounded-[8px] truncate">
            {token ?? "—"}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleLogout}
          className="border-expense/30 text-expense hover:bg-expense/10"
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}
