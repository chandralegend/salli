"use client";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { AskSalliFab } from "@/components/chat/AskSalliFab";
import { ChatDrawer } from "@/components/chat/ChatDrawer";
import { BugReportDialog } from "@/components/support/BugReportDialog";
import { useScroogePanel } from "@/lib/store";
import { cn } from "@/lib/utils";
import { APP_CONTAINER_CLASS } from "./appContainer";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isOpen, isFullPage, close } = useScroogePanel();
  const drawerVisible = isOpen && !isFullPage;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        {/* No client error boundary here: Next's own boundary from
            (app)/error.tsx wraps the page, which makes it nested *inside*
            anything mounted at this level, so it always catches a page crash
            first. It also handles server-render errors, which a client class
            boundary cannot see at all. */}
        <div className={cn(APP_CONTAINER_CLASS, "relative py-6 pb-24")}>{children}</div>
      </SidebarInset>

      {/* Full-viewport scrim while the docked chat panel is open — click to dismiss */}
      {drawerVisible && (
        <div
          onClick={close}
          aria-hidden
          className="fixed inset-0 z-40 bg-black/40 dark:bg-black/60 transition-opacity"
        />
      )}
      <ChatDrawer />
      <AskSalliFab />
      <BugReportDialog />
    </SidebarProvider>
  );
}
