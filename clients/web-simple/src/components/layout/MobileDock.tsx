"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, LayoutGrid, Plus, Sparkles, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSalliStore, useScroogePanel } from "@/lib/store";

/** Floating bottom dock (mobile only): Dashboard, Ledger, raised "+", AI, FI. */
export function MobileDock() {
  const pathname = usePathname();
  const router = useRouter();
  const requestQuickAdd = useSalliStore((s) => s.requestQuickAddEntry);
  const togglePanel = useScroogePanel((s) => s.toggle);

  function quickAdd() {
    requestQuickAdd();
    router.push("/ledger");
  }

  const item = (href: string, Icon: typeof LayoutGrid, label: string) => (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "flex flex-col items-center justify-center flex-1 h-full",
        pathname.startsWith(href) ? "text-foreground" : "text-muted-foreground"
      )}
    >
      <Icon className="size-5" />
    </Link>
  );

  return (
    <nav className="md:hidden fixed bottom-4 inset-x-4 z-40 h-16 rounded-full border bg-card shadow-lg flex items-center px-4">
      {item("/dashboard", LayoutGrid, "Dashboard")}
      {item("/ledger", BookOpen, "Ledger")}
      <button
        type="button"
        onClick={quickAdd}
        aria-label="New journal entry"
        className="relative -top-3 size-[52px] shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md mx-2"
      >
        <Plus className="size-6" />
      </button>
      <button
        type="button"
        onClick={togglePanel}
        aria-label="Ask Salli AI"
        className="flex flex-col items-center justify-center flex-1 h-full text-muted-foreground"
      >
        <Sparkles className="size-5" />
      </button>
      {item("/financial-independence", TrendingUp, "Financial Independence")}
    </nav>
  );
}
