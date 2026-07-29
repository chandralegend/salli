"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Banknote,
  CalendarClock,
  Landmark,
  PiggyBank,
  Plus,
  ReceiptText,
  ShoppingCart,
  Sparkles,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Card3D } from "@/components/shared/Card3D";
import { AffordabilityCard } from "@/components/fi/AffordabilityCard";
import { RadialProgress } from "@/components/shared/RadialProgress";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusChip } from "@/components/shared/StatusChip";
import { useState } from "react";
import { StatementUploadDialog } from "@/components/statements/StatementUploadDialog";
import { useDashboard } from "@/hooks/useDashboard";
import { useTax } from "@/hooks/useTax";
import { useFiScore } from "@/hooks/useFi";
import { useSalliStore, useScroogePanel } from "@/lib/store";
import {
  assessmentYearRange,
  daysUntil,
  deadlineLabel,
  formatCompact,
  formatDate,
  formatPct,
} from "@/lib/format";

const AI_QUESTIONS = [
  "What's my tax payable?",
  "Am I on track for FIRE?",
  "Where did I overspend?",
];

function deadlineTone(due: string): "danger" | "warning" | "neutral" {
  const d = daysUntil(due);
  if (d < 0) return "danger";
  if (d <= 30) return "warning";
  return "neutral";
}

