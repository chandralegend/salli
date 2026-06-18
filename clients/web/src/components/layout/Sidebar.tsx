"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Calculator,
  Bot,
  Bell,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ledger", label: "Ledger", icon: BookOpen },
  { href: "/statements", label: "Statements", icon: FileText },
  { href: "/tax", label: "Tax", icon: Calculator },
  { href: "/agent", label: "Agent", icon: Bot },
  { href: "/reminders", label: "Reminders", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-60 min-h-screen bg-card border-r border-border shrink-0">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-border">
        <span className="w-5 h-5 rounded-sm bg-primary shrink-0" />
        <span className="text-lg font-semibold text-foreground tracking-tight">
          salli
        </span>
      </div>

      <nav className="flex flex-col gap-1 p-3 flex-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-full text-sm font-medium transition-colors duration-150",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
