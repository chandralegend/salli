"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useScroogePanel } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Sun, Moon, Settings, LayoutGrid, BookOpen, Percent, TrendingUp, MessageCircle, FileText, Bell, Pin, PinOff } from "lucide-react";
import { useState, useEffect, useRef } from "react";

const NAV_PRIMARY = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: <LayoutGrid className="size-[17px]" />,
  },
  {
    href: "/ledger",
    label: "Ledger",
    icon: <BookOpen className="size-[17px]" />,
  },
  {
    href: "/tax",
    label: "Tax",
    icon: <Percent className="size-[17px]" />,
  },
  {
    href: "/financial-independence",
    label: "Financial Independence",
    icon: <TrendingUp className="size-[17px]" />,
  },
];

const NAV_SECONDARY = [
  {
    href: "/documents",
    label: "Documents",
    icon: <FileText className="size-[17px]" />,
  },
  {
    href: "/reminders",
    label: "Reminders",
    icon: <Bell className="size-[17px]" />,
  },
];

// ── NavRow ────────────────────────────────────────────────────────────────────
// Collapsed: a centered 38×38 icon button. Expanded: a full-width row with the
// icon fixed in place and a label revealed alongside it — the icon never moves,
// so expand/collapse never feels like a layout jump.

function NavRow({
  href,
  label,
  icon,
  active,
  expanded,
  onClick,
}: {
  href?: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  expanded: boolean;
  onClick?: () => void;
}) {
  const inner = (
    <div
      className={cn(
        "flex items-center gap-3 h-[42px] rounded-[13px] transition-colors duration-[var(--motion-fast)]",
        expanded ? "w-full px-[10px]" : "w-[38px] justify-center",
        !active && "text-white/55 hover:text-white hover:bg-white/[0.07]",
      )}
      style={
        active
          ? {
              color: "#E8FC85",
              background: "linear-gradient(90deg, rgba(232,252,133,0.16), rgba(255,255,255,0.05))",
              boxShadow: "inset 0 0 0 1px rgba(232,252,133,0.18)",
            }
          : undefined
      }
    >
      <span className="w-[20px] h-[20px] flex items-center justify-center shrink-0">{icon}</span>
      {expanded && (
        <span className="text-[13px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis">
          {label}
        </span>
      )}
    </div>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        title={expanded ? undefined : label}
        aria-label={label}
        aria-current={active ? "page" : undefined}
        className="w-full"
      >
        {inner}
      </button>
    );
  }
  return (
    <Link
      href={href!}
      title={expanded ? undefined : label}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className="w-full block"
    >
      {inner}
    </Link>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { toggle: toggleScrooge, isOpen: scroogeOpen } = useScroogePanel();
  const [dark, setDark] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const expanded = pinned || hovered;

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  useEffect(() => {
    const storedDark = localStorage.getItem("salli-dark") === "1";
    setDark(storedDark);
    document.documentElement.classList.toggle("dark", storedDark);

    const storedPin = localStorage.getItem("salli-nav-pinned") === "1";
    setPinned(storedPin);
  }, []);

  function toggleDark() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("salli-dark", next ? "1" : "0");
  }

  function togglePin() {
    const next = !pinned;
    setPinned(next);
    localStorage.setItem("salli-nav-pinned", next ? "1" : "0");
  }

  function onEnter() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setHovered(true), 150);
  }
  function onLeave() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setHovered(false);
  }

  return (
    <>
      {/* Reserved rail slot — the actual nav is a fixed overlay, so hover-expand
          never pushes page content (per redesign spec §9). Desktop only —
          narrow viewports use the floating MobileNav dock instead. */}
      <div className="hidden md:block w-[68px] min-w-[68px] shrink-0" aria-hidden />

      <aside
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        className="hidden md:flex fixed left-0 top-0 bottom-0 z-50 flex-col items-center justify-center py-5 gap-3 pl-2 overflow-visible transition-[width] duration-[var(--motion-default)] ease-[var(--ease-premium)]"
        style={{ width: expanded ? 232 : 68 }}
      >
        {/* Consolidated nav dock — logo, nav items, and utilities all live in
            one continuous rail instead of separate boxes, per the
            navigation-system spec. */}
        <div
          className={cn(
            "flex flex-col gap-[3px] bg-[#010001] rounded-[20px] py-[8px] shadow-[var(--shadow-navigation)] shrink-0",
            expanded ? "w-full px-[10px]" : "px-[6px] items-center",
          )}
        >
          {/* Logo — first row of the same rail */}
          <Link
            href="/dashboard"
            aria-label="Salli — Dashboard"
            className={cn(
              "flex items-center gap-3 h-[42px] rounded-[13px] shrink-0",
              expanded ? "w-full px-[10px]" : "w-[38px] justify-center",
            )}
          >
            <span className="w-[20px] h-[20px] flex items-center justify-center shrink-0">
              <span className="text-[#E8FC85] font-black leading-none text-[20px] tracking-[-0.05em]">
                රු
              </span>
            </span>
            {expanded && (
              <span className="text-[13px] font-black tracking-[-0.03em] text-white whitespace-nowrap">
                Salli
              </span>
            )}
          </Link>

          <div className={cn("h-px bg-white/12 my-2", expanded ? "w-full" : "w-[24px]")} />

          {NAV_PRIMARY.map(({ href, label, icon }) => (
            <NavRow
              key={href}
              href={href}
              label={label}
              icon={icon}
              active={isActive(href)}
              expanded={expanded}
            />
          ))}

          <NavRow
            label="Scrooge AI"
            icon={<MessageCircle className="size-[17px]" />}
            active={scroogeOpen}
            expanded={expanded}
            onClick={toggleScrooge}
          />

          {NAV_SECONDARY.map(({ href, label, icon }) => (
            <NavRow
              key={href}
              href={href}
              label={label}
              icon={icon}
              active={isActive(href)}
              expanded={expanded}
            />
          ))}

          <div className={cn("h-px bg-white/12 my-2", expanded ? "w-full" : "w-[24px]")} />

          <NavRow
            label={dark ? "Light mode" : "Dark mode"}
            icon={dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            active={false}
            expanded={expanded}
            onClick={toggleDark}
          />
          <NavRow
            label="Settings"
            icon={<Settings className="size-4" />}
            active={isActive("/settings")}
            expanded={expanded}
            onClick={() => router.push("/settings")}
          />
          {expanded && (
            <button
              onClick={togglePin}
              title={pinned ? "Unpin navigation" : "Keep navigation expanded"}
              className="w-full flex items-center gap-3 h-[36px] rounded-[13px] px-[10px] text-white/40 hover:text-white hover:bg-white/[0.07] transition-colors duration-[var(--motion-fast)] shrink-0"
            >
              <span className="w-[20px] h-[20px] flex items-center justify-center shrink-0">
                {pinned ? <PinOff className="size-[15px]" /> : <Pin className="size-[15px]" />}
              </span>
              <span className="text-[12px] font-semibold whitespace-nowrap">
                {pinned ? "Unpin" : "Pin open"}
              </span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
