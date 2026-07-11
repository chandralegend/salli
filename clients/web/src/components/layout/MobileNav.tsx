"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, BookOpen, TrendingUp, MessageCircle, Plus } from "lucide-react";
import { useSalliStore, useScroogePanel } from "@/lib/store";
import { cn } from "@/lib/utils";

const ACTIVE = "#E8FC85";
const INACTIVE = "rgba(255,255,255,0.55)";

// ── MobileNav ─────────────────────────────────────────────────────────────────
// Floating bottom dock for narrow viewports (§10). Mirrors the native mobile
// app's dock — same five destinations, same raised lime "+" — so the product
// feels identical whichever surface someone opens.

const DESTINATIONS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/ledger", label: "Ledger", icon: BookOpen },
] as const;

const DESTINATIONS_RIGHT = [
  { href: "/financial-independence", label: "Financial Independence", icon: TrendingUp },
] as const;

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const requestQuickAddEntry = useSalliStore((s) => s.requestQuickAddEntry);
  const { toggle: toggleScrooge, isOpen: scroogeOpen } = useScroogePanel();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  function handleAdd() {
    requestQuickAddEntry();
    router.push("/ledger");
  }

  function NavIcon({ href, label, Icon }: { href: string; label: string; Icon: typeof LayoutGrid }) {
    const active = isActive(href);
    return (
      <Link href={href} aria-label={label} className="flex-1 flex items-center justify-center h-full">
        <div
          className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-colors")}
          style={{ background: active ? "rgba(255,255,255,0.15)" : "transparent" }}
        >
          <Icon size={20} color={active ? ACTIVE : INACTIVE} />
        </div>
      </Link>
    );
  }

  return (
    <nav
      className="md:hidden fixed left-4 right-4 z-50 flex items-center px-[6px]"
      style={{
        bottom: "max(16px, env(safe-area-inset-bottom))",
        height: 68,
        background: "#010001",
        borderRadius: 30,
        boxShadow: "var(--shadow-navigation)",
      }}
    >
      {DESTINATIONS.map((d) => (
        <NavIcon key={d.href} href={d.href} label={d.label} Icon={d.icon} />
      ))}

      <div className="flex-1 flex items-center justify-center h-full">
        <button
          onClick={handleAdd}
          aria-label="Add entry"
          className="flex items-center justify-center rounded-full transition-transform active:scale-95"
          style={{
            width: 58,
            height: 58,
            marginTop: -20,
            background: "#E8FC85",
            boxShadow: "0 8px 20px rgba(232,252,133,0.35)",
          }}
        >
          <Plus size={26} strokeWidth={2.5} color="#010001" />
        </button>
      </div>

      <button
        onClick={toggleScrooge}
        aria-label="Scrooge AI"
        className="flex-1 flex items-center justify-center h-full"
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
          style={{ background: scroogeOpen ? "rgba(255,255,255,0.15)" : "transparent" }}
        >
          <MessageCircle size={20} color={scroogeOpen ? ACTIVE : INACTIVE} />
        </div>
      </button>

      {DESTINATIONS_RIGHT.map((d) => (
        <NavIcon key={d.href} href={d.href} label={d.label} Icon={d.icon} />
      ))}
    </nav>
  );
}
