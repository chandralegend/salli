import { Check, Info, Sparkles, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { PillButton } from "@/components/ui/pill-button";
import { StatTile } from "@/components/ui/stat-tile";
import {
  useFiGoalMutations,
  useFiGoals,
  useFiProjections,
  useFiScore,
  useFiStrategy,
  useGenerateStrategy,
  useLatestAdvisorReport,
  useRunAdvisor,
} from "@/hooks/useFi";
import { useBalanceSheet } from "@/hooks/useReports";
import { formatLKRAbbrev, formatPct } from "@/lib/format";
import { useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

const TABS = ["Overview", "Strategy", "Goals"] as const;

function ProgressBar({ pct }: { pct: number }) {
  return (
    <View className="h-1.5 overflow-hidden rounded-pill bg-foreground/10">
      <View className="h-full rounded-pill bg-salli-accent" style={{ width: `${Math.min(100, Math.max(0, pct * 100))}%` }} />
    </View>
  );
}

/** Conic-style progress ring (mockup's FI Score badge): a thin accent arc that
 * fills to `score`%, with the integer score centered in the hole. */
function ScoreRing({ score }: { score: number }) {
  const size = 48;
  const sw = 6;
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score)) / 100;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.07)" strokeWidth={sw} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#2563EB"
          strokeWidth={sw}
          fill="none"
          strokeDasharray={`${c * pct} ${c}`}
          strokeLinecap="round"
        />
      </Svg>
      <Text className="font-sans-bold text-[14px] text-foreground">{score.toFixed(0)}</Text>
    </View>
  );
}

type MilestoneStatus = "completed" | "current" | "upcoming";
type Milestone = { label: string; subtitle: string; status: MilestoneStatus };

