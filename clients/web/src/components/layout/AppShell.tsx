"use client";

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { usePathname } from "next/navigation";

const PAGE_LABELS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/ledger": "Ledger",
  "/statements": "Statements",
  "/tax": "Tax",
  "/agent": "AI Agent",
  "/documents": "Documents",
  "/reminders": "Reminders",
  "/settings": "Settings",
};

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const key = Object.keys(PAGE_LABELS).find(
    (k) => pathname === k || pathname.startsWith(k + "/")
  );
  const pageLabel = key ? PAGE_LABELS[key] : "Salli";

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="ledger-paper">
        {/* Top header bar */}
        <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border/60 bg-background px-4 sticky top-0 z-10">
          <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
          <Separator orientation="vertical" className="mr-2 h-3.5 bg-border/60" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="text-[13px] font-medium text-foreground">
                  {pageLabel}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
