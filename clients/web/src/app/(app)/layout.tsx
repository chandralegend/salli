"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getStoredToken } from "@/lib/store";
import "@/lib/api-client";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.replace("/login");
    }
  }, [router]);

  return <AppShell>{children}</AppShell>;
}
