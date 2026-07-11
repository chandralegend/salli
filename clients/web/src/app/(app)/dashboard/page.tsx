"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Upload, Plus, ArrowRight, MessageCircle, Home, TrendingUp, Activity } from "lucide-react";
import { IconBadge, SparklineWatermark, BarsWatermark, RingWatermark, LandmarkWatermark } from "@/components/ui/card-watermarks";
import { Skeleton } from "@/components/ui/skeleton";
import { PostingRow } from "@/components/PostingRow";
import { DeadlineChip } from "@/components/DeadlineChip";
import { useDashboard } from "@/hooks/useDashboard";
import { useTax } from "@/hooks/useTax";
import { useFiScore } from "@/hooks/useFi";
import { useScroogePanel } from "@/lib/store";
import { PageShell, PageHeader, IconAction, BentoTile, CardContainer } from "@/components/ui/page-shell";
import { StatementUploadModal } from "@/components/StatementUploadModal";

// ── Helpers ───────────────────────────────────────────────────────────────────

function compact(s: string): { main: string; suffix: string } {
  const n = parseFloat(s.replace(/,/g, ""));
  if (!isFinite(n)) return { main: s, suffix: "" };
  if (Math.abs(n) >= 1_000_000) return { main: (n / 1_000_000).toFixed(2), suffix: "M" };
  if (Math.abs(n) >= 1_000) return { main: (n / 1_000).toFixed(0), suffix: "K" };
  return { main: s, suffix: "" };
}

function formatPct(v: string | null | undefined): string {
  if (!v) return "—";
  const n = parseFloat(v);
  if (!isFinite(n)) return v;
  return `${(n * 100).toFixed(1)}`;
}

// ── Card chrome — contextual icon badge + decorative watermarks (§6, §8) ──────

// ── Sub-score bar ─────────────────────────────────────────────────────────────

