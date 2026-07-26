import {
  Check,
  ChevronDown,
  ChevronUp,
  Home,
  Info,
  type LucideIcon,
  PiggyBank,
  Plus,
  Shield,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import Markdown from "react-native-markdown-display";
import Svg, { Circle, Line, Path, Polyline } from "react-native-svg";

import { Card } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { PageShell } from "@/components/ui/page-shell";
import { PillButton } from "@/components/ui/pill-button";
import { Tabs } from "@/components/ui/tabs";
import { TextField } from "@/components/ui/text-field";
import {
  useFiGoalMutations,
  useFiGoals,
  useFiProjections,
  useFiScore,
  useFiStrategy,
  useFiSurplus,
  useGenerateStrategy,
  useLatestAdvisorReport,
  useRunAdvisor,
  type FiProjections,
} from "@/hooks/useFi";
import { useBalanceSheet } from "@/hooks/useReports";
import { formatLKR, formatLKRAbbrev, formatPct } from "@/lib/format";
import { useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

const TABS = ["Overview", "Strategy", "Goals", "Mentor"] as const;

/** Distinct-but-on-brand colours for allocation pie segments. */
const PIE_COLORS = ["#16130f", "#b7b1a5", "#4b463d", "#e4e0d6", "#6b6459", "#2c2822", "#8c877c"];

const GOAL_ICON: Record<string, LucideIcon> = {
  emergency_fund: Wallet,
  home: Home,
  retirement: PiggyBank,
  financial_independence: Target,
  debt_free: Shield,
  wealth_growth: TrendingUp,
  custom: Target,
};

/** Portfolio-projection line chart (mockup's Strategy hero): three engine
 * series (growth/base/conservative) plus a dashed FIRE-target line. */
function ProjectionChart({ projections }: { projections: FiProjections }) {
  const colors = useThemeColors();
  const W = 320;
  const H = 90;
  const pad = 8;
  const pts = projections.points;
  const maxYear = Math.max(1, ...pts.map((p) => p.year));
  const target = Number(projections.fi_number);
  const maxVal = Math.max(target, ...pts.map((p) => Number(p.growth))) || 1;
  const x = (yr: number) => (yr / maxYear) * W;
  const y = (v: number) => H - pad - (v / maxVal) * (H - pad * 2);
  const line = (key: "conservative" | "base" | "growth") =>
    pts.map((p) => `${x(p.year).toFixed(1)},${y(Number(p[key])).toFixed(1)}`).join(" ");
  const targetY = y(target);
  return (
    <Svg width="100%" height={90} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <Line x1={0} y1={targetY} x2={W} y2={targetY} stroke="rgba(255,255,255,0.25)" strokeWidth={1} strokeDasharray="3 3" />
      <Polyline points={line("conservative")} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={2} strokeDasharray="4 3" strokeLinejoin="round" />
      <Polyline points={line("base")} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={2} strokeDasharray="4 3" strokeLinejoin="round" />
      <Polyline points={line("growth")} fill="none" stroke={colors.accent} strokeWidth={2.5} strokeLinejoin="round" />
    </Svg>
  );
}

/** Donut of allocation buckets with tappable segments (annular sectors) — each
 * slice opens a detail drawer. `active` gets a subtle outward emphasis. */
function AllocationDonut({
  buckets,
  onSelect,
}: {
  buckets: { name: string; target_pct: string }[];
  onSelect: (i: number) => void;
}) {
  const size = 156;
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2;
  const rIn = R - 28;
  const pt = (r: number, deg: number): [number, number] => {
    const t = (deg * Math.PI) / 180;
    return [cx + r * Math.sin(t), cy - r * Math.cos(t)];
  };
  const gap = 1.2; // degrees between slices
  let d0 = 0;
  return (
    <Svg width={size} height={size}>
      {buckets.map((b, i) => {
        const frac = Math.max(0, Math.min(1, Number(b.target_pct)));
        const start = d0 + gap;
        const end = d0 + frac * 360 - gap;
        d0 += frac * 360;
        if (end <= start) return null;
        const [ox0, oy0] = pt(R, start);
        const [ox1, oy1] = pt(R, end);
        const [ix1, iy1] = pt(rIn, end);
        const [ix0, iy0] = pt(rIn, start);
        const large = end - start > 180 ? 1 : 0;
        const dPath = `M ${ox0} ${oy0} A ${R} ${R} 0 ${large} 1 ${ox1} ${oy1} L ${ix1} ${iy1} A ${rIn} ${rIn} 0 ${large} 0 ${ix0} ${iy0} Z`;
        return <Path key={b.name} d={dPath} fill={PIE_COLORS[i % PIE_COLORS.length]} onPress={() => onSelect(i)} />;
      })}
    </Svg>
  );
}

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
  const colors = useThemeColors();
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
          stroke={colors.accent}
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
  const [strategyOpen, setStrategyOpen] = useState(true);
  const [selectedBucket, setSelectedBucket] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newYear, setNewYear] = useState("");

  const fiScore = useFiScore();
  const projections = useFiProjections();
  const surplus = useFiSurplus();
  const strategy = useFiStrategy();
  const generateStrategy = useGenerateStrategy();
  const goals = useFiGoals();
  const { createGoal, deleteGoal } = useFiGoalMutations();
  const advisorReport = useLatestAdvisorReport();
  const runAdvisor = useRunAdvisor();
  const balanceSheet = useBalanceSheet();

  const submitGoal = () => {
    if (!newName.trim() || !newAmount) return;
    createGoal.mutate(
      {
        name: newName.trim(),
        target_amount: Number(newAmount),
        target_date: newYear ? `${newYear}-01-01` : undefined,
      },
      {
        onSuccess: () => {
          setNewName("");
          setNewAmount("");
          setNewYear("");
          setAddOpen(false);
        },
      },
    );
  };

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
        <Text className="flex-1 font-sans-bold text-[20px] text-foreground">Freedom</Text>
        <Info size={18} color={colors.mutedForeground} strokeWidth={2} />
      </View>

      <Tabs className="mt-3" items={TABS} value={tab} onChange={setTab} />

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
                <Text className="text-[11px] font-sans-medium text-foreground/40">Years to Freedom</Text>
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
                  <Text className="font-sans-semibold text-[14px] text-foreground">Freedom Score</Text>
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
          {/* Portfolio projection chart */}
          {projections.data ? (
            <View className="rounded-card border border-foreground/[0.08] bg-salli-navy-card p-[16px]">
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-[11px] font-sans-semibold uppercase tracking-wide text-white/50">
                  Portfolio Projection
                </Text>
                <Text className="text-[11px] text-white/30">
                  {targetAge ? `to age ${targetAge}` : `${projections.data.points.length - 1} yrs`}
                </Text>
              </View>
              <ProjectionChart projections={projections.data} />
              <View className="mt-2.5 flex-row items-center gap-3">
                {[
                  { c: colors.accent, l: "Growth" },
                  { c: "rgba(255,255,255,0.4)", l: "Base" },
                  { c: "rgba(255,255,255,0.2)", l: "Conservative" },
                ].map((x) => (
                  <View key={x.l} className="flex-row items-center gap-1.5">
                    <View style={{ width: 12, height: 2, borderRadius: 2, backgroundColor: x.c }} />
                    <Text className="text-[10px] text-white/50">{x.l}</Text>
                  </View>
                ))}
                <Text className="flex-1 text-right text-[10px] text-white/30">- - Freedom target</Text>
              </View>
            </View>
          ) : null}

          {!strategy.data ? (
            <Card className="items-center gap-3 p-6">
              <Text className="text-center text-[13px] text-foreground/40">
                No FIRE strategy yet — generate one from your financial profile.
              </Text>
              <PillButton variant="accent" loading={generateStrategy.isPending} onPress={() => generateStrategy.mutate()}>
                <Sparkles size={14} color="#FFFFFF" strokeWidth={2} />
                <Text className="font-sans-semibold text-[14px] text-white">Generate strategy</Text>
              </PillButton>
            </Card>
          ) : (
            <>
              {/* Allocation — tappable donut (slices open a detail drawer) */}
              <Card className="p-4">
                <Text className="text-[11px] font-sans-semibold uppercase tracking-wide text-foreground/30">
                  Allocation{surplus.data ? ` · Rs. ${formatLKRAbbrev(surplus.data.monthly_surplus)}/mo surplus` : ""}
                </Text>
                <View className="my-2 h-[156px] w-[156px] items-center justify-center self-center">
                  <AllocationDonut buckets={strategy.data.buckets} onSelect={setSelectedBucket} />
                  <View pointerEvents="none" style={{ position: "absolute", alignItems: "center" }}>
                    <Text className="font-sans-extrabold text-[16px] leading-5 text-foreground">
                      {surplus.data ? `Rs. ${formatLKRAbbrev(surplus.data.monthly_surplus)}` : "—"}
                    </Text>
                    <Text className="text-[10px] text-foreground/35">surplus/mo</Text>
                  </View>
                </View>
                <Text className="text-center text-[11px] text-foreground/30">Tap a slice to see how each bucket works</Text>
              </Card>

              {/* Scrooge's Strategy — collapsible */}
              {strategy.data.ai_rationale ? (
                <View className="rounded-[16px] border border-salli-accent/20 bg-card">
                  <Pressable
                    onPress={() => setStrategyOpen((o) => !o)}
                    className="flex-row items-center gap-2 p-3.5"
                  >
                    <View className="h-[26px] w-[26px] items-center justify-center rounded-[8px] bg-salli-accent/15">
                      <PiggyBank size={14} color={colors.accent} strokeWidth={2} />
                    </View>
                    <Text className="flex-1 font-sans-semibold text-[13px] text-foreground">Scrooge&apos;s Strategy</Text>
                    <Text className="text-[10px] capitalize text-foreground/30">
                      {strategy.data.fire_style} · v{strategy.data.version}
                    </Text>
                    {strategyOpen ? (
                      <ChevronUp size={16} color={colors.mutedForeground} strokeWidth={2} />
                    ) : (
                      <ChevronDown size={16} color={colors.mutedForeground} strokeWidth={2} />
                    )}
                  </Pressable>
                  {strategyOpen ? (
                    <View className="px-3.5 pb-3.5">
                      <View className="mb-2.5 border-t border-foreground/[0.06] pt-2.5">
                        <Markdown
                          style={{
                            body: { color: "rgba(200,200,200,0.75)", fontSize: 12, lineHeight: 18, fontFamily: "Archivo_400Regular" },
                            heading1: { color: colors.foreground, fontFamily: "Archivo_700Bold", fontSize: 13, marginTop: 4, marginBottom: 2 },
                            heading2: { color: colors.foreground, fontFamily: "Archivo_600SemiBold", fontSize: 12, marginTop: 4, marginBottom: 2 },
                            heading3: { color: colors.foreground, fontFamily: "Archivo_600SemiBold", fontSize: 12, marginTop: 3, marginBottom: 1 },
                            strong: { color: colors.foreground, fontFamily: "Archivo_600SemiBold" },
                            bullet_list: { marginTop: 2 },
                            list_item: { marginVertical: 1 },
                          }}
                        >
                          {strategy.data.ai_rationale}
                        </Markdown>
                      </View>
                      <View className="flex-row flex-wrap gap-1.5">
                        {["4% rule", `${formatPct(strategy.data.swr, 0)} SWR`, `${formatPct(strategy.data.return_base, 0)} base`].map((t) => (
                          <View key={t} className="rounded-pill bg-salli-accent/[0.12] px-2.5 py-0.5">
                            <Text className="text-[10px] font-sans-medium text-salli-accent">{t}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : null}
                </View>
              ) : null}

              <PillButton variant="secondary" loading={generateStrategy.isPending} onPress={() => generateStrategy.mutate()}>
                Refresh strategy
              </PillButton>
            </>
          )}
        </View>
      ) : null}

      {tab === "Mentor" ? (
        <View className="gap-3 px-4 pt-3.5">
          <Card className="p-4">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="font-sans-semibold text-[14px] text-foreground">Freedom Mentor</Text>
              {runAdvisor.isPending ? <ActivityIndicator color={colors.accent} /> : null}
            </View>
            {advisorReport.data ? (
              <>
                <Text className="mb-2.5 text-[12px] leading-5 text-foreground/50">{advisorReport.data.summary}</Text>
                {advisorReport.data.recommendations.map((rec) => (
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
                Run the advisor for a prioritized, engine-backed action plan.
              </Text>
            )}
            <PillButton variant="secondary" loading={runAdvisor.isPending} onPress={() => runAdvisor.mutate()}>
              {advisorReport.data ? "Re-run Freedom Mentor" : "Run Freedom Mentor"}
            </PillButton>
          </Card>
        </View>
      ) : null}

      {tab === "Goals" ? (
        (() => {
          const all = goals.data ?? [];
          const complete = all.filter((g) => g.progress >= 1);
          const active = all.filter((g) => g.progress < 1);
          const savedToward = all.reduce((s, g) => s + Number(g.current_amount), 0);
          return (
            <View className="gap-2 px-4 pt-3.5">
              {/* summary hero */}
              <View className="rounded-card border border-foreground/[0.08] bg-salli-navy-card p-[16px]">
                <Text className="mb-1.5 text-[11px] font-sans-semibold uppercase tracking-wide text-white/50">
                  Goals Progress
                </Text>
                <View className="mb-3 flex-row items-baseline gap-1.5">
                  <Text className="font-sans-extrabold text-[40px] leading-none tracking-tighter text-white">
                    {complete.length}
                  </Text>
                  <Text className="text-[14px] font-sans-medium text-white/40">of {all.length} complete</Text>
                </View>
                <View className="flex-row gap-1.5">
                  <View className="flex-1 rounded-[10px] bg-white/[0.06] px-2.5 py-2">
                    <Text className="mb-1 text-[10px] text-white/35">In Progress</Text>
                    <Text className="font-sans-bold text-[15px] leading-[15px] text-salli-accent">{active.length} active</Text>
                  </View>
                  <View className="flex-1 rounded-[10px] bg-white/[0.06] px-2.5 py-2">
                    <Text className="mb-1 text-[10px] text-white/35">Saved Toward</Text>
                    <Text className="font-sans-bold text-[15px] leading-[15px] text-white">Rs. {formatLKRAbbrev(savedToward)}</Text>
                  </View>
                </View>
              </View>

              <Text className="mb-0.5 mt-1.5 pl-0.5 text-[11px] font-sans-semibold uppercase tracking-wide text-foreground/30">
                Your Goals
              </Text>

              {all.length === 0 ? (
                <Card className="items-center p-6">
                  <Text className="text-[13px] text-foreground/35">No goals yet — add your first one.</Text>
                </Card>
              ) : (
                all.map((goal) => {
                  const done = goal.progress >= 1;
                  const Icon = GOAL_ICON[goal.kind] ?? Target;
                  const year = goal.target_date ? new Date(goal.target_date).getFullYear() : null;
                  return (
                    <Card key={goal.id} className={cn("p-3.5", done && "opacity-60")}>
                      <View className={cn("flex-row items-start justify-between", !done && "mb-2")}>
                        <View className="flex-1 flex-row items-center gap-2.5">
                          <View
                            className={cn(
                              "h-[34px] w-[34px] items-center justify-center rounded-[10px]",
                              done ? "bg-salli-accent/[0.12]" : "border border-salli-accent/20 bg-salli-accent/[0.12]",
                            )}
                          >
                            {done ? (
                              <Check size={15} color={colors.accent} strokeWidth={2.5} />
                            ) : (
                              <Icon size={15} color={colors.accent} strokeWidth={2} />
                            )}
                          </View>
                          <View className="flex-1">
                            <Text className={cn("font-sans-semibold text-[13px] text-foreground", done && "line-through")}>
                              {goal.name}
                            </Text>
                            <Text className="mt-0.5 text-[11px] text-foreground/30">
                              {done ? `Rs. ${formatLKRAbbrev(goal.current_amount)} · Completed` : year ? `Target ${year}` : "No target date"}
                            </Text>
                          </View>
                        </View>
                        {done ? (
                          <View className="rounded-[4px] bg-salli-accent/15 px-2 py-0.5">
                            <Text className="text-[10px] font-sans-semibold text-salli-accent">Done</Text>
                          </View>
                        ) : (
                          <View className="flex-row items-center gap-2.5">
                            <Text className="font-sans-bold text-[13px] text-salli-accent">{(goal.progress * 100).toFixed(0)}%</Text>
                            <Pressable onPress={() => deleteGoal.mutate(goal.id)}>
                              <Trash2 size={13} color={colors.mutedForeground} strokeWidth={2} />
                            </Pressable>
                          </View>
                        )}
                      </View>
                      {!done ? (
                        <>
                          <ProgressBar pct={goal.progress} />
                          <View className="mt-1.5 flex-row justify-between">
                            <Text className="text-[11px] text-foreground/40">Rs. {formatLKRAbbrev(goal.current_amount)} saved</Text>
                            <Text className="text-[11px] text-foreground/40">of Rs. {formatLKRAbbrev(goal.target_amount)}</Text>
                          </View>
                        </>
                      ) : null}
                    </Card>
                  );
                })
              )}

              <Pressable
                onPress={() => setAddOpen(true)}
                className="flex-row items-center gap-2.5 rounded-card border border-dashed border-foreground/[0.12] bg-card p-3.5"
              >
                <View className="h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-foreground/[0.04]">
                  <Plus size={15} color={colors.mutedForeground} strokeWidth={2.5} />
                </View>
                <Text className="font-sans-medium text-[13px] text-foreground/40">Add a goal</Text>
              </Pressable>
            </View>
          );
        })()
      ) : null}

      <Text className="mt-4 px-8 text-center text-[11px] leading-4 text-foreground/25">
        Planning estimates only · Not financial advice · Numbers from deterministic engine
      </Text>

      <Drawer
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add a goal"
        footer={
          <PillButton loading={createGoal.isPending} disabled={!newName.trim() || !newAmount} onPress={submitGoal}>
            Add goal
          </PillButton>
        }
      >
        <View className="gap-2">
          <TextField label="Goal name" value={newName} onChangeText={setNewName} placeholder="e.g. Buy a home" />
          <View className="flex-row gap-2">
            <TextField className="flex-1" label="Target amount" value={newAmount} onChangeText={setNewAmount} keyboardType="numeric" placeholder="0" />
            <TextField className="flex-1" label="Target year" value={newYear} onChangeText={setNewYear} keyboardType="numeric" placeholder="YYYY" />
          </View>
        </View>
      </Drawer>

      {/* Allocation bucket detail drawer */}
      <Drawer
        visible={selectedBucket !== null}
        onClose={() => setSelectedBucket(null)}
        keyboardAvoiding={false}
        title={selectedBucket !== null ? strategy.data?.buckets[selectedBucket]?.name : undefined}
      >
        {selectedBucket !== null && strategy.data?.buckets[selectedBucket]
          ? (() => {
              const b = strategy.data.buckets[selectedBucket];
              const route = surplus.data ? Number(surplus.data.monthly_surplus) * Number(b.target_pct) : null;
              return (
                <>
                  <View className="mb-3 flex-row gap-2">
                    <View className="flex-1 rounded-control border border-foreground/[0.08] bg-card p-3">
                      <Text className="mb-1 text-[10px] font-sans-medium uppercase tracking-wide text-foreground/35">Allocation</Text>
                      <Text className="font-sans-extrabold text-[22px] leading-6 text-foreground">{formatPct(b.target_pct, 0)}</Text>
                    </View>
                    <View className="flex-1 rounded-control border border-foreground/[0.08] bg-card p-3">
                      <Text className="mb-1 text-[10px] font-sans-medium uppercase tracking-wide text-foreground/35">Routed / month</Text>
                      <Text className="font-sans-extrabold text-[22px] leading-6 text-foreground">
                        {route !== null ? `Rs. ${formatLKRAbbrev(route)}` : "—"}
                      </Text>
                    </View>
                  </View>
                  <Text className="mb-1 text-[10px] font-sans-medium uppercase tracking-wide text-foreground/35">How it works</Text>
                  <Text className="text-[13px] leading-5 text-foreground/60">{b.description}</Text>
                </>
              );
            })()
          : null}
      </Drawer>
    </PageShell>
  );
}
