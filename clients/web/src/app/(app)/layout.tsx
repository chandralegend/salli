"use client";

import { recordFailure } from "@/lib/diagnostics";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { TourProvider } from "@/components/tour/TourProvider";
import { getStoredToken, getOnboardingComplete } from "@/lib/store";
import { API_URL } from "@/lib/api-client";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    // Fast path: already flagged complete in localStorage
    if (getOnboardingComplete()) return;

    // Check API once — redirect to wizard if onboarding not done
    fetch(`${API_URL}/onboarding/status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data: { complete: boolean }) => {
        if (data.complete) {
          localStorage.setItem("salli_onboarding_complete", "true");
        } else {
          router.replace("/onboarding");
        }
      })
      .catch(() => {
        // Network error — don't block the app, but do record it. A swallowed
        // failure here is exactly what produces "it keeps sending me back to
        // onboarding" reports with no other evidence attached.
        recordFailure({
          via: "fetch",
          method: "GET",
          status: 0,
          path_template: "/onboarding/status",
          request_id: null,
        });
      });
  }, [router]);

  return (
    <TourProvider>
      <AppShell>{children}</AppShell>
    </TourProvider>
  );
}
