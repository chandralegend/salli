"use client";

import { useState, useCallback } from "react";
import { Loader2, Trash2, Sparkles, Check, X, Clock, BadgeCheck, Plus } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  useFiScore,
  useRecomputeScore,
  useGoals,
  useCreateGoal,
  useDeleteGoal,
  useLatestAdvisory,
  useRunAdvisor,
  useApplyRecommendation,
  useDismissRecommendation,
  useFireStrategy,
  useFireProjections,
  useFireSurplus,
  type Goal,
  type Recommendation,
} from "@/hooks/useFi";
import { ProjectionChart } from "@/components/fi/ProjectionChart";
import { AllocationBuckets } from "@/components/fi/AllocationBuckets";
import { StrategySetup } from "@/components/fi/StrategySetup";
import { SectionTitle } from "@/components/ui/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// ── Formatters ────────────────────────────────────────────────────────────────

function lkr(v: string | number): string {
  const n = typeof v === "string" ? Number(v) : v;
  if (!isFinite(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  return n.toLocaleString("en-LK", { maximumFractionDigits: 0 });
}

function pct(v: string | number, dp = 1): string {
  const n = (typeof v === "string" ? Number(v) : v) * 100;
  return `${n.toFixed(dp)}%`;
}

// ── Stat tile ─────────────────────────────────────────────────────────────────

function StatTile({
  bg, label, sub, value, badge, badgeStyle,
}: {
  bg: string; label: string; sub?: string; value: string;
  badge?: string; badgeStyle?: React.CSSProperties;
}) {
  const dark = bg === "#010001";
  const adaptive = bg.startsWith("var(");
  const labelColor = dark ? "rgba(255,255,255,0.3)" : adaptive ? "var(--muted-foreground)" : "rgba(0,0,0,0.45)";
  const subColor = dark ? "rgba(255,255,255,0.28)" : adaptive ? "var(--muted-foreground)" : "rgba(0,0,0,0.35)";
  const valueColor = dark ? "#E8FC85" : adaptive ? "var(--foreground)" : "#010001";

  return (
    <div style={{
      background: bg, borderRadius: 20, padding: 22, minHeight: 160,
      display: "flex", flexDirection: "column", justifyContent: "space-between",
    }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: labelColor }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: subColor, marginTop: 3 }}>{sub}</div>}
      </div>
      <div>
        <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: "-0.05em", color: valueColor, lineHeight: 1, marginBottom: 5 }}>
          {value}
        </div>
        {badge && (
          <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 999, ...badgeStyle }}>
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Goal row ──────────────────────────────────────────────────────────────────

function GoalRow({ goal, onDelete }: { goal: Goal; onDelete: () => void }) {
  const progress = Math.round(goal.progress * 100);
  return (
    <div className="rounded-[14px] bg-muted p-3.5">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
        <span className="text-[13px] font-bold text-foreground">{goal.name}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {goal.target_date && <span className="text-[12px] text-muted-foreground">{goal.target_date.slice(0, 4)}</span>}
          <button
            onClick={onDelete}
            className="opacity-40 hover:opacity-100 transition-opacity text-destructive"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
      <div className="h-[3px] rounded-full bg-border overflow-hidden mb-1.5">
        <div style={{ width: `${progress}%`, height: "100%", background: "#E8FC85", borderRadius: 999 }} />
      </div>
      <div className="text-[11.5px] text-muted-foreground">
        LKR {lkr(goal.current_amount)} / {lkr(goal.target_amount)}
      </div>
    </div>
  );
}

// ── Add goal dialog ────────────────────────────────────────────────────────────

function AddGoalDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateGoal();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("");
  const [date, setDate] = useState("");

  async function submit() {
    if (!name.trim() || !target) return;
    await create.mutateAsync({ name, kind: "custom", target_amount: Number(target), current_amount: Number(current || 0), target_date: date || null, priority: 2 });
    onOpenChange(false);
    setName(""); setTarget(""); setCurrent(""); setDate("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New goal</DialogTitle>
          <DialogDescription>Track progress toward a financial milestone.</DialogDescription>
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

// ── Rec item ──────────────────────────────────────────────────────────────────

const PRIO_STYLE: Record<number, { color: string; bg: string }> = {
  1: { color: "#DC2626", bg: "rgba(220,38,38,0.2)" },
  2: { color: "#D97706", bg: "rgba(217,119,6,0.2)" },
  3: { color: "#7DA6A9", bg: "rgba(125,166,169,0.2)" },
};

function RecItem({ rec, reportId }: { rec: Recommendation; reportId: string }) {
  const apply = useApplyRecommendation();
  const dismiss = useDismissRecommendation();
  const prio = PRIO_STYLE[rec.priority] ?? PRIO_STYLE[3];
  const done = rec.status !== "pending";

  return (
    <div style={{ padding: "11px 13px", background: "rgba(255,255,255,0.05)", borderRadius: 12, opacity: done ? 0.5 : 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 10, fontWeight: 900, color: prio.color, background: prio.bg, padding: "1px 7px", borderRadius: 5 }}>
          P{rec.priority}
        </span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: "#fff" }}>{rec.title}</span>
      </div>
      <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.38)", lineHeight: 1.5 }}>{rec.rationale}</div>
      {!done && (
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          {rec.action_type === "reminder" && (
            <button
              onClick={() => apply.mutate({ reportId, recId: rec.id })}
              disabled={apply.isPending}
              style={{ fontSize: 11, color: "#E8FC85", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}
            >
              <Check className="inline size-3 mr-1" />Create reminder
            </button>
          )}
          <button
            onClick={() => dismiss.mutate({ reportId, recId: rec.id })}
            disabled={dismiss.isPending}
            style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit" }}
          >
            <X className="inline size-3 mr-1" />Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FinancialIndependencePage() {
  const qc = useQueryClient();
  const score = useFiScore();
  const recompute = useRecomputeScore();
  const goals = useGoals();
  const deleteGoal = useDeleteGoal();
  const advisory = useLatestAdvisory();
  const runAdvisor = useRunAdvisor();
  const strategy = useFireStrategy();
  const projections = useFireProjections();
  const surplus = useFireSurplus();

  const [addOpen, setAddOpen] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [strategyOpen, setStrategyOpen] = useState(false);

  const s = score.data;
  const strat = strategy.data;
  const proj = projections.data;
  const surplusData = surplus.data;
  const hasStrategy = !!strat;

  const handleStrategyComplete = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["fi", "strategy"] });
    qc.invalidateQueries({ queryKey: ["fi", "projections"] });
    qc.invalidateQueries({ queryKey: ["fi", "surplus"] });
    setShowSetup(false);
    toast.success("Your FIRE strategy has been updated!");
  }, [qc]);

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

  // ── Setup / Refresh flow ────────────────────────────────────────────────────

  if ((!hasStrategy && !strategy.isLoading) || showSetup) {
    return (
      <div className="p-8 max-w-[1320px] mx-auto">
        {showSetup && (
          <button
            onClick={() => setShowSetup(false)}
            className="text-[13px] text-muted-foreground hover:text-foreground transition mb-5 block"
          >
            ← Back
          </button>
        )}
        <StrategySetup isRefresh={hasStrategy} onComplete={handleStrategyComplete} />
      </div>
    );
  }

  // ── Active dashboard ────────────────────────────────────────────────────────

  const fiNumber = proj?.fi_number ?? s?.fi_number;
  const netWorth = s?.net_worth ?? "0";
  const progressToFi = proj?.fi_number
    ? Number(netWorth) / Number(proj.fi_number)
    : Number(s?.progress_to_fi ?? 0);
  const yearsToFire = proj?.fire_year_base;
  const savingsRate = surplusData
    ? Number(surplusData.savings_rate) * 100
    : Number(s?.savings_rate ?? 0) * 100;

  const stratDate = strat
    ? new Date(strat.created_at).toLocaleDateString("en-LK", { month: "short", day: "numeric", year: "numeric" })
    : "";

  return (
    <div className="p-8 max-w-[1320px] mx-auto">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 40, fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 1.1, color: "var(--foreground)" }}>
            Financial Independence
          </h1>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 8, fontWeight: 500 }}>
            {strat
              ? `${strat.fire_style.charAt(0).toUpperCase() + strat.fire_style.slice(1)} FIRE · Strategy v${strat.version} · ${stratDate} · SWR ${(strat.swr * 100).toFixed(1)}%`
              : "FIRE planning · Sri Lanka · LKR"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => recompute.mutate()}
            disabled={recompute.isPending}
            className="text-foreground border-border bg-card hover:bg-muted transition-colors"
            style={{ padding: "10px 20px", border: "1.5px solid", borderRadius: 999, fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
          >
            {recompute.isPending ? <Loader2 className="inline size-3.5 mr-1 animate-spin" /> : null}
            Recompute
          </button>
          <button
            onClick={() => setShowSetup(true)}
            style={{ padding: "10px 20px", background: "#010001", color: "#fff", border: "none", borderRadius: 999, fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
          >
            ↺ Refresh Strategy
          </button>
        </div>
      </div>

      {/* BENTO GRID */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>

        {/* ── Section: Overview ───────────────────────────────────────────── */}
        <SectionTitle>Overview</SectionTitle>

        {/* Row 1 — 4 stat tiles */}
        <StatTile
          bg="var(--card)"
          label="FI Number"
          sub={strat ? `${(strat.swr * 100).toFixed(1)}% safe withdrawal rate` : "25× annual expenses"}
          value={fiNumber ? lkr(fiNumber) : "—"}
        />
        <StatTile
          bg="#A5FFB9"
          label="Net Worth"
          sub={`${(progressToFi * 100).toFixed(1)}% of FI number`}
          value={lkr(netWorth)}
          badge={s ? `+${pct(s.savings_rate, 1)}` : undefined}
          badgeStyle={{ background: "rgba(0,0,0,0.1)", color: "#010001" }}
        />
        {/* Years to FIRE — dark tile */}
        <div style={{
          background: "#010001", borderRadius: 20, padding: 22, minHeight: 160,
          display: "flex", flexDirection: "column", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>Years to FIRE</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.28)", marginTop: 3 }}>
              Base scenario · {strat ? `${(strat.return_base * 100).toFixed(0)}% return` : "9% return"}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 52, fontWeight: 900, letterSpacing: "-0.06em", color: "#E8FC85", lineHeight: 1, marginBottom: 5 }}>
              {yearsToFire ?? "—"}
            </div>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>years remaining</span>
          </div>
        </div>
        <StatTile
          bg="#D5E9EA"
          label="Savings Rate"
          sub="Monthly surplus ratio"
          value={`${savingsRate.toFixed(1)}`}
          badge={savingsRate >= 40 ? "↑ above 40% target" : savingsRate >= 20 ? "→ building" : "↓ below target"}
          badgeStyle={{
            background: savingsRate >= 40 ? "#DCFCE7" : savingsRate >= 20 ? "#FEF3C7" : "#FEE2E2",
            color: savingsRate >= 40 ? "#16A34A" : savingsRate >= 20 ? "#D97706" : "#DC2626",
            fontWeight: 800,
          }}
        />

        {/* ── Section: Projection ─────────────────────────────────────────── */}
        <SectionTitle>Portfolio Projection</SectionTitle>

        {/* Row 2 — Chart (col 1-3) + FI Score (col 4) */}
        <div style={{ gridColumn: "1/4", background: "var(--card)", borderRadius: 20, padding: 26, minHeight: 320, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--foreground)" }}>Portfolio Projection</div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 3 }}>Conservative · Base · Growth scenarios</div>
            </div>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 16, height: 2, background: "#CBD5E1", borderRadius: 2 }} />
                <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Conservative</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 16, height: 2.5, background: "#010001", borderRadius: 2 }} />
                <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Base</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 16, height: 2, background: "#F59E0B", borderRadius: 2 }} />
                <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Growth</span>
              </div>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            {projections.isLoading || !proj ? (
              <div className="h-48 bg-muted rounded-xl animate-pulse" />
            ) : (
              <ProjectionChart data={proj} />
            )}
          </div>
        </div>

        {/* FI Score tile */}
        <div style={{ background: "#010001", borderRadius: 20, padding: 24, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 14 }}>FI Score</div>
          {score.isLoading || !s ? (
            <div className="flex-1 bg-white/5 rounded-xl animate-pulse" />
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginBottom: 4 }}>
                <span style={{ fontSize: 52, fontWeight: 900, letterSpacing: "-0.06em", color: "#E8FC85", lineHeight: 1 }}>
                  {Number(s.overall_score).toFixed(0)}
                </span>
                <span style={{ fontSize: 17, fontWeight: 600, color: "rgba(255,255,255,0.2)" }}>/100</span>
              </div>
              <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.38)", marginBottom: 18 }}>
                {s.grade} · {strat?.fire_style ?? "Standard"} FIRE
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                {s.components.slice(0, 5).map((c) => {
                  const v = Number(c.score);
                  const amber = v < 50;
                  return (
                    <div key={c.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", whiteSpace: "nowrap" }}>{c.label}</span>
                      <div style={{ flex: 1, height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 999, overflow: "hidden" }}>
                        <div style={{ width: `${v}%`, height: "100%", background: amber ? "#F59E0B" : "#E8FC85", borderRadius: 999 }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: amber ? "#F59E0B" : "rgba(255,255,255,0.5)", width: 20, textAlign: "right" }}>
                        {v.toFixed(0)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* ── Section: Allocation ─────────────────────────────────────────── */}
        <SectionTitle>Allocation Buckets</SectionTitle>

        {/* Row 3 — Allocation Buckets full width */}
        <div style={{ gridColumn: "1/5" }}>
          {strategy.isLoading ? (
            <div className="h-36 bg-muted rounded-xl animate-pulse" />
          ) : (
            <AllocationBuckets buckets={strat?.buckets ?? []} surplus={surplusData} />
          )}
        </div>

        {/* ── Section: Strategy ───────────────────────────────────────────── */}
        <SectionTitle>AI Strategy</SectionTitle>

        {/* Row 4 — AI Strategy full width */}
        <div style={{ gridColumn: "1/5", background: "var(--card)", borderRadius: 20, overflow: "hidden" }}>
          <div
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", cursor: "pointer" }}
            onClick={() => setStrategyOpen((p) => !p)}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: "var(--foreground)" }}>AI Strategy</span>
                {strat && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#7DA6A9", background: "#D5E9EA", padding: "2px 9px", borderRadius: 999 }}>
                    {strat.fire_style.charAt(0).toUpperCase() + strat.fire_style.slice(1)} FIRE
                  </span>
                )}
                {strat && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", background: "var(--muted)", padding: "2px 9px", borderRadius: 999 }}>
                    v{strat.version}
                  </span>
                )}
              </div>
              {strat && (
                <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                  {stratDate} · SWR {(strat.swr * 100).toFixed(1)}%{strat.target_age ? ` · Target age ${strat.target_age}` : ""}
                </div>
              )}
            </div>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.5"
              style={{ transform: strategyOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>
              <polyline points="4 6 8 10 12 6" />
            </svg>
          </div>

          {strategyOpen && strat && (
            <div style={{ padding: "0 24px 24px", borderTop: "1px solid var(--border)" }}>
              <p style={{ fontSize: 13.5, color: "var(--foreground)", lineHeight: 1.75, marginTop: 16, marginBottom: 14, opacity: 0.85 }}>
                {strat.ai_rationale?.split(".").slice(0, 3).join(".") + "."}
              </p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
                {strat.theories_applied.map((t) => (
                  <span key={t} style={{ fontSize: 11.5, fontWeight: 700, color: "var(--foreground)", background: "var(--muted)", padding: "4px 11px", borderRadius: 999 }}>
                    {t}
                  </span>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div style={{ padding: 14, background: "#A5FFB9", borderRadius: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(0,0,0,0.4)", marginBottom: 6 }}>Conservative</div>
                  <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.04em", color: "#010001" }}>{(strat.return_conservative * 100).toFixed(1)}%</div>
                </div>
                <div style={{ padding: 14, background: "#E8FC85", borderRadius: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(0,0,0,0.4)", marginBottom: 6 }}>Base</div>
                  <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.04em", color: "#010001" }}>{(strat.return_base * 100).toFixed(1)}%</div>
                </div>
                <div style={{ padding: 14, background: "#010001", borderRadius: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(255,255,255,0.35)", marginBottom: 6 }}>Growth</div>
                  <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.04em", color: "#E8FC85" }}>{(strat.return_growth * 100).toFixed(1)}%</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Section: Goals & Mentoring ──────────────────────────────────── */}
        <SectionTitle>Goals & Mentoring</SectionTitle>

        {/* Row 5 — Goals (col-span-2) + FI Mentor (col-span-2) */}

        {/* Goals */}
        <div style={{ gridColumn: "span 2", background: "var(--card)", borderRadius: 20, padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--foreground)" }}>Goals</div>
            <button
              onClick={() => setAddOpen(true)}
              className="text-foreground border-border hover:bg-muted transition-colors"
              style={{ padding: "7px 14px", border: "1.5px solid", borderRadius: 999, background: "transparent", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
            >
              + Add
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {goals.isLoading ? (
              <div className="h-20 bg-muted rounded-xl animate-pulse" />
            ) : (goals.data ?? []).length === 0 ? (
              <p className="text-[13px] text-muted-foreground text-center py-4">No goals yet.</p>
            ) : (
              goals.data!.map((g) => (
                <GoalRow key={g.id} goal={g} onDelete={() => deleteGoal.mutate(g.id)} />
              ))
            )}
          </div>
        </div>

        {/* FI Mentor */}
        <div style={{ gridColumn: "span 2", background: "#010001", borderRadius: 20, padding: 26, minHeight: 240, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>FI Mentor</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {advisory.data?.created_at && (
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                  <Clock className="size-3" />
                  {new Date(advisory.data.created_at).toLocaleDateString("en-LK", { month: "short", day: "numeric" })}
                </span>
              )}
              <button
                onClick={handleRun}
                disabled={runAdvisor.isPending}
                style={{ padding: "6px 12px", background: "rgba(255,255,255,0.1)", color: "#E8FC85", border: "none", borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
              >
                {runAdvisor.isPending ? <Loader2 className="inline size-3 mr-1 animate-spin" /> : <Sparkles className="inline size-3 mr-1" />}
                {runAdvisor.isPending ? "Running…" : "Run"}
              </button>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
            {advisory.isLoading ? (
              <div className="h-20 bg-white/5 rounded-xl animate-pulse" />
            ) : !advisory.data?.id ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", textAlign: "center", lineHeight: 1.6, maxWidth: 280 }}>
                  {strat
                    ? `Your FI Mentor has access to your ${strat.fire_style.toUpperCase()} strategy. Click Run for personalised guidance.`
                    : "Generate your FIRE strategy first, then run a mentoring session."}
                </p>
              </div>
            ) : (
              <>
                {advisory.data.fire_tier_assessment && (
                  <div style={{ padding: "10px 13px", background: "rgba(232,252,133,0.1)", borderRadius: 12, marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <BadgeCheck className="size-3.5 text-[#E8FC85] shrink-0" />
                      <span style={{ fontSize: 12, color: "#E8FC85", fontWeight: 600, lineHeight: 1.4 }}>
                        {advisory.data.fire_tier_assessment}
                      </span>
                    </div>
                  </div>
                )}
                {advisory.data.recommendations
                  .slice()
                  .sort((a, b) => a.priority - b.priority)
                  .slice(0, 4)
                  .map((r) => (
                    <RecItem key={r.id} rec={r} reportId={advisory.data!.id} />
                  ))}
              </>
            )}
          </div>
        </div>

      </div>

      <p className="text-[11px] text-muted-foreground/60 text-center mt-4">
        Guidance is informational, not financial advice.
      </p>

      <AddGoalDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
