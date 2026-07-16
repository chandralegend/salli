"use client";

import Link from "next/link";
import {
  Upload,
  Wallet,
  CreditCard,
  PieChart,
  Shield,
  Repeat,
  FileBarChart,
  ScrollText,
  ChevronRight,
} from "lucide-react";
import { PageShell, PageHeader, CardContainer } from "@/components/ui/page-shell";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/statements", label: "Statements", sub: "Upload & approve bank statements", icon: Upload },
  { href: "/budget", label: "Budget", sub: "Category limits vs. actual spend", icon: Wallet },
  { href: "/debt", label: "Debt", sub: "Payoff plans — avalanche & snowball", icon: CreditCard },
  { href: "/portfolio", label: "Portfolio", sub: "Holdings, allocation & ROI", icon: PieChart },
  { href: "/insurance", label: "Insurance", sub: "Policies & coverage gaps", icon: Shield },
  { href: "/subscriptions", label: "Subscriptions", sub: "Recurring charges & alerts", icon: Repeat },
  { href: "/reports", label: "Reports", sub: "Balance sheet, net worth & goals", icon: FileBarChart },
  { href: "/audit-log", label: "Audit Log", sub: "Every agent-initiated write", icon: ScrollText },
] as const;

export default function MorePage() {
  return (
    <PageShell>
      <PageHeader title="More" subtitle="Everything else Salli tracks for you" />
      <CardContainer padding={0} className="overflow-hidden">
        {ITEMS.map((item, i) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3.5 px-5 py-4 hover:bg-muted/60 transition-colors",
                i !== ITEMS.length - 1 && "border-b border-border",
              )}
            >
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Icon className="size-[17px] text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-foreground">{item.label}</p>
                <p className="text-[12px] text-muted-foreground mt-0.5">{item.sub}</p>
              </div>
              <ChevronRight className="size-[18px] text-muted-foreground shrink-0" />
            </Link>
          );
        })}
      </CardContainer>
    </PageShell>
  );
}
