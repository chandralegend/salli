"use client";

import { useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  CalendarClock,
  ChevronDown,
  Landmark,
  Loader2,
  Lock,
  PiggyBank,
  Plus,
  RefreshCw,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { SectionLabel } from "@/components/shared/SectionLabel";
import { StatusChip } from "@/components/shared/StatusChip";
import { EmptyState } from "@/components/shared/EmptyState";
import { QuotaBanner } from "@/components/shared/QuotaBanner";
import { ProjectionChart } from "@/components/fi/ProjectionChart";
import { StrategySetup } from "@/components/fi/StrategySetup";
import {
  useApplyRecommendation,
  useCreateGoal,
  useDeleteGoal,
  useDismissRecommendation,
  useFiScore,
  useFireProjections,
  useFireStrategy,
  useGoals,
  useLatestAdvisory,
  useRecomputeScore,
  useRunAdvisor,
} from "@/hooks/useFi";
import { formatCompact, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

const BUCKET_RULES = ["bg-[var(--chart-3)]", "bg-[var(--chart-2)]", "bg-[var(--chart-1)]", "bg-[var(--chart-4)]", "bg-[var(--chart-5)]"];

function AddGoalDialog({
  open,
  onOpenChange,
  onSubmit,
  pending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (data: { name: string; target_amount: number; target_date?: string }) => void;
  pending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New goal</DialogTitle>
          <DialogDescription>Salli tracks progress from your ledger.</DialogDescription>
        </DialogHeader>
        {open && <GoalForm onSubmit={onSubmit} onCancel={() => onOpenChange(false)} pending={pending} />}
      </DialogContent>
    </Dialog>
  );
}

function GoalForm({
  onSubmit,
  onCancel,
  pending,
}: {
  onSubmit: (data: { name: string; target_amount: number; target_date?: string }) => void;
  onCancel: () => void;
  pending: boolean;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          name: name.trim(),
          target_amount: Number(amount) || 0,
          target_date: date || undefined,
        });
      }}
      className="space-y-4"
    >
      <div className="space-y-1.5">
        <Label htmlFor="goal-name">Goal</Label>
        <Input
          id="goal-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Emergency fund"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="goal-amount">Target (LKR)</Label>
          <Input
            id="goal-amount"
            type="number"
            inputMode="numeric"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1500000"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="goal-date">Target date (optional)</Label>
          <Input id="goal-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending || !name.trim()}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : "Add goal"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function FinancialIndependencePage() {
  const strategy = useFireStrategy();
  const score = useFiScore();
  const projections = useFireProjections();
  const goals = useGoals();
  const advisory = useLatestAdvisory();
  const recompute = useRecomputeScore();
  const runAdvisor = useRunAdvisor();
  const applyRec = useApplyRecommendation();
  const dismissRec = useDismissRecommendation();
  const createGoal = useCreateGoal();
  const deleteGoal = useDeleteGoal();

  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [rationaleOpen, setRationaleOpen] = useState(false);

  const s = strategy.data;
  const fi = score.data;
  const proj = projections.data;
  const report = advisory.data;

  const advisorQuotaHit =
    runAdvisor.error instanceof Error && runAdvisor.error.message.includes("quota_exceeded");

  if (strategy.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Financial Independence" subtitle="Loading…" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  // First run — no strategy yet (404 → null)
  if (!s) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Financial Independence"
          subtitle="Design a FIRE strategy from your real numbers"
        />
        <StrategySetup />
      </div>
    );
  }

  const fireStyle = s.fire_style[0].toUpperCase() + s.fire_style.slice(1);
  const yearsToFire =
    proj?.fire_year_base != null ? String(proj.fire_year_base) : fi?.projected_fi_date ?? "—";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Financial Independence"
        subtitle={`${fireStyle} FIRE · Strategy v${s.version} · SWR ${(s.swr * 100).toFixed(1)}%`}
        actions={
          <>
            <Button variant="outline" onClick={() => recompute.mutate()} disabled={recompute.isPending}>
              {recompute.isPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              Recompute
            </Button>
          </>
        }
      />

      {/* ── Overview ── */}
      <section>
        <SectionLabel className="mb-3">Overview</SectionLabel>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="FI Number"
            icon={Target}
            loading={score.isLoading}
            value={`LKR ${formatCompact(fi?.fi_number)}`}
            caption={`${(s.swr * 100).toFixed(1)}% safe withdrawal rate`}
          />
          <StatCard
            label="Net Worth"
            icon={Landmark}
            loading={score.isLoading}
            value={`LKR ${formatCompact(fi?.net_worth)}`}
            caption={fi ? `${Number(fi.progress_to_fi).toFixed(1)}% of FI number` : undefined}
          />
          <StatCard label="Years to FIRE" emphasis loading={projections.isLoading} icon={CalendarClock}>
            <p className="money text-[44px] font-semibold leading-none">{yearsToFire}</p>
            <p className="text-xs text-white/60 mt-1.5">base scenario · {(s.return_base * 100).toFixed(0)}% return</p>
          </StatCard>
          <StatCard
            label="Savings Rate"
            icon={PiggyBank}
            loading={score.isLoading}
            value={fi ? `${Number(fi.savings_rate).toFixed(1)}%` : "—"}
            badge={
              fi && Number(fi.savings_rate) >= 40 ? <StatusChip tone="success">above 40% target</StatusChip> : undefined
            }
            caption="monthly surplus ratio"
          />
        </div>
      </section>

      {/* ── Portfolio projection ── */}
      <section>
        <SectionLabel className="mb-3">Portfolio Projection</SectionLabel>
        <div className="grid lg:grid-cols-3 gap-4 items-start">
          <div className="lg:col-span-2 rounded-lg border bg-card p-5">
            <div className="mb-1">
              <h2 className="text-[15px] font-semibold">Portfolio Projection</h2>
              <p className="text-xs text-muted-foreground">Conservative · Base · Growth scenarios, 15 years</p>
            </div>
            {projections.isLoading ? (
              <Skeleton className="h-72 mt-3" />
            ) : proj && proj.points.length > 0 ? (
              <ProjectionChart
                points={proj.points}
                fiNumber={proj.fi_number}
                lockedScenarios={proj.scenario_access?.locked}
              />
            ) : (
              <EmptyState
                icon={TrendingUp}
                title="No projection yet"
                body="Post some entries so Salli has a portfolio to project."
              />
            )}
          </div>

          <StatCard label="FI Score" emphasis loading={score.isLoading} icon={Sparkles}>
            {fi && (
              <>
                <p className="money leading-none">
                  <span className="text-[44px] font-semibold">{Number(fi.overall_score).toFixed(0)}</span>
                  <span className="text-white/50 text-base">/100</span>
                </p>
                <p className="text-[13px] text-white/70">{fi.grade}</p>
                <div className="space-y-2.5 mt-2">
                  {fi.components.map((c) => (
                    <div key={c.key}>
                      <div className="flex justify-between text-xs text-white/60 mb-1">
                        <span>{c.label}</span>
                        <span className="money">{Number(c.score).toFixed(0)}</span>
                      </div>
                      <div className="h-1 rounded-full bg-white/15 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-white"
                          style={{ width: `${Math.min(100, Number(c.score))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </StatCard>
        </div>
      </section>

      {/* ── Allocation buckets + rationale ── */}
      <section>
        <SectionLabel className="mb-3">Allocation Buckets</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {s.buckets.map((b, i) => (
            <div key={b.key} className="rounded-lg border bg-card overflow-hidden">
              <div className={cn("h-1", BUCKET_RULES[i % BUCKET_RULES.length])} />
              <div className="p-4">
                <p className="text-sm font-semibold">{b.name}</p>
                <p className="money text-xl font-semibold mt-1">{b.target_pct}%</p>
                <p className="text-xs text-muted-foreground mt-1.5 leading-snug">{b.description}</p>
              </div>
            </div>
          ))}
        </div>

        <Collapsible open={rationaleOpen} onOpenChange={setRationaleOpen} className="mt-4">
          <div className="rounded-lg border bg-card">
            <CollapsibleTrigger
              render={
                <button
                  type="button"
                  className="flex w-full items-center gap-3 p-4 text-left hover:bg-accent/40 transition-colors rounded-lg"
                />
              }
            >
              <span className="text-sm font-semibold shrink-0">AI Strategy rationale</span>
              <span className="flex flex-wrap gap-1.5">
                {s.theories_applied ? (
                  s.theories_applied.slice(0, 4).map((t) => (
                    <StatusChip key={t} tone="neutral">
                      {t}
                    </StatusChip>
                  ))
                ) : (
                  <StatusChip tone="neutral">+{s.theories_applied_count ?? 0} theories</StatusChip>
                )}
              </span>
              <ChevronDown
                className={cn("size-4 ml-auto shrink-0 text-muted-foreground transition-transform", rationaleOpen && "rotate-180")}
              />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-4 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Conservative", v: s.return_conservative },
                    { label: "Base", v: s.return_base },
                    { label: "Growth", v: s.return_growth },
                  ].map((r) => (
                    <div key={r.label} className="rounded-md bg-muted/60 border p-3 text-center">
                      <p className="money text-lg font-semibold">{(r.v * 100).toFixed(0)}%</p>
                      <p className="text-xs text-muted-foreground">{r.label} return</p>
                    </div>
                  ))}
                </div>
                {s.rationale_locked ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground leading-relaxed">{s.rationale_preview}</p>
                    <div className="flex items-center gap-2 rounded-md bg-[var(--status-warning-bg)] px-3 py-2 text-[13px] text-[var(--status-warning-text)]">
                      <Lock className="size-4 shrink-0" />
                      <span>
                        Read the full AI rationale ·{" "}
                        <Link href="/settings?upgrade=plus" className="font-semibold underline underline-offset-2">
                          Upgrade to Plus
                        </Link>
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="prose-sm text-sm text-muted-foreground leading-relaxed [&_strong]:text-foreground [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{s.ai_rationale ?? ""}</ReactMarkdown>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      </section>

      {/* ── Goals & mentoring ── */}
      <section>
        <SectionLabel className="mb-3">Goals &amp; Mentoring</SectionLabel>
        <div className="grid lg:grid-cols-2 gap-4 items-start">
          <div className="rounded-lg border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[15px] font-semibold">Goals</h2>
              <Button variant="outline" size="sm" onClick={() => setGoalDialogOpen(true)}>
                <Plus className="size-3.5" /> Add goal
              </Button>
            </div>
            {goals.isLoading ? (
              <Skeleton className="h-24" />
            ) : !goals.data || goals.data.length === 0 ? (
              <EmptyState
                icon={Target}
                title="No goals yet"
                body="Set one and Salli tracks it from your ledger."
              />
            ) : (
              <div className="space-y-4">
                {goals.data.map((g) => {
                  const pct = Math.min(100, Math.round((g.progress ?? 0) * 100) / 1);
                  return (
                    <div key={g.id} className="group">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-sm font-medium">{g.name}</p>
                        <button
                          type="button"
                          aria-label={`Delete ${g.name}`}
                          onClick={() => deleteGoal.mutate(g.id)}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-foreground" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="money text-xs text-muted-foreground mt-1.5">
                        LKR {formatMoney(g.current_amount, 0)} / {formatMoney(g.target_amount, 0)} · {pct}%
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-lg bg-primary text-white p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[15px] font-semibold">FI Mentor</h2>
              <button
                type="button"
                onClick={() => runAdvisor.mutate()}
                disabled={runAdvisor.isPending}
                className="rounded-full bg-white/10 hover:bg-white/20 px-3 py-1.5 text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {runAdvisor.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                Run advisor
              </button>
            </div>
            {advisorQuotaHit && (
              <div className="mb-3">
                <QuotaBanner metric="advisor_runs" />
              </div>
            )}
            {!report || !report.recommendations ? (
              <p className="text-[13px] text-white/60 py-6 text-center">
                Run the advisor for a personalized assessment and next moves.
              </p>
            ) : (
              <div className="space-y-3">
                {(report.fire_tier_assessment || report.summary) && (
                  <p className="text-[13px] text-white/80 leading-relaxed">
                    {report.fire_tier_assessment || report.summary}
                  </p>
                )}
                {report.recommendations.map((r) =>
                  r.locked ? (
                    <div key={r.id} className="rounded-md bg-white/[0.04] p-3.5 opacity-70">
                      <div className="flex items-center gap-1.5">
                        <Lock className="size-3 text-white/40 shrink-0" />
                        <p className="text-[13px] font-semibold text-white/70">{r.title}</p>
                      </div>
                      <p className="text-[11px] text-white/40 mt-0.5">
                        Priority {r.priority} · {r.category}
                      </p>
                    </div>
                  ) : r.status === "pending" ? (
                    <div key={r.id} className="rounded-md bg-white/[0.08] p-3.5">
                      <p className="text-[13px] font-semibold">{r.title}</p>
                      <p className="text-[11px] text-white/50 mt-0.5">
                        Priority {r.priority}
                        {r.bucket_key ? ` · ${r.bucket_key.replaceAll("_", " ")}` : ""}
                      </p>
                      <p className="text-[12px] text-white/70 mt-1.5 leading-relaxed">{r.rationale}</p>
                      <div className="flex gap-3 mt-2.5">
                        <button
                          type="button"
                          onClick={() => applyRec.mutate({ reportId: report.id, recId: r.id })}
                          className="text-[12px] font-semibold text-[var(--status-success-text)] hover:underline"
                        >
                          {r.action_type === "reminder" ? "Create reminder" : "Apply"}
                        </button>
                        <button
                          type="button"
                          onClick={() => dismissRec.mutate({ reportId: report.id, recId: r.id })}
                          className="text-[12px] text-white/50 hover:text-white"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  ) : null
                )}
                {report.recommendations_locked_count > 0 && (
                  <Link
                    href="/settings?upgrade=plus"
                    className="block text-[12px] font-semibold text-white underline underline-offset-2"
                  >
                    Unlock {report.recommendations_locked_count} more recommendation
                    {report.recommendations_locked_count > 1 ? "s" : ""} →
                  </Link>
                )}
                {report.recommendations.filter((r) => !r.locked).every((r) => r.status !== "pending") && (
                  <p className="text-[13px] text-white/60">All recommendations handled. Run again anytime.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <AddGoalDialog
        open={goalDialogOpen}
        onOpenChange={setGoalDialogOpen}
        pending={createGoal.isPending}
        onSubmit={(data) => createGoal.mutate(data, { onSuccess: () => setGoalDialogOpen(false) })}
      />
    </div>
  );
}
