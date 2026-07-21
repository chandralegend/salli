"use client";

import { AppSidebar } from "./AppSidebar";
import { MobileDock } from "./MobileDock";
import { ChatDrawer } from "@/components/chat/ChatDrawer";
import { useScroogePanel } from "@/lib/store";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isOpen, isFullPage, width } = useScroogePanel();
  const drawerVisible = isOpen && !isFullPage;

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div
        className={cn("md:pl-16 transition-[padding] duration-200")}
        style={drawerVisible ? { paddingRight: width } : undefined}
      >
        <div className="relative max-w-[1200px] mx-auto px-5 sm:px-8 py-8 pb-28 md:pb-12">
          {/* Subtle dim while the drawer is open — content stays visible */}
          {drawerVisible && (
            <div className="absolute inset-0 z-30 bg-black/10 dark:bg-black/30 rounded-lg pointer-events-none" />
          )}
          {children}
        </div>
      </div>
      <ChatDrawer />
      <MobileDock />
    </div>
  );
}