/** One milestone row: status circle (filled check / ring+dot / faint) + text. */
function MilestoneRow({ milestone }: { milestone: Milestone }) {
  const { status, label, subtitle } = milestone;
  return (
    <View className="flex-row items-start gap-3">
      {status === "completed" ? (
        <View className="mt-0.5 h-[22px] w-[22px] items-center justify-center rounded-full bg-salli-accent">
          <Check size={9} color="#FFFFFF" strokeWidth={3} />
        </View>
      ) : status === "current" ? (
        <View className="mt-0.5 h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-salli-accent">
          <View className="h-[7px] w-[7px] rounded-full bg-salli-accent" />
        </View>
      ) : (
        <View className="mt-0.5 h-[22px] w-[22px] rounded-full border-[1.5px] border-foreground/10" />
      )}
      <View className="flex-1">
        <Text
          className={cn(
            "font-sans-medium text-[13px]",
            status === "completed"
              ? "text-foreground/50 line-through"
              : status === "current"
                ? "text-foreground"
                : "text-foreground/35",
          )}
        >
          {label}
        </Text>
        <Text
          className={cn(
            "mt-0.5 text-[11px]",
            status === "current" ? "text-salli-accent" : "text-foreground/25",
          )}
        >
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

export default function FinancialIndependenceScreen() {
  const colors = useThemeColors();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");

  const fiScore = useFiScore();
  const projections = useFiProjections();
  const strategy = useFiStrategy();
  const generateStrategy = useGenerateStrategy();
  const goals = useFiGoals();
  const { deleteGoal } = useFiGoalMutations();
  const advisorReport = useLatestAdvisorReport();
  const runAdvisor = useRunAdvisor();
  const balanceSheet = useBalanceSheet();

  // `fire_year_base` may be a calendar year (e.g. 2044) or a years-from-now count
  // depending on the engine; normalize both into a years count + a freedom year,
  // and never render a null/negative value.
  const nowYear = new Date().getFullYear();
  const fireBaseRaw = Number(projections.data?.fire_year_base ?? 0);
  const yearsToFi = fireBaseRaw > 1900 ? Math.max(0, fireBaseRaw - nowYear) : Math.max(0, fireBaseRaw);
  const freedomYear = nowYear + Math.round(yearsToFi);
  const targetAge = strategy.data?.target_age ?? null;

  // Milestones (mockup's TIER 3) — synthesized from real figures: emergency-fund
  // coverage, outstanding liabilities, and net-worth progress. The first
  // not-yet-met milestone is marked "current"; the rest "upcoming".
  const monthlyExp = Number(fiScore.data?.monthly_expenses ?? 0);
  const netWorthNum = Number(fiScore.data?.net_worth ?? 0);
  const efMonths = Number(fiScore.data?.emergency_fund_months ?? 0);
  const efCurrent = efMonths * monthlyExp;
  const liabilities = balanceSheet.data ? Number(balanceSheet.data.total_liabilities) : 0;
  const rawMilestones: { label: string; done: boolean; subtitle: (s: MilestoneStatus) => string }[] = [
    {
      label: "3-month Emergency Fund",
      done: efMonths >= 3,
      subtitle: (s) =>
        s === "completed"
          ? `Rs. ${formatLKRAbbrev(monthlyExp * 3)} · Completed`
          : `Rs. ${formatLKRAbbrev(Math.min(efCurrent, monthlyExp * 3))} of Rs. ${formatLKRAbbrev(monthlyExp * 3)}`,
    },
    {
      label: "6-month Emergency Fund",
      done: efMonths >= 6,
      subtitle: (s) =>
        s === "completed"
          ? `Rs. ${formatLKRAbbrev(monthlyExp * 6)} · Completed`
          : `Rs. ${formatLKRAbbrev(Math.min(efCurrent, monthlyExp * 6))} of Rs. ${formatLKRAbbrev(monthlyExp * 6)}${s === "current" ? " · In progress" : ""}`,
    },
    {
      label: "Debt-free",
      done: liabilities <= 0,
      subtitle: () => (liabilities > 0 ? `Rs. ${formatLKRAbbrev(liabilities)} outstanding` : "No liabilities"),
    },
    {
      label: "Rs. 1 Cr Net Worth",
      done: netWorthNum >= 1e7,
      subtitle: () => `Rs. ${formatLKRAbbrev(netWorthNum)} · ${Math.round((netWorthNum / 1e7) * 100)}% funded`,
    },
  ];
  const firstPendingIdx = rawMilestones.findIndex((m) => !m.done);
  const milestones: Milestone[] = rawMilestones.map((m, i) => {
    const status: MilestoneStatus = m.done ? "completed" : i === firstPendingIdx ? "current" : "upcoming";
    return { label: m.label, status, subtitle: m.subtitle(status) };
  });

  return (
    <PageShell>
      <View className="flex-row items-center px-5 pb-1 pt-2.5">
        <Text className="flex-1 font-sans-bold text-[20px] text-foreground">Financial Independence</Text>
        <Info size={18} color={colors.mutedForeground} strokeWidth={2} />
      </View>

      <View className="mx-4 mt-3 flex-row border-b border-foreground/[0.08]">
        {TABS.map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} className={cn("px-3.5 py-2", tab === t && "border-b-2 border-salli-accent")}>
            <Text className={cn("text-[13px]", tab === t ? "font-sans-semibold text-foreground" : "font-sans-medium text-foreground/35")}>
              {t}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === "Overview" && fiScore.isLoading ? (
        <View className="items-center pt-16">
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : null}

      {tab === "Overview" && !fiScore.isLoading ? (
        <View className="gap-2.5 px-4 pt-3">
          {/* TIER 1 — Freedom Number (navy hero card) */}
          <View className="rounded-card border border-foreground/[0.08] bg-salli-navy-card p-[18px]">
            <View className="mb-2 flex-row items-center gap-1.5">
              <Text className="text-[11px] font-sans-semibold uppercase tracking-wide text-white/50">
                Freedom Number
              </Text>
              <Info size={13} color="rgba(255,255,255,0.3)" strokeWidth={2} />
            </View>
            <View className="mb-2.5 rounded-[8px] border border-white/10 bg-white/[0.06] px-2.5 py-1.5">
              <Text className="text-[11px] leading-4 text-white/45">
                The savings target where investment returns cover your lifestyle — permanently.
              </Text>
            </View>
            <View className="mb-1.5 flex-row items-baseline gap-1">
              <Text className="font-sans-bold text-[22px] text-white/45">Rs.</Text>
              <Text className="font-sans-extrabold text-[42px] leading-[42px] tracking-tighter text-white">
                {projections.data ? formatLKRAbbrev(projections.data.fi_number) : "—"}
              </Text>
            </View>
            <View className="mb-3.5 flex-row items-center gap-1.5">
              <Text className="text-[11px] text-white/30">4% SWR</Text>
              {targetAge ? (
                <>
                  <Text className="text-[11px] text-white/15">·</Text>
                  <Text className="text-[11px] text-white/30">Target age {targetAge}</Text>
                </>
              ) : null}
            </View>
            <View className="flex-row gap-1.5">
              <View className="flex-1 rounded-[10px] bg-white/[0.06] px-2.5 py-2">
                <Text className="mb-1 text-[10px] text-white/30">Funded</Text>
                <Text className="font-sans-bold text-[15px] leading-[15px] text-salli-accent">
                  {fiScore.data ? formatPct(fiScore.data.progress_to_fi) : "—"}
                </Text>
              </View>
              <View className="flex-1 rounded-[10px] bg-white/[0.06] px-2.5 py-2">
                <Text className="mb-1 text-[10px] text-white/30">Net Worth</Text>
                <Text className="font-sans-bold text-[15px] leading-[15px] text-white">
                  {fiScore.data ? `Rs. ${formatLKRAbbrev(fiScore.data.net_worth)}` : "—"}
                </Text>
              </View>
              <View className="flex-1 rounded-[10px] bg-white/[0.06] px-2.5 py-2">
                <Text className="mb-1 text-[10px] text-white/30">Target</Text>
                <Text className="font-sans-bold text-[15px] leading-[15px] text-white/40">
                  {projections.data ? `Rs. ${formatLKRAbbrev(projections.data.fi_number)}` : "—"}
                </Text>
              </View>
            </View>
          </View>

          {/* TIER 2 — Key metrics */}
          <View className="flex-row gap-2">
            <Card className="flex-1 p-3.5">
              <View className="mb-1.5 flex-row items-center gap-1.5">
                <Text className="text-[11px] font-sans-medium text-foreground/40">Years to FI</Text>
                <Info size={11} color="rgba(255,255,255,0.2)" strokeWidth={2} />
              </View>
              <Text className="mb-1 font-sans-extrabold text-[28px] leading-[28px] tracking-tight text-foreground">
                {projections.data ? yearsToFi.toFixed(1) : "—"}
              </Text>
              <Text className="text-[10px] text-foreground/20">
                {projections.data ? `Freedom by ${freedomYear} · base case` : "base case"}
              </Text>
            </Card>
            <Card className="flex-1 p-3.5">
              <View className="mb-1.5 flex-row items-center gap-1.5">
                <Text className="text-[11px] font-sans-medium text-foreground/40">Savings Rate</Text>
                <Info size={11} color="rgba(255,255,255,0.2)" strokeWidth={2} />
              </View>
              <Text className="mb-1 font-sans-extrabold text-[28px] leading-[28px] tracking-tight text-foreground">
                {fiScore.data ? formatPct(fiScore.data.savings_rate, 0) : "—"}
              </Text>
              <Text className="text-[10px] text-foreground/20">% of income saved · aim 40%+</Text>
            </Card>
          </View>

          {/* TIER 3 — Milestones */}
          <Card className="p-4">
            <View className="mb-3.5 flex-row items-center gap-1.5">
              <Text className="font-sans-semibold text-[14px] text-foreground">Milestones</Text>
              <Info size={12} color="rgba(255,255,255,0.25)" strokeWidth={2} />
            </View>
            <View className="gap-3">
              {milestones.map((m) => (
                <MilestoneRow key={m.label} milestone={m} />
              ))}
            </View>
          </Card>

          {/* TIER 4 — FI Score */}
          <Card className="p-4">
            <View className="mb-3 flex-row items-center justify-between">
              <View>
                <View className="flex-row items-center gap-1.5">
                  <Text className="font-sans-semibold text-[14px] text-foreground">FI Score</Text>
                  <Info size={12} color="rgba(255,255,255,0.25)" strokeWidth={2} />
                </View>
                {fiScore.data?.grade ? (
                  <Text className="mt-0.5 text-[11px] text-foreground/30">Grade {fiScore.data.grade}</Text>
                ) : null}
              </View>
              {fiScore.data ? (
                <ScoreRing score={Number(fiScore.data.overall_score)} />
              ) : (
                <View className="h-12 w-12 items-center justify-center rounded-full bg-foreground/[0.07]">
                  <Text className="text-foreground/40">—</Text>
                </View>
              )}
            </View>
            <View className="flex-row gap-1.5">
              <View className="flex-1 rounded-[10px] border border-foreground/[0.06] bg-foreground/[0.04] px-2.5 py-2.5">
                <Text className="mb-1.5 text-[10px] text-foreground/35">Savings Rate</Text>
                <Text className="font-sans-bold text-[18px] leading-[18px] text-foreground">
                  {fiScore.data ? formatPct(fiScore.data.savings_rate, 0) : "—"}
                </Text>
              </View>
              <View className="flex-1 rounded-[10px] border border-foreground/[0.06] bg-foreground/[0.04] px-2.5 py-2.5">
                <Text className="mb-1.5 text-[10px] text-foreground/35">Debt-to-Asset</Text>
                <Text className="font-sans-bold text-[18px] leading-[18px] text-foreground">
                  {fiScore.data ? formatPct(fiScore.data.debt_to_asset, 0) : "—"}
                </Text>
              </View>
            </View>
          </Card>
        </View>
      ) : null}

      {tab === "Strategy" ? (
        <View className="gap-3 px-4 pt-3.5">
          {!strategy.data ? (
            <Card className="items-center gap-3 p-6">
              <Text className="text-center text-[13px] text-foreground/40">
                No FIRE strategy yet — generate one from your financial profile.
              </Text>
              <PillButton
                variant="accent"
                loading={generateStrategy.isPending}
                onPress={() => generateStrategy.mutate()}
              >
                <Sparkles size={14} color="#FFFFFF" strokeWidth={2} />
                <Text className="font-sans-semibold text-[14px] text-white">Generate strategy</Text>
              </PillButton>
            </Card>
          ) : (
            <>
              <Card className="p-4">
                <View className="mb-1 flex-row items-center justify-between">
                  <Text className="font-sans-semibold text-[15px] capitalize text-foreground">
                    {strategy.data.fire_style} FIRE
                  </Text>
                  <Text className="text-[11px] text-foreground/30">v{strategy.data.version}</Text>
                </View>
                <View className="mt-2 flex-row gap-2">
                  <StatTile className="flex-1" label="SWR" value={formatPct(strategy.data.swr, 0)} />
                  <StatTile className="flex-1" label="Base Return" value={formatPct(strategy.data.return_base, 0)} />
                  <StatTile className="flex-1" label="Target Exp." value={`Rs. ${formatLKRAbbrev(strategy.data.target_monthly_expenses)}`} />
                </View>
              </Card>

              <View className="gap-2">
                {strategy.data.buckets.map((bucket) => (
                  <Card key={bucket.name} className="p-3.5">
                    <View className="mb-1.5 flex-row items-center justify-between">
                      <Text className="font-sans-semibold text-[13px] text-foreground">{bucket.name}</Text>
                      <Text className="font-sans-bold text-[13px] text-salli-accent">{formatPct(bucket.target_pct, 0)}</Text>
                    </View>
                    <ProgressBar pct={Number(bucket.target_pct)} />
                    <Text className="mt-1.5 text-[11px] leading-4 text-foreground/35">{bucket.description}</Text>
                  </Card>
                ))}
              </View>

              {strategy.data.ai_rationale ? (
                <Card className="p-4">
                  <Text className="mb-2 font-sans-semibold text-[13px] text-foreground">AI Rationale</Text>
                  <Text className="text-[12px] leading-5 text-foreground/50">{strategy.data.ai_rationale}</Text>
                </Card>
              ) : null}

              <PillButton
                variant="secondary"
                loading={generateStrategy.isPending}
                onPress={() => generateStrategy.mutate()}
              >
                Refresh strategy
              </PillButton>
            </>
          )}

          <Card className="p-4">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="font-sans-semibold text-[14px] text-foreground">FI Mentor</Text>
              {runAdvisor.isPending ? <ActivityIndicator color={colors.accent} /> : null}
            </View>
            {advisorReport.data ? (
              <>
                <Text className="mb-2 text-[12px] leading-5 text-foreground/50">{advisorReport.data.summary}</Text>
                {advisorReport.data.recommendations.slice(0, 4).map((rec) => (
                  <View key={rec.id} className="mb-2 rounded-control border border-foreground/10 bg-muted p-3">
                    <View className="mb-1 flex-row items-center gap-1.5">
                      <View className="rounded-[4px] bg-salli-accent/15 px-1.5 py-0.5">
                        <Text className="text-[9px] font-sans-semibold text-salli-accent">P{rec.priority}</Text>
                      </View>
                      <Text className="flex-1 font-sans-medium text-[12px] text-foreground">{rec.title}</Text>
                    </View>
                    <Text className="text-[11px] leading-4 text-foreground/35">{rec.rationale}</Text>
                  </View>
                ))}
              </>
            ) : (
              <Text className="mb-3 text-[12px] text-foreground/35">
                Run the advisor for a prioritized action plan.
              </Text>
            )}
            <PillButton variant="secondary" loading={runAdvisor.isPending} onPress={() => runAdvisor.mutate()}>
              Run FI Mentor
            </PillButton>
          </Card>
        </View>
      ) : null}

      {tab === "Goals" ? (
        <View className="gap-2 px-4 pt-3.5">
          {(goals.data ?? []).length === 0 ? (
            <Card className="items-center p-6">
              <Text className="text-[13px] text-foreground/35">No goals yet.</Text>
            </Card>
          ) : (
            (goals.data ?? []).map((goal) => (
              <Card key={goal.id} className="p-3.5">
                <View className="mb-1.5 flex-row items-center justify-between">
                  <Text className="font-sans-semibold text-[13px] text-foreground">{goal.name}</Text>
                  <Pressable onPress={() => deleteGoal.mutate(goal.id)}>
                    <Trash2 size={14} color={colors.mutedForeground} strokeWidth={2} />
                  </Pressable>
                </View>
                <ProgressBar pct={goal.progress} />
                <View className="mt-1.5 flex-row justify-between">
                  <Text className="text-[11px] text-foreground/30">
                    Rs. {formatLKRAbbrev(goal.current_amount)} of Rs. {formatLKRAbbrev(goal.target_amount)}
                  </Text>
                  <Text className="text-[11px] font-sans-medium text-foreground/45">{(goal.progress * 100).toFixed(0)}%</Text>
                </View>
              </Card>
            ))
          )}
        </View>
      ) : null}

      <Text className="mt-4 px-8 text-center text-[11px] leading-4 text-foreground/25">
        Planning estimates only · Not financial advice · Numbers from deterministic engine
      </Text>
    </PageShell>
  );
}
