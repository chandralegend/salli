"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Bell,
  BookOpen,
  FileText,
  LayoutGrid,
  Moon,
  Percent,
  Pin,
  PinOff,
  Settings,
  Sparkles,
  Sun,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useScroogePanel } from "@/lib/store";

const PRIMARY_NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/ledger", label: "Ledger", icon: BookOpen },
  { href: "/tax", label: "Tax", icon: Percent },
  { href: "/financial-independence", label: "Financial Independence", icon: TrendingUp },
];

const SECONDARY_NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/reminders", label: "Reminders", icon: Bell },
];

const PIN_KEY = "salli-nav-pinned";
const PIN_EVENT = "salli-nav-pin-change";

/** Pin state lives in localStorage; useSyncExternalStore keeps hydration safe. */
function usePinned(): [boolean, () => void] {
  const pinned = useSyncExternalStore(
    (onChange) => {
      window.addEventListener(PIN_EVENT, onChange);
      window.addEventListener("storage", onChange);
      return () => {
        window.removeEventListener(PIN_EVENT, onChange);
        window.removeEventListener("storage", onChange);
      };
    },
    () => localStorage.getItem(PIN_KEY) === "true",
    () => false
  );
  const toggle = useCallback(() => {
    localStorage.setItem(PIN_KEY, String(!(localStorage.getItem(PIN_KEY) === "true")));
    window.dispatchEvent(new Event(PIN_EVENT));
  }, []);
  return [pinned, toggle];
}

/** True after hydration — gates theme-dependent icons. */
function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  expanded,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  expanded: boolean;
}) {
  return (
    <Link
      href={href}
      title={expanded ? undefined : label}
      className={cn(
        "relative flex items-center gap-3 h-10 rounded-md px-2.5 text-sm font-medium transition-colors overflow-hidden",
        active ? "text-foreground bg-accent" : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
      )}
    >
      {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-foreground" />}
      <Icon className="size-[18px] shrink-0" />
      <span className={cn("whitespace-nowrap transition-opacity", expanded ? "opacity-100" : "opacity-0")}>
        {label}
      </span>
    </Link>
  );
}

/** Slim fixed left rail: 64px collapsed → 240px on hover, pinnable. */
export function AppSidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const togglePanel = useScroogePanel((s) => s.toggle);

  const [pinned, togglePin] = usePinned();
  const [hovered, setHovered] = useState(false);
  const mounted = useMounted();

  const expanded = pinned || hovered;

  return (
    <aside
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "hidden md:flex fixed inset-y-0 left-0 z-40 flex-col bg-sidebar border-r px-2.5 py-4 transition-[width] duration-200",
        expanded ? "w-60" : "w-16"
      )}
    >
      <Link href="/dashboard" className="flex items-center gap-2.5 h-10 px-2 mb-6">
        <span className="size-7 shrink-0 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-[13px] font-bold">
          S
        </span>
        <span
          className={cn(
            "text-[17px] font-bold tracking-tight transition-opacity",
            expanded ? "opacity-100" : "opacity-0"
          )}
        >
          Salli
        </span>
      </Link>

      <nav className="flex flex-col gap-1">
        {PRIMARY_NAV.map((item) => (
          <NavItem key={item.href} {...item} active={pathname.startsWith(item.href)} expanded={expanded} />
        ))}
      </nav>

      <button
        type="button"
        onClick={togglePanel}
        title={expanded ? undefined : "Ask Salli AI"}
        className="flex items-center gap-3 h-10 rounded-md px-2.5 mt-4 bg-[#0A2540] text-white text-sm font-medium hover:brightness-110 transition-all overflow-hidden"
      >
        <Sparkles className="size-[18px] shrink-0" />
        <span className={cn("whitespace-nowrap transition-opacity", expanded ? "opacity-100" : "opacity-0")}>
          Ask Salli AI
        </span>
      </button>

      <div className="h-px bg-border my-4 mx-1" />

      <nav className="flex flex-col gap-1">
        {SECONDARY_NAV.map((item) => (
          <NavItem key={item.href} {...item} active={pathname.startsWith(item.href)} expanded={expanded} />
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-1">
        <button
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title="Toggle dark mode"
          className="flex items-center gap-3 h-10 rounded-md px-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors overflow-hidden"
        >
          {mounted && theme === "dark" ? <Sun className="size-[18px] shrink-0" /> : <Moon className="size-[18px] shrink-0" />}
          <span className={cn("whitespace-nowrap transition-opacity", expanded ? "opacity-100" : "opacity-0")}>
            {mounted && theme === "dark" ? "Light mode" : "Dark mode"}
          </span>
        </button>
        <NavItem
          href="/settings"
          label="Settings"
          icon={Settings}
          active={pathname.startsWith("/settings")}
          expanded={expanded}
        />
        <button
          type="button"
          onClick={togglePin}
          title={pinned ? "Unpin sidebar" : "Pin sidebar open"}
          className="flex items-center gap-3 h-10 rounded-md px-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors overflow-hidden"
        >
          {pinned ? <PinOff className="size-[18px] shrink-0" /> : <Pin className="size-[18px] shrink-0" />}
          <span className={cn("whitespace-nowrap transition-opacity", expanded ? "opacity-100" : "opacity-0")}>
            {pinned ? "Unpin" : "Pin"}
          </span>
        </button>
      </div>
    </aside>
  );
}
