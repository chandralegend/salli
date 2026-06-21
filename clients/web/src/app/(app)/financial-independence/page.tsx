"use client";

import { useState } from "react";
import Link from "next/link";
import {
  RefreshCw, Loader2, Sparkles, Target, Plus, Check, X, TrendingUp, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useFiScore, useRecomputeScore, useGoals, useCreateGoal, useDeleteGoal,
  useLatestAdvisory, useRunAdvisor, useApplyRecommendation, useDismissRecommendation,
  type Goal, type Recommendation,
} from "@/hooks/useFi";

function lkr(v: string | number, dp = 0): string {
  const n = typeof v === "string" ? Number(v) : v;
  if (!isFinite(n)) return "—";
  return n.toLocaleString("en-LK", { maximumFractionDigits: dp });
}
function pct(v: string | number, dp = 0): string {
  const n = (typeof v === "string" ? Number(v) : v) * 100;
  return `${n.toFixed(dp)}%`;
}

const GRADE_COLOR: Record<string, string> = {
  "FI-ready": "text-emerald-600",
  "Strong": "text-emerald-600",
  "On track": "text-primary",
  "Building": "text-amber-600",
  "Just starting": "text-rose-600",
};

// ── Score gauge (SVG ring) ──────────────────────────────────────────────────

function ScoreGauge({ score, grade }: { score: number; grade: string }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const filled = Math.max(0, Math.min(100, score)) / 100;
  return (
    <div className="relative w-[136px] h-[136px] shrink-0">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--border)" strokeWidth="10" />
        <circle
          cx="60" cy="60" r={r} fill="none" stroke="var(--primary)" strokeWidth="10"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - filled)}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-ledger text-[34px] leading-none">{score.toFixed(0)}</span>
        <span className={cn("text-[11px] font-semibold mt-1", GRADE_COLOR[grade] ?? "text-foreground")}>
          {grade}
        </span>
      </div>
    </div>
  );
}