export default function DashboardPage() {
  const router = useRouter();
  const dash = useDashboard();
  const { latest } = useTax();
  const fiScore = useFiScore();
  const requestQuickAdd = useSalliStore((s) => s.requestQuickAddEntry);
  const openWithPrompt = useScroogePanel((s) => s.openWithPrompt);
  const openPanel = useScroogePanel((s) => s.open);
  const [uploadOpen, setUploadOpen] = useState(false);

  const ay = assessmentYearRange();
  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const tax = latest.data;
  const fi = fiScore.data;
  const savingsRate = fi ? Number(fi.savings_rate) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        subtitle={`${today} · Assessment Year ${ay.label} · Sri Lanka · LKR`}
        actions={
          <>
            <Button variant="outline" onClick={() => setUploadOpen(true)}>
              <Upload className="size-4" />
              Upload statement
            </Button>
            <Button
              id="tour-new-entry"
              onClick={() => {
                requestQuickAdd();
                router.push("/ledger");
              }}
            >
              <Plus className="size-4" />
              New entry
            </Button>
          </>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Net Worth"
          icon={Landmark}
          loading={dash.loading}
          value={`LKR ${formatCompact(dash.netWorth.replace(/,/g, ""))}`}
          caption="all assets − liabilities"
        />
        <StatCard
          label="Income YTD"
          icon={Banknote}
          loading={dash.loading}
          value={`LKR ${formatCompact(dash.incomeYtd.replace(/,/g, ""))}`}
          caption="this assessment year"
        />
        <StatCard
          label="Expenses YTD"
          icon={ShoppingCart}
          loading={dash.loading}
          value={`LKR ${formatCompact(dash.expensesYtd.replace(/,/g, ""))}`}
          caption="this assessment year"
        />
        <StatCard
          label="Savings Rate"
          icon={PiggyBank}
          loading={fiScore.isLoading}
          value={formatPct(fi?.savings_rate)}
          badge={
            // savings_rate is a 0..1 fraction: the old `>= 40` test needed a
            // 4000% savings rate and so could never fire.
            savingsRate != null && savingsRate >= 0.4 ? (
              <StatusChip tone="success">above target</StatusChip>
            ) : undefined
          }
          caption="of monthly income"
        />
      </div>

      {/* Feature cards: Tax payable + FI score */}
      <div className="grid lg:grid-cols-5 gap-4">
        <div id="tour-dash-tax-card" className="lg:col-span-3 rounded-lg border bg-card p-5 flex flex-col">
          <div className="flex items-start justify-between">
            <p className="eyebrow">Tax Payable · YA {tax?.year ?? "2025/26"}</p>
            {tax && <StatusChip tone="warning">due Jul 31</StatusChip>}
          </div>
          {latest.isLoading ? (
            <Skeleton className="h-10 w-56 mt-4" />
          ) : tax ? (
            <>
              <p className="money text-4xl font-semibold mt-4">LKR {tax.tax_payable}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Computed by the deterministic engine · after reliefs &amp; credits
              </p>
              <div className="mt-4 pt-4 border-t space-y-1.5">
                <div className="flex justify-between text-xs money">
                  <span className="text-muted-foreground">Gross income</span>
                  <span>{tax.gross_income}</span>
                </div>
                <div className="flex justify-between text-xs money">
                  <span className="text-muted-foreground">Personal relief</span>
                  <span>({tax.personal_relief})</span>
                </div>
                {tax.credits.apit !== "0.00" && (
                  <div className="flex justify-between text-xs money">
                    <span className="text-muted-foreground">APIT credit</span>
                    <span>({tax.credits.apit})</span>
                  </div>
                )}
                {tax.credits.ait !== "0.00" && (
                  <div className="flex justify-between text-xs money">
                    <span className="text-muted-foreground">AIT credit</span>
                    <span>({tax.credits.ait})</span>
                  </div>
                )}
                {tax.credits.ftc !== "0.00" && (
                  <div className="flex justify-between text-xs money">
                    <span className="text-muted-foreground">Foreign tax credit</span>
                    <span>({tax.credits.ftc})</span>
                  </div>
                )}
              </div>
              <Link
                href="/tax"
                className="mt-auto pt-4 inline-flex items-center gap-1 text-[13px] font-medium hover:underline"
              >
                View full breakdown <ArrowRight className="size-3.5" />
              </Link>
            </>
          ) : (
            <EmptyState
              icon={ReceiptText}
              title="No tax computed yet"
              body="Run the deterministic engine on your posted ledger to see your YA figures."
              action={
                <Button size="sm" onClick={() => router.push("/tax")}>
                  Compute your tax
                </Button>
              }
            />
          )}
        </div>

        <Card3D id="tour-dash-fi-card" className="lg:col-span-2" contentClassName="flex h-full flex-col p-5">
          <div className="flex items-start justify-between">
            <p className="eyebrow text-white/60">Freedom Score</p>
            <Sparkles className="size-4 text-white/50" />
          </div>
          {fiScore.isLoading ? (
            <div className="mt-3 space-y-3">
              <Skeleton className="h-8 w-28 bg-white/15" />
              <Skeleton className="h-3.5 w-20 bg-white/15" />
            </div>
          ) : (
            fi && (
              <>
                <div className="flex items-center gap-3.5 mt-3">
                  <RadialProgress value={Number(fi.overall_score)} size={56} ringWidth={6} />
                  <div>
                    <p className="money text-[18px] font-semibold leading-none">{fi.grade}</p>
                    <p className="text-xs text-white/60 mt-1">{Number(fi.overall_score).toFixed(0)} / 100</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 mt-4">
                  {fi.components.slice(0, 4).map((c) => (
                    <div key={c.key}>
                      <p className="text-[11px] text-white/50">{c.label}</p>
                      <p className="money text-sm font-semibold mt-0.5">{Number(c.score).toFixed(0)}</p>
                    </div>
                  ))}
                </div>
                <Link
                  href="/financial-independence"
                  className="inline-flex items-center gap-1 text-[13px] font-medium text-white mt-auto pt-3 hover:underline"
                >
                  View Freedom strategy <ArrowRight className="size-3.5" />
                </Link>
              </>
            )
          )}
        </Card3D>
      </div>

      {/* The pre-purchase question — sits under the Freedom card because it is
          the actionable half of it: that card says when you're free, this one
          says what a purchase costs you. */}
      <AffordabilityCard id="tour-dash-afford-card" />

      {/* Recent entries + deadlines */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-semibold">Recent Entries</h2>
            <Link href="/ledger" className="text-[13px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              All <ArrowRight className="size-3.5" />
            </Link>
          </div>
          {dash.loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : dash.recentEntries.length === 0 ? (
            <EmptyState
              icon={Upload}
              title="No entries yet"
              body="Upload a bank statement and Salli will draft your first entries."
              action={
                <Button size="sm" variant="outline" onClick={() => setUploadOpen(true)}>
                  Upload statement
                </Button>
              }
            />
          ) : (
            <div className="divide-y">
              {dash.recentEntries.map((e) => {
                const amount = e.postings.find((p) => p.direction === 1)?.amount ?? "0";
                // Money-in when the credited side is an income account (salary, interest…).
                const credit = e.postings.some(
                  (p) => p.direction === -1 && dash.accountMap[p.account_id]?.type === "income"
                );
                return (
                  <div key={e.id} className="flex items-center gap-3 py-2.5">
                    <span className="font-mono text-xs text-muted-foreground w-20 shrink-0">{e.entry_date}</span>
                    <span className="text-sm truncate flex-1 min-w-0">{e.description}</span>
                    <StatusChip tone={credit ? "success" : "neutral"}>{credit ? "CR" : "DR"}</StatusChip>
                    <span className="money text-sm w-32 text-right shrink-0">LKR {Number(amount).toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-semibold">Deadlines</h2>
            <Link href="/reminders" className="text-[13px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              All <ArrowRight className="size-3.5" />
            </Link>
          </div>
          {dash.loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : dash.upcomingReminders.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="No deadlines tracked"
              body="Seed the IRD filing calendar for this assessment year."
              action={
                <Button size="sm" variant="outline" onClick={() => router.push("/reminders")}>
                  Seed calendar
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {dash.upcomingReminders.map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-md border px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.kind}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(r.due_date)}</p>
                  </div>
                  <StatusChip tone={deadlineTone(r.due_date)}>{deadlineLabel(r.due_date)}</StatusChip>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI strip */}
      <div className="rounded-lg bg-[var(--emphasis)] text-white p-5 flex flex-wrap items-center gap-4">
        <div className="size-9 rounded-md bg-white/10 flex items-center justify-center shrink-0">
          <Sparkles className="size-4.5" />
        </div>
        <div className="flex-1 min-w-52">
          <p className="text-[15px] font-semibold">Ask Salli anything about your money</p>
          <p className="text-[13px] text-white/60">
            Tax, projections, spending — answered from your real ledger. Never guessed.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {AI_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => openWithPrompt(q)}
              className="rounded-full bg-white/10 hover:bg-white/20 px-3.5 py-1.5 text-[13px] transition-colors"
            >
              {q}
            </button>
          ))}
          <button
            type="button"
            onClick={() => openPanel()}
            className="rounded-full bg-white text-primary px-4 py-1.5 text-[13px] font-semibold inline-flex items-center gap-1 hover:bg-white/90 transition-colors"
          >
            Start conversation <ArrowRight className="size-3.5" />
          </button>
        </div>
      </div>

      <StatementUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  );
}
