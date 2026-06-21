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
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ledger", label: "Ledger", icon: BookOpen },
  { href: "/statements", label: "Statements", icon: FileText },
  { href: "/tax", label: "Tax", icon: Calculator },
  { href: "/agent", label: "AI Agent", icon: Bot },
  { href: "/documents", label: "Documents", icon: FolderOpen },
  { href: "/reminders", label: "Reminders", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-56 min-h-screen border-r bg-sidebar shrink-0">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b">
        <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shrink-0">
          <span className="text-primary-foreground text-xs font-bold">S</span>
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">Salli</p>
          <p className="text-[10px] text-muted-foreground leading-tight">Finance & Tax</p>
        </div>
      </div>

      <nav className="flex flex-col gap-0.5 p-3 flex-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors duration-150",
                active
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t">
        <p className="text-[10px] text-muted-foreground px-3">YA 2025/26 · LKR</p>
      </div>
    </aside>
  );
}