function Figure({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-secondary-label">{label}</p>
      <p className="font-ledger text-[16px] mt-1">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Goals ────────────────────────────────────────────────────────────────────

function GoalRow({ goal, onDelete }: { goal: Goal; onDelete: () => void }) {
  return (
    <div className="group flex items-center gap-3 py-2.5">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] font-medium truncate">{goal.name}</p>
          <span className="font-ledger text-[12px] text-muted-foreground shrink-0">
            <span className="text-[0.8em] mr-0.5">LKR</span>{lkr(goal.current_amount)} / {lkr(goal.target_amount)}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mt-1.5">
          <div className="h-full rounded-full bg-primary transition-[width] duration-500"
               style={{ width: `${Math.round(goal.progress * 100)}%` }} />
        </div>
      </div>
      <button onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition">
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

function AddGoalDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateGoal();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("");
  const [date, setDate] = useState("");

  async function submit() {
    if (!name.trim() || !target) return;
    await create.mutateAsync({
      name, kind: "custom",
      target_amount: Number(target), current_amount: Number(current || 0),
      target_date: date || null, priority: 2,
    });
    onOpenChange(false);
    setName(""); setTarget(""); setCurrent(""); setDate("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[15px]">New goal</DialogTitle>
          <DialogDescription>Track progress toward something specific.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-[12px]">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. House down payment" className="h-9 text-[13px]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12px]">Target (LKR)</Label>
              <Input inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="5000000" className="h-9 text-[13px]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">Saved so far</Label>
              <Input inputMode="numeric" value={current} onChange={(e) => setCurrent(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0" className="h-9 text-[13px]" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px]">Target date (optional)</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 text-[13px]" />
          </div>
          <Button onClick={submit} disabled={create.isPending || !name.trim() || !target} className="w-full">
            {create.isPending && <Loader2 className="size-3.5 mr-2 animate-spin" />}Add goal
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Recommendations ──────────────────────────────────────────────────────────

const CAT_COLOR: Record<string, string> = {
  emergency_fund: "bg-blue-50 text-blue-700 border-blue-200",
  debt: "bg-rose-50 text-rose-700 border-rose-200",
  savings: "bg-emerald-50 text-emerald-700 border-emerald-200",
  investing: "bg-violet-50 text-violet-700 border-violet-200",
  spending: "bg-amber-50 text-amber-700 border-amber-200",
  tax: "bg-primary/10 text-primary border-primary/20",
  goal: "bg-muted text-muted-foreground border-border",
};

function RecCard({ rec, reportId }: { rec: Recommendation; reportId: string }) {
  const apply = useApplyRecommendation();
  const dismiss = useDismissRecommendation();
  const done = rec.status !== "pending";
  return (
    <div className={cn("rounded-xl border p-3.5", done ? "border-border/60 bg-muted/30" : "border-border bg-card")}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={cn("text-[10px] font-semibold uppercase tracking-wide rounded-full border px-2 py-0.5", CAT_COLOR[rec.category] ?? CAT_COLOR.goal)}>
            {rec.category.replace("_", " ")}
          </span>
          {rec.status === "applied" && <span className="text-[10px] text-emerald-600 font-medium">Applied</span>}
          {rec.status === "dismissed" && <span className="text-[10px] text-muted-foreground">Dismissed</span>}
        </div>
      </div>
      <p className="text-[13px] font-medium mt-2">{rec.title}</p>
      <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">{rec.rationale}</p>
      {!done && (
        <div className="flex items-center gap-2 mt-3">
          {rec.action_type === "reminder" && (
            <Button size="sm" className="h-7 text-[12px] gap-1"
              disabled={apply.isPending}
              onClick={() => apply.mutate({ reportId, recId: rec.id })}>
              <Check className="size-3" />
              {rec.action_params?.label ? "Create reminder" : "Mark done"}
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 text-[12px] gap-1 text-muted-foreground"
            disabled={dismiss.isPending}
            onClick={() => dismiss.mutate({ reportId, recId: rec.id })}>
            <X className="size-3" /> Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function FinancialIndependencePage() {
  const score = useFiScore();
  const recompute = useRecomputeScore();
  const goals = useGoals();
  const deleteGoal = useDeleteGoal();
  const advisory = useLatestAdvisory();
  const runAdvisor = useRunAdvisor();
  const [addOpen, setAddOpen] = useState(false);

  const s = score.data;

  async function handleRun() {
    try {
      await runAdvisor.mutateAsync();
      toast.success("Advisor updated your recommendations");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("402") || msg.toLowerCase().includes("quota")) {
        toast.error("You've used all your advisor runs this month — upgrade for more.");
      } else {
        toast.error("Couldn't run the advisor. Try again.");
      }
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-foreground">Financial Independence</h1>
          <p className="text-meta mt-1">Your path to financial freedom · FIRE methodology</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => recompute.mutate()} disabled={recompute.isPending} className="gap-1.5">
          {recompute.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          Recompute
        </Button>
      </div>

      {/* Score + figures */}
      <Card>
        <CardContent>
          {score.isLoading || !s ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
              <ScoreGauge score={Number(s.overall_score)} grade={s.grade} />
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 w-full">
                <Figure label="SAVINGS RATE" value={pct(s.savings_rate, 1)} sub={`LKR ${lkr(s.monthly_surplus)}/mo surplus`} />
                <Figure label="EMERGENCY FUND" value={`${Number(s.emergency_fund_months).toFixed(1)} mo`} sub="target 6 months" />
                <Figure label="NET WORTH" value={`LKR ${lkr(s.net_worth)}`} />
                <Figure label="FI NUMBER" value={`LKR ${lkr(s.fi_number)}`} sub="25× annual expenses" />
                <Figure label="PROGRESS TO FI" value={pct(s.progress_to_fi, 1)} />
                <Figure label="PROJECTED FI" value={s.projected_fi_date ? s.projected_fi_date.slice(0, 4) : "—"}
                  sub={s.projected_fi_date ? "at current pace" : "increase savings"} />
              </div>
            </div>
          )}
          {s && s.components.length > 0 && (
            <div className="mt-5 pt-4 border-t border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5">
              {s.components.map((c) => (
                <div key={c.key} className="flex items-center gap-3">
                  <span className="text-[12px] text-muted-foreground w-32 shrink-0">{c.label}</span>
                  <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary/70" style={{ width: `${Number(c.score)}%` }} />
                  </div>
                  <span className="font-ledger text-[11px] text-muted-foreground w-9 text-right">{Number(c.score).toFixed(0)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Goals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-[14px] flex items-center gap-2"><Target className="size-4 text-muted-foreground" /> Goals</CardTitle>
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-[12px]" onClick={() => setAddOpen(true)}>
              <Plus className="size-3.5" /> Add
            </Button>
          </CardHeader>
          <CardContent>
            {goals.isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (goals.data ?? []).length === 0 ? (
              <p className="text-[13px] text-muted-foreground py-6 text-center">
                No goals yet. Add one to track your progress.
              </p>
            ) : (
              <div className="divide-y divide-border/60">
                {goals.data!.map((g) => (
                  <GoalRow key={g.id} goal={g} onDelete={() => deleteGoal.mutate(g.id)} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Advisor */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-[14px] flex items-center gap-2"><Sparkles className="size-4 text-primary" /> Wealth Advisor</CardTitle>
            <Button size="sm" onClick={handleRun} disabled={runAdvisor.isPending} className="h-7 gap-1 text-[12px]">
              {runAdvisor.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <TrendingUp className="size-3.5" />}
              Run advisor
            </Button>
          </CardHeader>
          <CardContent>
            {advisory.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : !advisory.data?.id ? (
              <p className="text-[13px] text-muted-foreground py-6 text-center">
                Run the advisor to get personalised recommendations.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-[12px] text-foreground/80 leading-relaxed">{advisory.data.summary}</p>
                <div className="space-y-2">
                  {advisory.data.recommendations.map((r) => (
                    <RecCard key={r.id} rec={r} reportId={advisory.data!.id} />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-[11px] text-muted-foreground/60 text-center">
        Guidance is informational, not financial advice ·{" "}
        <Link href="/settings" className="hover:text-foreground">Manage plan</Link>
      </p>

      <AddGoalDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
