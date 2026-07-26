"use client";

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AskSalliFab } from "@/components/chat/AskSalliFab";
import { ChatDrawer } from "@/components/chat/ChatDrawer";
import { useScroogePanel } from "@/lib/store";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isOpen, isFullPage, width } = useScroogePanel();
  const drawerVisible = isOpen && !isFullPage;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div
          className="transition-[padding] duration-200"
          style={drawerVisible ? { paddingRight: width } : undefined}
        >
          <div className="relative max-w-[1200px] mx-auto px-5 sm:px-8 py-8 pb-24">
            <SidebarTrigger className="mb-4 md:hidden" />
            {/* Subtle dim while the drawer is open — content stays visible */}
            {drawerVisible && (
              <div className="absolute inset-0 z-30 bg-black/10 dark:bg-black/30 rounded-lg pointer-events-none" />
            )}
            {children}
          </div>
        </div>
      </SidebarInset>
      <ChatDrawer />
      <AskSalliFab />
    </SidebarProvider>
  );
}
