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

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const PRIMARY_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/ledger", label: "Ledger", icon: BookOpen },
  { href: "/tax", label: "Tax", icon: Percent },
  { href: "/financial-independence", label: "Freedom", icon: TrendingUp },
];

export const SECONDARY_NAV: NavItem[] = [
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

/** Routes with no entry in either nav array above — reached via other UI
 * (the avatar popover for Settings) — need a fallback label for the
 * breadcrumb's 2nd crumb. */
const EXTRA_ROUTE_LABELS: Record<string, string> = {
  "/settings": "Settings",
};

export function getRouteLabel(pathname: string): string | null {
  const match = [...PRIMARY_NAV, ...SECONDARY_NAV].find((item) => pathname.startsWith(item.href));
  if (match) return match.label;
  const extra = Object.entries(EXTRA_ROUTE_LABELS).find(([href]) => pathname.startsWith(href));
  return extra?.[1] ?? null;
}
