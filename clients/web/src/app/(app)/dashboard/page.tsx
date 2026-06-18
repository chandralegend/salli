"use client";

import Link from "next/link";
import { Bot, ArrowRight } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { PostingRow } from "@/components/PostingRow";
import { DeadlineChip } from "@/components/DeadlineChip";
import { useDashboard } from "@/hooks/useDashboard";

export default function DashboardPage() {
  const { loading, netWorth, incomeYtd, expensesYtd, upcomingReminders, recentEntries } =
    useDashboard();

  return (
    <div className="p-6 max-w-[1280px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          YA 2025/26 · LKR
        </p>
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-4 gap-4">
        {/* Net Worth — large, 2 cols × 2 rows */}
        <MetricCard
          label="Net Worth"
          value={`LKR ${netWorth}`}
          large
          loading={loading}
          className="col-span-2 row-span-2"
        />

        <MetricCard
          label="Tax Payable"
          value="LKR —"
          loading={loading}
          className="col-span-1"
        />
        <MetricCard
          label="Income YTD"
          value={`LKR ${incomeYtd}`}
          deltaPositive
          loading={loading}
          className="col-span-1"
        />
        <MetricCard
          label="Expenses YTD"
          value={`LKR ${expensesYtd}`}
          loading={loading}
          className="col-span-1"
        />
        <MetricCard
          label="APIT Credit"
          value="LKR —"
          loading={loading}
          className="col-span-1"
        />

        {/* Recent Transactions — full width */}
        <div className="col-span-4 rounded-[16px] bg-card border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">
              Recent Entries
            </h2>
            <Link
              href="/ledger"
              className="text-xs text-primary flex items-center gap-1 hover:underline"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {recentEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No entries yet. Upload a bank statement to get started.
            </p>
          ) : (
            <div>
              {recentEntries.map((entry) => {
                const firstPosting = entry.postings[0];
                if (!firstPosting) return null;
                return (
                  <PostingRow
                    key={entry.id}
                    date={entry.entry_date}
                    description={entry.description}
                    amount={firstPosting.amount}
                    isCredit={firstPosting.direction === -1}
                    currency={firstPosting.currency}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Agent Quick Start */}
        <div className="col-span-2 rounded-[16px] bg-card border border-border p-6 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">
              Tax Agent
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Ask about your tax position, deductions, or get help filing your
            return.
          </p>
          <Link
            href="/agent"
            className="mt-auto inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-[10px] w-fit hover:bg-primary/90 transition-colors"
          >
            Start a conversation <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Upcoming Deadlines */}
        <div className="col-span-2 rounded-[16px] bg-card border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">
              Upcoming Deadlines
            </h2>
            <Link
              href="/reminders"
              className="text-xs text-primary flex items-center gap-1 hover:underline"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {upcomingReminders.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No upcoming deadlines.{" "}
              <Link href="/reminders" className="text-primary hover:underline">
                Seed filing calendar →
              </Link>
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {upcomingReminders.map((r) => (
                <div key={r.id} className="flex items-center justify-between">
                  <span className="text-sm text-foreground">{r.kind}</span>
                  <DeadlineChip
                    dueDate={r.due_date}
                    done={r.status === "done"}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
