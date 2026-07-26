"use client";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { AskSalliFab } from "@/components/chat/AskSalliFab";
import { ChatDrawer } from "@/components/chat/ChatDrawer";
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
    </SidebarProvider>
  );
}