function SubBar({ label, score, color = "#E8FC85" }: { label: string; score: number; color?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[12px] text-white/45 w-[72px] shrink-0">{label}</span>
      <div className="flex-1 h-[3px] bg-white/8 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, score)}%`, background: color }} />
      </div>
      <span className="text-[11px] font-bold text-white/50 w-[20px] text-right shrink-0">{score}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { loading, netWorth, incomeYtd, expensesYtd, upcomingReminders, recentEntries } = useDashboard();
  const { latest } = useTax();
  const { data: fiData, isLoading: fiLoading } = useFiScore();
  const { open: openScrooge } = useScroogePanel();
  const router = useRouter();
  const [uploadOpen, setUploadOpen] = useState(false);

  const nw = compact(netWorth);
  const inc = compact(incomeYtd);
  const exp = compact(expensesYtd);
  const savingsPct = fiData?.savings_rate ? formatPct(fiData.savings_rate) : "—";

  const today = new Date().toLocaleDateString("en-LK", { month: "short", day: "numeric", year: "numeric" });

  const fiScore = fiData ? Math.round(Number(fiData.overall_score)) : 0;
  const fiComponents = fiData?.components ?? [];

  return (
    <PageShell center>
      <PageHeader
        title="Overview"
        subtitle={`${today} · Assessment Year 2025/26 · Sri Lanka · LKR`}
        className="mb-5"
        actions={
          <>
            <button
              onClick={() => setUploadOpen(true)}
              className="w-[42px] h-[42px] bg-foreground text-background rounded-xl flex items-center justify-center hover:bg-foreground/85 transition-colors"
              title="Upload statement"
            >
              <Upload className="size-[17px]" />
            </button>
            <IconAction onClick={() => router.push("/ledger")} title="New entry">
              <Plus className="size-[17px]" />
            </IconAction>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

        {/* Row 1 col 1 — Net Worth */}
        <BentoTile
          variant="navy"
          label="Net Worth"
          sub="Total financial standing"
          value={nw.main}
          suffix={nw.suffix || undefined}
          badge={loading ? undefined : "+0.0%"}
          icon={<IconBadge><Home className="size-4 text-white" /></IconBadge>}
          watermark={<SparklineWatermark />}
          loading={loading}
          onClick={() => router.push("/financial-independence")}
        />

        {/* Row 1 col 2 — Income YTD */}
        <BentoTile
          variant="green"
          label="Income YTD"
          sub="This assessment year"
          value={inc.main}
          suffix={inc.suffix || undefined}
          badge={loading ? undefined : "YTD"}
          icon={<IconBadge><TrendingUp className="size-4 text-white" /></IconBadge>}
          watermark={<BarsWatermark />}
          loading={loading}
        />

        {/* Col 3, rows 1-2 — Tax Payable (gold, spans 2 rows) */}
        <BentoTile
          variant="gold"
          label="Tax Payable"
          sub="Assessment Year 2025/26 · Sri Lanka IRD"
          value=""
          minHeight={0}
          className="justify-start lg:col-start-3 lg:row-span-2"
          watermark={<LandmarkWatermark />}
          onClick={() => router.push("/tax")}
        >
          <div className="text-[12px] mt-1" style={{ color: "rgba(23,18,8,0.4)" }}>Due Jul 31, 2025</div>
          <div className="flex-1" />
          {latest.isLoading ? (
            <Skeleton className="h-12 w-36 mb-4" style={{ background: "rgba(23,18,8,0.1)" }} />
          ) : (
            <div className="text-[46px] font-black tracking-[-0.06em] leading-none mb-4" style={{ color: "#171208", fontVariantNumeric: "tabular-nums" }}>
              {latest.data?.tax_payable ?? "—"}{" "}
              <span className="text-[18px] font-semibold opacity-50">LKR</span>
            </div>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); router.push("/tax"); }}
            className="w-full py-3 bg-[#010001] text-white border-none rounded-full text-[13.5px] font-bold cursor-pointer hover:bg-[#1a1a1a] transition-colors"
          >
            View full breakdown →
          </button>
        </BentoTile>

        {/* Col 4, rows 1-2 — FI Score (dark navy, spans 2 rows) */}
        <BentoTile
          variant="dark"
          label="FI Score"
          value=""
          minHeight={0}
          className="justify-start lg:col-start-4 lg:row-span-2"
          icon={<IconBadge><Activity className="size-4 text-[#E8FC85]" /></IconBadge>}
          onClick={() => router.push("/financial-independence")}
        >
          {fiLoading ? (
            <Skeleton className="h-16 w-24 bg-white/10 mb-2" />
          ) : (
            <>
              <div className="flex items-baseline gap-[5px] mb-1">
                <span className="text-[60px] font-black tracking-[-0.06em] text-[#E8FC85] leading-none" style={{ fontVariantNumeric: "tabular-nums" }}>{fiScore}</span>
                <span className="text-[20px] font-semibold text-white/20">/100</span>
              </div>
              <div className="text-[13px] text-white/38 mb-5">{fiData?.grade} · Standard FIRE</div>
              <div className="h-[4px] bg-white/10 rounded-full overflow-hidden mb-5">
                <div className="h-full bg-[#E8FC85] rounded-full transition-[width] duration-500" style={{ width: `${fiScore}%` }} />
              </div>
            </>
          )}
          <div className="flex flex-col gap-[11px] flex-1">
            {fiComponents.slice(0, 5).map((c) => (
              <SubBar key={c.key} label={c.label} score={Math.round(Number(c.score))} color={Number(c.score) < 50 ? "#F59E0B" : "#E8FC85"} />
            ))}
          </div>
          <div className="text-[12px] text-[#E8FC85] font-bold mt-5">View FIRE strategy →</div>
        </BentoTile>

        {/* Row 2 col 1 — Expenses YTD */}
        <BentoTile
          variant="purple"
          label="Expenses YTD"
          sub="This assessment year"
          value={exp.main}
          suffix={exp.suffix || undefined}
          badge={loading ? undefined : "YTD"}
          loading={loading}
        />

        {/* Row 2 col 2 — Savings Rate */}
        <BentoTile
          variant="blueGrey"
          label="Savings Rate"
          sub="Monthly surplus"
          value={fiLoading ? "—" : savingsPct}
          suffix="%"
          badge={fiData && Number(fiData.savings_rate) >= 0.2 ? "↑ Target" : undefined}
          badgeVariant="green"
          watermark={<RingWatermark />}
          loading={fiLoading}
        />

        {/* Row 3 cols 1-2 — Recent Entries */}
        <CardContainer
          title="Recent Entries"
          titleRight={
            <Link href="/ledger" className="text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              All <ArrowRight className="size-3.5" />
            </Link>
          }
          className="sm:col-span-1 lg:col-span-2"
          padding={24}
        >
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
            </div>
          ) : recentEntries.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-[13px] font-medium">No transactions yet</p>
              <p className="text-[12px] text-muted-foreground">Upload a bank statement to get started</p>
              <button onClick={() => setUploadOpen(true)} className="text-[12px] font-semibold border border-border rounded-full px-4 py-1.5 hover:bg-muted transition-colors">
                Upload statement
              </button>
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
        </CardContainer>

        {/* Row 3 cols 3-4 — Deadlines */}
        <CardContainer
          title="Deadlines"
          titleRight={
            <Link href="/reminders" className="text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              All <ArrowRight className="size-3.5" />
            </Link>
          }
          className="sm:col-span-1 lg:col-span-2"
          padding={22}
        >
          {upcomingReminders.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-[13px] text-muted-foreground mb-3">No upcoming deadlines</p>
              <Link href="/reminders" className="text-[12px] font-semibold border border-border rounded-full px-4 py-1.5 hover:bg-muted transition-colors">
                Seed filing calendar
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {upcomingReminders.slice(0, 3).map((r) => {
                const isOverdue = r.status !== "done" && new Date(r.due_date) < new Date();
                const isDueSoon = !isOverdue && new Date(r.due_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                return (
                  <div
                    key={r.id}
                    className={`flex flex-col gap-1.5 p-3 rounded-[14px] ${
                      isOverdue ? "bg-[#FEE2E2] dark:bg-rose-400/15" : isDueSoon ? "bg-[#FEF3C7] dark:bg-amber-400/15" : "bg-muted"
                    }`}
                  >
                    <div>
                      <div className={`text-[13px] font-bold ${isOverdue ? "text-[#7F1D1D] dark:text-rose-300" : isDueSoon ? "text-[#78350F] dark:text-amber-300" : "text-foreground"}`}>
                        {r.kind}
                      </div>
                      <div className={`text-[11.5px] mt-[1px] ${isOverdue ? "text-[#B91C1C] dark:text-rose-300/80" : isDueSoon ? "text-[#B45309] dark:text-amber-300/80" : "text-muted-foreground"}`}>
                        {new Date(r.due_date).toLocaleDateString("en-LK", { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                    </div>
                    <DeadlineChip dueDate={r.due_date} done={r.status === "done"} />
                  </div>
                );
              })}
            </div>
          )}
        </CardContainer>

        {/* Row 4 — Scrooge CTA (dark, full width) */}
        <div className="col-span-full bg-[#010001] rounded-[20px] px-5 sm:px-7 py-[22px] flex flex-col sm:flex-row sm:items-center justify-between gap-5 sm:gap-6">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="w-11 h-11 bg-[#E8FC85] rounded-[14px] flex items-center justify-center shrink-0">
              <MessageCircle className="size-5 text-[#010001]" />
            </div>
            <div className="min-w-0">
              <div className="text-[15px] font-extrabold text-white tracking-[-0.02em]">Ask Scrooge anything about your money</div>
              <div className="text-[13px] text-white/35 mt-[3px]">Tax, projections, spending — from your real ledger. Never guesses.</div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 overflow-x-auto sm:overflow-visible -mx-1 px-1 sm:mx-0 sm:px-0">
            <button onClick={() => openScrooge()} className="px-4 py-2.5 bg-white/8 rounded-full text-[12.5px] font-semibold text-white/65 hover:bg-white/14 transition-colors whitespace-nowrap shrink-0">
              Tax payable?
            </button>
            <button onClick={() => openScrooge()} className="hidden sm:inline-flex px-4 py-2.5 bg-white/8 rounded-full text-[12.5px] font-semibold text-white/65 hover:bg-white/14 transition-colors whitespace-nowrap shrink-0">
              On track for FIRE?
            </button>
            <button onClick={() => openScrooge()} className="px-5 py-2.5 bg-[#E8FC85] text-[#010001] border-none rounded-full text-[13.5px] font-extrabold cursor-pointer hover:brightness-[0.94] transition-all whitespace-nowrap shrink-0">
              Start conversation →
            </button>
          </div>
        </div>

      </div>

      <StatementUploadModal open={uploadOpen} onOpenChange={setUploadOpen} />
    </PageShell>
  );
}
