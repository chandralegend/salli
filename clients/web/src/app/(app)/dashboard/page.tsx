"use client";

import Link from "next/link";
import { Bot, ArrowRight, TrendingUp, TrendingDown, Wallet, Receipt, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PostingRow } from "@/components/PostingRow";
import { DeadlineChip } from "@/components/DeadlineChip";
import { useDashboard } from "@/hooks/useDashboard";
import { useTax } from "@/hooks/useTax";
import { cn } from "@/lib/utils";

function Amount({ value, className }: { value: string; className?: string }) {
  // Render a "LKR 1,234.00" string with the currency code set quiet and small,
  // so the figure itself carries the weight — like an amount column in a ledger.
  const m = value.match(/^([A-Z]{3})\s+(.*)$/);
  if (!m) return <span className={className}>{value}</span>;
  return (
    <span className={className}>
      <span className="text-[0.62em] font-medium text-muted-foreground mr-1 align-baseline tracking-normal">
        {m[1]}
      </span>
      {m[2]}
    </span>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  loading,
  trend,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  loading?: boolean;
  trend?: "up" | "down";
  accent?: boolean;
}) {
  return (
    <Card
      className={cn(
        "transition-shadow duration-200 hover:shadow-[0_1px_12px_rgb(0_0_0/0.04)]",
        accent && "ring-primary/25 bg-primary/[0.04]",
      )}
    >
      <CardContent>
        <div className="flex items-center justify-between">
          <p className="text-secondary-label">{label}</p>
          <Icon className={cn("size-3.5", accent ? "text-primary" : "text-muted-foreground/45")} />
        </div>
        {loading ? (
          <Skeleton className="h-7 w-28 mt-3" />
        ) : (
          <Amount
            value={value}
            className={cn("text-metric block mt-3", accent ? "text-primary" : "text-foreground")}
          />
        )}
        {(sub || trend) && (
          <div className="flex items-center gap-1 mt-2 text-meta">
            {trend === "up" && <TrendingUp className="size-3 text-emerald-600" />}
            {trend === "down" && <TrendingDown className="size-3 text-rose-600" />}
            {sub && <span>{sub}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { loading, netWorth, incomeYtd, expensesYtd, upcomingReminders, recentEntries } = useDashboard();
  const { latest } = useTax();

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-foreground">Overview</h1>
          <p className="text-meta mt-1">Assessment Year 2025/26 · Sri Lanka</p>
        </div>
        <span className="inline-flex items-center rounded-md ring-1 ring-foreground/10 bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground font-mono">
          LKR
        </span>
      </div>

      {/* Metric row — four-up stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="NET WORTH" value={`LKR ${netWorth}`} icon={Wallet} loading={loading} />
        <StatCard label="INCOME YTD" value={`LKR ${incomeYtd}`} icon={TrendingUp} loading={loading} />
        <StatCard label="EXPENSES YTD" value={`LKR ${expensesYtd}`} icon={TrendingDown} loading={loading} />
        <StatCard
          label="TAX PAYABLE"
          value={latest.data ? `LKR ${latest.data.tax_payable}` : "—"}
          icon={Receipt}
          loading={latest.isLoading}
          accent
        />
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Recent entries — 2 col */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[13px] font-semibold">Recent Entries</CardTitle>
            <Link
              href="/ledger"
              className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted"
            >
              View all <ArrowRight className="size-3" />
            </Link>
          </CardHeader>
          <CardContent className="pb-2 px-4">
            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
              </div>
            ) : recentEntries.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <AlertCircle className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[13px] font-medium">No transactions yet</p>
                  <p className="text-meta mt-0.5">Upload a bank statement to get started</p>
                </div>
                <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/statements" />}>
                  Upload statement
                </Button>
              </div>
            ) : (
              recentEntries.map((entry) => {
                const fp = entry.postings[0];
                if (!fp) return null;
                return (
                  <PostingRow
                    key={entry.id}
                    date={entry.entry_date}
                    description={entry.description}
                    amount={fp.amount}
                    isCredit={fp.direction === -1}
                    currency={fp.currency}
                  />
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="flex flex-col gap-3">
          {/* AI Agent CTA */}
          <Card className="bg-foreground text-background overflow-hidden relative border-0">
            <CardContent className="pt-5 pb-5 relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-md bg-white/15 flex items-center justify-center">
                  <Bot className="size-3.5" />
                </div>
                <p className="text-[13px] font-semibold">AI Tax Agent</p>
              </div>
              <p className="text-[12px] opacity-60 mb-4 leading-relaxed">
                Ask about your tax position, deductions, or how to interpret your IRD return.
              </p>
              <Link
                href="/agent"
                className="inline-flex items-center gap-1.5 text-[12px] font-medium bg-white/12 hover:bg-white/20 transition-colors px-3 py-1.5 rounded-md"
              >
                Start conversation <ArrowRight className="size-3" />
              </Link>
            </CardContent>
          </Card>

          {/* Upcoming deadlines */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[13px] font-semibold">Upcoming Deadlines</CardTitle>
              <Link
                href="/reminders"
                className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted"
              >
                All <ArrowRight className="size-3" />
              </Link>
            </CardHeader>
            <CardContent className="pb-4 px-4">
              {upcomingReminders.length === 0 ? (
                <div className="py-4 text-center">
                  <p className="text-meta mb-3">No upcoming deadlines</p>
                  <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/reminders" />}>
                    Seed filing calendar
                  </Button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {upcomingReminders.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-2">
                      <p className="text-[12px] truncate text-muted-foreground">{r.kind}</p>
                      <DeadlineChip dueDate={r.due_date} done={r.status === "done"} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
