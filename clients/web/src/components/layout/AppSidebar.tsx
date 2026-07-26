"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  BookOpen,
  CreditCard,
  FileText,
  History,
  LayoutGrid,
  Percent,
  PieChart,
  Receipt,
  Repeat,
  Shield,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { NavUser } from "./NavUser";

const PRIMARY_NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/ledger", label: "Ledger", icon: BookOpen },
  { href: "/tax", label: "Tax", icon: Percent },
  { href: "/financial-independence", label: "Financial Independence", icon: TrendingUp },
];

const SECONDARY_NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/budget", label: "Budget", icon: Wallet },
  { href: "/debt", label: "Debt", icon: CreditCard },
  { href: "/portfolio", label: "Portfolio", icon: PieChart },
  { href: "/subscriptions", label: "Subscriptions", icon: Repeat },
  { href: "/insurance", label: "Insurance", icon: Shield },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/statements", label: "Statements", icon: Receipt },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/reminders", label: "Reminders", icon: Bell },
  { href: "/audit-log", label: "Audit Log", icon: History },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link href="/dashboard" className="flex h-8 min-w-0 items-center gap-2">
          <span className="font-heading text-[13px] font-extrabold text-primary-foreground bg-primary size-7 shrink-0 rounded-md flex items-center justify-center">
            S
          </span>
          <span className="font-heading text-[17px] font-extrabold tracking-tight truncate group-data-[collapsible=icon]:hidden">
            Salli<span className="text-primary">.</span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {PRIMARY_NAV.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={pathname.startsWith(item.href)}
                    tooltip={item.label}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>More</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {SECONDARY_NAV.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={pathname.startsWith(item.href)}
                    tooltip={item.label}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
