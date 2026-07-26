"use client";

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AskSalliFab } from "@/components/chat/AskSalliFab";
import { ChatDrawer } from "@/components/chat/ChatDrawer";
import { useScroogePanel } from "@/lib/store";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isOpen, isFullPage, close } = useScroogePanel();
  const drawerVisible = isOpen && !isFullPage;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="px-5 sm:px-8 pt-6">
          <SidebarTrigger />
        </div>
        <div className="relative max-w-[1200px] mx-auto px-5 sm:px-8 py-6 pb-24">{children}</div>
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
