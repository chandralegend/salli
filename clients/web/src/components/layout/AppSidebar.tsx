"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useScroogePanel } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Sun, Moon, Settings, LayoutGrid, BookOpen, Percent, TrendingUp, MessageCircle, FileText, Bell } from "lucide-react";
import { useState, useEffect } from "react";

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

function NavButton({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      title={label}
      className={cn(
        "w-[38px] h-[38px] flex items-center justify-center rounded-[11px] transition-colors",
        active
          ? "bg-white/15 text-[#E8FC85]"
          : "text-white/55 hover:text-white hover:bg-white/10"
      )}
    >
      {icon}
    </Link>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { toggle: toggleScrooge, isOpen: scroogeOpen } = useScroogePanel();
  const [dark, setDark] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  useEffect(() => {
    const stored = localStorage.getItem("salli-dark") === "1";
    setDark(stored);
    document.documentElement.classList.toggle("dark", stored);
  }, []);

  function toggleDark() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("salli-dark", next ? "1" : "0");
  }

  return (
    <aside className="w-[68px] min-w-[68px] bg-background flex flex-col items-center justify-center py-5 gap-3 shrink-0 pl-2">
      {/* Logo badge */}
      <Link
        href="/dashboard"
        className="@container w-[52px] aspect-square bg-[#010001] rounded-[22px] flex items-center justify-center cursor-pointer flex-shrink-0 shadow-[0_4px_16px_rgba(0,0,0,0.18),0_1px_4px_rgba(0,0,0,0.10)]"
      >
        <span className="text-[#E8FC85] font-black leading-none text-[48cqw] tracking-[-0.05em]">
          රු
        </span>
      </Link>

      {/* Primary nav dock */}
      <div className="flex flex-col items-center gap-[3px] bg-[#010001] rounded-[20px] px-[6px] py-[8px] shadow-[0_4px_24px_rgba(0,0,0,0.18),0_1px_4px_rgba(0,0,0,0.10)]">
        {NAV_PRIMARY.map(({ href, label, icon }) => (
          <NavButton
            key={href}
            href={href}
            label={label}
            icon={icon}
            active={isActive(href)}
          />
        ))}

        {/* Scrooge chat button */}
        <button
          onClick={toggleScrooge}
          title="Scrooge AI"
          className={cn(
            "w-[38px] h-[38px] flex items-center justify-center rounded-[11px] transition-colors",
            scroogeOpen
              ? "bg-white/15 text-[#E8FC85]"
              : "text-white/55 hover:text-white hover:bg-white/10"
          )}
        >
          <MessageCircle className="size-[17px]" />
        </button>

        {/* Divider */}
        <div className="w-[24px] h-px bg-white/12 my-2" />

        {NAV_SECONDARY.map(({ href, label, icon }) => (
          <NavButton
            key={href}
            href={href}
            label={label}
            icon={icon}
            active={isActive(href)}
          />
        ))}
      </div>

      {/* Bottom dock */}
      <div className="flex flex-col items-center gap-1 bg-[#010001] rounded-[20px] px-[6px] py-[8px] shadow-[0_4px_24px_rgba(0,0,0,0.18),0_1px_4px_rgba(0,0,0,0.10)] flex-shrink-0">
        {/* Dark mode toggle */}
        <button
          onClick={toggleDark}
          title={dark ? "Light mode" : "Dark mode"}
          className="w-[38px] h-[38px] flex items-center justify-center rounded-[11px] text-white/55 hover:text-white hover:bg-white/10 transition-colors"
        >
          {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>

        {/* Settings */}
        <button
          onClick={() => router.push("/settings")}
          title="Settings"
          className="w-[38px] h-[38px] flex items-center justify-center rounded-[11px] text-white/55 hover:text-white hover:bg-white/10 transition-colors"
        >
          <Settings className="size-4" />
        </button>
      </div>
    </aside>
  );
}
