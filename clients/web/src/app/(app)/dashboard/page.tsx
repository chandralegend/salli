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
    <Card className={accent ? "ring-primary/30 bg-primary/[0.03]" : ""}>
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start justify-between mb-4">
          <p className="text-secondary-label">{label}</p>
          <div className={`w-7 h-7 rounded-md flex items-center justify-center ${accent ? "bg-primary/12" : "bg-muted"}`}>
            <Icon className={`size-3.5 ${accent ? "text-primary" : "text-muted-foreground"}`} />
          </div>
        </div>
        {loading ? (
          <Skeleton className="h-8 w-28" />
        ) : (
          <>
            <p className={`text-metric ${accent ? "text-primary" : "text-foreground"}`}>
              {value}
            </p>
            {(sub || trend) && (
              <div className="flex items-center gap-1.5 mt-1.5">
                {trend === "up" && <TrendingUp className="size-3 text-emerald-600" />}
                {trend === "down" && <TrendingDown className="size-3 text-rose-600" />}
                {sub && <span className="text-meta">{sub}</span>}
              </div>
            )}
          </>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold tracking-tight text-foreground">Overview</h1>
          <p className="text-meta mt-0.5">Assessment Year 2025/26 · Sri Lanka</p>
        </div>
        <span className="inline-flex items-center rounded-md bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground font-mono">
          LKR
        </span>
      </div>

      {/* Metric row — four-up stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="NET WORTH" value={`LKR ${netWorth}`} icon={Wallet} loading={loading} />
        <StatCard label="INCOME YTD" value={`LKR ${incomeYtd}`} icon={TrendingUp} loading={loading} trend="up" />
        <StatCard label="EXPENSES YTD" value={`LKR ${expensesYtd}`} icon={TrendingDown} loading={loading} trend="down" />
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
