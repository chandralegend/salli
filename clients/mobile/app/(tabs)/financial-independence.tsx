import { useRouter } from "expo-router";
import {
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Home,
  Lock,
  type LucideIcon,
  PiggyBank,
  Plus,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import Markdown from "react-native-markdown-display";
import Svg, { Circle, Line, Path, Polyline } from "react-native-svg";

import { QuotaBanner } from "@/components/shared/QuotaBanner";
import { TourTarget } from "@/components/tour/TourTarget";
import { GoalDetailDrawer } from "@/components/fi/GoalDetailDrawer";
import { SpendingBreakdown } from "@/components/fi/SpendingBreakdown";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { Card } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { InfoButton } from "@/components/ui/info-button";
import { PageShell } from "@/components/ui/page-shell";
import { ActionButton } from "@/components/ui/action-button";
import { Tabs } from "@/components/ui/tabs";
import { TextField } from "@/components/ui/text-field";
import { isQuotaError } from "@/lib/quota";
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
  type FiGoal,
} from "@/hooks/useFi";
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
 * series (growth/base/conservative) plus a dashed FIRE-target line. Locked
 * (Free-tier) scenarios arrive as `null` on every point — omit them entirely
 * rather than plotting `Number(null) === 0` as a false flat line. */
function ProjectionChart({ projections }: { projections: FiProjections }) {
  const colors = useThemeColors();
  const W = 320;
  const H = 90;
  const pad = 8;
  const pts = projections.points;
  const locked = new Set(projections.scenario_access?.locked ?? []);
  const maxYear = Math.max(1, ...pts.map((p) => p.year));
  const target = Number(projections.fi_number);
  const maxVal = Math.max(target, ...pts.map((p) => Number(p.growth ?? p.base))) || 1;
  const x = (yr: number) => (yr / maxYear) * W;
  const y = (v: number) => H - pad - (v / maxVal) * (H - pad * 2);
  const line = (key: "conservative" | "base" | "growth") =>
    pts
      .filter((p) => p[key] !== null)
      .map((p) => `${x(p.year).toFixed(1)},${y(Number(p[key])).toFixed(1)}`)
      .join(" ");
  const targetY = y(target);
  return (
    <Svg width="100%" height={90} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <Line x1={0} y1={targetY} x2={W} y2={targetY} stroke="rgba(255,255,255,0.25)" strokeWidth={1} strokeDasharray="3 3" />
      {!locked.has("conservative") ? (
        <Polyline points={line("conservative")} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={2} strokeDasharray="4 3" strokeLinejoin="round" />
      ) : null}
      <Polyline points={line("base")} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={2} strokeDasharray="4 3" strokeLinejoin="round" />
      {!locked.has("growth") ? (
        <Polyline points={line("growth")} fill="none" stroke={colors.accent} strokeWidth={2.5} strokeLinejoin="round" />
      ) : null}
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
      <Text className="font-sans-bold text-[16px] text-foreground">{score.toFixed(0)}</Text>
    </View>
  );
}

export default function FinancialIndependenceScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [strategyOpen, setStrategyOpen] = useState(true);
  const [selectedBucket, setSelectedBucket] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [detailGoal, setDetailGoal] = useState<FiGoal | null>(null);
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newYear, setNewYear] = useState("");

  const fiScore = useFiScore();
  const projections = useFiProjections();
  const surplus = useFiSurplus();
  const strategy = useFiStrategy();
  const generateStrategy = useGenerateStrategy();
  const goals = useFiGoals();
  const { createGoal } = useFiGoalMutations();
  const advisorReport = useLatestAdvisorReport();
  const runAdvisor = useRunAdvisor();

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

  // Goals snapshot for the Overview tab — same real /fi/goals data the Goals
  // tab renders in full, never invented client-side milestones.
  const allGoals = goals.data ?? [];
  const completeGoals = allGoals.filter((g) => g.progress >= 1);
  const activeGoals = allGoals.filter((g) => g.progress < 1);

  return (
    <PageShell
      animateOn={tab}
      header={
        <>
          <TourTarget id="freedom-header">
            <View className="flex-row items-center px-5 pb-1 pt-2.5">
              <Text className="flex-1 font-sans-bold text-[22px] text-foreground">Freedom</Text>
              <InfoButton
                size={20}
                title="Freedom"
                description={
                  "Freedom is the point where your investments can cover your living costs, so working becomes a choice.\n\n" +
                  "Everything here is computed from your own ledger — your real income, spending, and net worth — not from estimates. " +
                  "As those change, so do these numbers."
                }
              />
            </View>
          </TourTarget>

          <Tabs className="mt-3" items={TABS} value={tab} onChange={setTab} />
        </>
      }
    >

      {tab === "Overview" && fiScore.isLoading ? (
        <View className="items-center pt-16">
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : null}

      {tab === "Overview" && !fiScore.isLoading ? (
        <View className="gap-2.5 px-4 pt-3">
          {/* TIER 1 — Freedom Number (navy hero card) */}
          <View className="rounded-card border border-foreground/[0.08] bg-salli-hero p-[18px]">
            <View className="mb-2 flex-row items-center gap-1.5">
              <Text className="text-[14px] font-sans-semibold uppercase tracking-wide text-white/50">
                Freedom Number
              </Text>
              <InfoButton
                onDark
                title="Freedom Number"
                description={
                  "The total you'd need invested for returns alone to cover your yearly spending — indefinitely.\n\n" +
                  "It's your annual expenses divided by your safe withdrawal rate. At a 4% rate, spending Rs. 100,000 a year means a Freedom Number of Rs. 2,500,000.\n\n" +
                  "Spend less, and the target falls as well as getting closer."
                }
              />
            </View>
            <View className="mb-2.5 rounded-card border border-white/10 bg-white/[0.06] px-2.5 py-1.5">
              <Text className="text-[14px] leading-5 text-white/45">
                The savings target where investment returns cover your lifestyle — permanently.
              </Text>
            </View>
            <View className="mb-1.5 flex-row items-baseline gap-1">
              <Text className="font-sans-bold text-[26px] text-white/45">Rs.</Text>
              <Text className="font-sans-extrabold text-[42px] leading-[42px] tracking-tighter text-white">
                {projections.data ? formatLKRAbbrev(projections.data.fi_number) : "—"}
              </Text>
            </View>
            <View className="mb-3.5 flex-row items-center gap-1.5">
              <Text className="text-[14px] text-white/30">4% SWR</Text>
              {targetAge ? (
                <>
                  <Text className="text-[14px] text-white/15">·</Text>
                  <Text className="text-[14px] text-white/30">Target age {targetAge}</Text>
                </>
              ) : null}
            </View>
            <View className="flex-row gap-1.5">
              <View className="flex-1 rounded-card bg-white/[0.06] px-2.5 py-2">
                <Text className="mb-1 text-[13px] text-white/30">Funded</Text>
                <Text className="font-sans-bold text-[17px] leading-[20px] text-salli-accent">
                  {fiScore.data ? formatPct(fiScore.data.progress_to_fi) : "—"}
                </Text>
              </View>
              <View className="flex-1 rounded-card bg-white/[0.06] px-2.5 py-2">
                <Text className="mb-1 text-[13px] text-white/30">Net Worth</Text>
                <Text className="font-sans-bold text-[17px] leading-[20px] text-white">
                  {fiScore.data ? `Rs. ${formatLKRAbbrev(fiScore.data.net_worth)}` : "—"}
                </Text>
              </View>
              <View className="flex-1 rounded-card bg-white/[0.06] px-2.5 py-2">
                <Text className="mb-1 text-[13px] text-white/30">Target</Text>
                <Text className="font-sans-bold text-[17px] leading-[20px] text-white/40">
                  {projections.data ? `Rs. ${formatLKRAbbrev(projections.data.fi_number)}` : "—"}
                </Text>
              </View>
            </View>
          </View>

          {/* TIER 2 — Key metrics */}
          <View className="flex-row gap-2">
            <Card className="flex-1 p-3.5">
              <View className="mb-1.5 flex-row items-center gap-1.5">
                <Text className="text-[14px] font-sans-medium text-foreground/40">Years to Freedom</Text>
                <InfoButton
                  size={11}
                  title="Years to Freedom"
                  description={
                    "How long until you reach your Freedom Number, if you keep saving at your current rate and investments grow at the assumed return.\n\n" +
                    "It moves fastest when you raise your savings rate — that both adds to the pot and lowers the target, because you're living on less."
                  }
                />
              </View>
              <Text className="mb-1 font-sans-extrabold text-[32px] leading-[34px] tracking-tight text-foreground">
                {projections.data ? yearsToFi.toFixed(1) : "—"}
              </Text>
              <Text className="text-[13px] text-foreground/20">
                {projections.data ? `Freedom by ${freedomYear} · base case` : "base case"}
              </Text>
            </Card>
            <Card className="flex-1 p-3.5">
              <View className="mb-1.5 flex-row items-center gap-1.5">
                <Text className="text-[14px] font-sans-medium text-foreground/40">Savings Rate</Text>
                <InfoButton
                  size={11}
                  title="Savings Rate"
                  description={
                    "The share of your income you don't spend, from your actual ledger entries.\n\n" +
                    "It's the single biggest lever on your Freedom date: it raises what you put away and lowers what you need, at the same time."
                  }
                />
              </View>
              <Text className="mb-1 font-sans-extrabold text-[32px] leading-[34px] tracking-tight text-foreground">
                {fiScore.data ? formatPct(fiScore.data.savings_rate, 0) : "—"}
              </Text>
              <Text className="text-[13px] text-foreground/20">% of income saved · aim 40%+</Text>
            </Card>
          </View>

          {/* Where the money actually goes — by category tag, and split needs
              vs wants. Sits above Goals because it answers the question people
              open this screen with. */}
          <SpendingBreakdown surplus={surplus.data} />

          {/* TIER 3 — Goals status, from the same /fi/goals data the Goals tab
              renders in full (never invented client-side milestones). */}
          <Card className="p-4">
            <View className="mb-3.5 flex-row items-center justify-between">
              <View className="flex-row items-center gap-1.5">
                <Text className="font-sans-semibold text-[16px] text-foreground">Goals</Text>
                <InfoButton
                  size={14}
                  title="Goals"
                  description={
                    "Specific things you're saving toward — a deposit, a fund, a purchase — each with a target amount and date.\n\n" +
                    "Tap a goal to earmark the accounts saving for it. Progress then comes from those accounts' real balances, so it only moves when your money does."
                  }
                />
              </View>
              <Pressable onPress={() => setTab("Goals")}>
                <Text className="text-[15px] font-sans-medium text-salli-accent">See all</Text>
              </Pressable>
            </View>
            {allGoals.length === 0 ? (
              <Text className="text-[15px] text-foreground/35">No goals yet — add one in the Goals tab.</Text>
            ) : (
              <>
                <Text className="mb-3 text-[14px] text-foreground/30">
                  {completeGoals.length} of {allGoals.length} complete
                </Text>
                <View className="gap-3">
                  {(activeGoals.length > 0 ? activeGoals : completeGoals).slice(0, 3).map((goal) => {
                    const GoalIcon = GOAL_ICON[goal.kind] ?? Target;
                    const done = goal.progress >= 1;
                    return (
                      <View key={goal.id}>
                        <View className="mb-1.5 flex-row items-center gap-2">
                          <GoalIcon size={15} color={done ? colors.mutedForeground : colors.accent} strokeWidth={2} />
                          <Text
                            className={cn(
                              "flex-1 font-sans-medium text-[15px]",
                              done ? "text-foreground/40 line-through" : "text-foreground",
                            )}
                          >
                            {goal.name}
                          </Text>
                          <Text className="font-sans-semibold text-[15px] text-salli-accent">
                            {(goal.progress * 100).toFixed(0)}%
                          </Text>
                        </View>
                        <ProgressBar pct={goal.progress} />
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </Card>

          {/* TIER 4 — FI Score */}
          <Card className="p-4">
            <View className="mb-3 flex-row items-center justify-between">
              <View>
                <View className="flex-row items-center gap-1.5">
                  <Text className="font-sans-semibold text-[16px] text-foreground">Freedom Score</Text>
                  <InfoButton
                    size={14}
                    title="Freedom Score"
                    description={
                      "A 0–100 read on your overall financial health, combining your savings rate, emergency fund, debt level, and progress toward Freedom.\n\n" +
                      "It's a way to see whether things are improving over time — not a benchmark against anyone else."
                    }
                  />
                </View>
                {fiScore.data?.grade ? (
                  <Text className="mt-0.5 text-[14px] text-foreground/30">Grade {fiScore.data.grade}</Text>
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
              <View className="flex-1 rounded-card border border-foreground/[0.06] bg-foreground/[0.04] px-2.5 py-2.5">
                <Text className="mb-1.5 text-[13px] text-foreground/35">Savings Rate</Text>
                <Text className="font-sans-bold text-[20px] leading-[24px] text-foreground">
                  {fiScore.data ? formatPct(fiScore.data.savings_rate, 0) : "—"}
                </Text>
              </View>
              <View className="flex-1 rounded-card border border-foreground/[0.06] bg-foreground/[0.04] px-2.5 py-2.5">
                <Text className="mb-1.5 text-[13px] text-foreground/35">Debt-to-Asset</Text>
                <Text className="font-sans-bold text-[20px] leading-[24px] text-foreground">
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
            <View className="rounded-card border border-foreground/[0.08] bg-salli-hero p-[16px]">
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-[14px] font-sans-semibold uppercase tracking-wide text-white/50">
                  Portfolio Projection
                </Text>
                <Text className="text-[14px] text-white/30">
                  {targetAge ? `to age ${targetAge}` : `${projections.data.points.length - 1} yrs`}
                </Text>
              </View>
              <ProjectionChart projections={projections.data} />
              <View className="mt-2.5 flex-row items-center gap-3">
                {[
                  { key: "growth", c: colors.accent, l: "Growth" },
                  { key: "base", c: "rgba(255,255,255,0.4)", l: "Base" },
                  { key: "conservative", c: "rgba(255,255,255,0.2)", l: "Conservative" },
                ]
                  .filter((x) => !projections.data!.scenario_access?.locked.includes(x.key))
                  .map((x) => (
                    <View key={x.l} className="flex-row items-center gap-1.5">
                      <View style={{ width: 12, height: 2, borderRadius: 2, backgroundColor: x.c }} />
                      <Text className="text-[13px] text-white/50">{x.l}</Text>
                    </View>
                  ))}
                <Text className="flex-1 text-right text-[13px] text-white/30">- - Freedom target</Text>
              </View>
              {projections.data.scenario_access && projections.data.scenario_access.locked.length > 0 ? (
                <Pressable
                  onPress={() => router.push("/(tabs)/more/billing")}
                  className="mt-2.5 flex-row items-center gap-1.5 rounded-card bg-white/[0.06] px-3 py-2"
                >
                  <Lock size={14} color="rgba(255,255,255,0.5)" strokeWidth={2} />
                  <Text className="flex-1 text-[10.5px] text-white/50">
                    {projections.data.scenario_access.locked.map((s) => (s === "conservative" ? "Conservative" : "Growth")).join(" & ")} scenario
                    {projections.data.scenario_access.locked.length > 1 ? "s" : ""} locked · Unlock on Pro
                  </Text>
                  <ChevronRight size={14} color="rgba(255,255,255,0.4)" strokeWidth={2} />
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {!strategy.data ? (
            <Card className="items-center gap-3 p-6">
              <Text className="text-center text-[15px] text-foreground/40">
                No FIRE strategy yet — generate one from your financial profile.
              </Text>
              <ActionButton variant="accent" loading={generateStrategy.isPending} onPress={() => generateStrategy.mutate()}>
                <Sparkles size={16} color="#FFFFFF" strokeWidth={2} />
                <Text className="font-sans-semibold text-[16px] text-white">Generate strategy</Text>
              </ActionButton>
            </Card>
          ) : (
            <>
              {/* Allocation — tappable donut (slices open a detail drawer) */}
              <Card className="p-4">
                <Text className="text-[14px] font-sans-semibold uppercase tracking-wide text-foreground/30">
                  Allocation{surplus.data ? ` · Rs. ${formatLKRAbbrev(surplus.data.monthly_surplus)}/mo surplus` : ""}
                </Text>
                <View className="my-2 h-[156px] w-[156px] items-center justify-center self-center">
                  <AllocationDonut buckets={strategy.data.buckets} onSelect={setSelectedBucket} />
                  <View pointerEvents="none" style={{ position: "absolute", alignItems: "center" }}>
                    <Text className="font-sans-extrabold text-[18px] leading-5 text-foreground">
                      {surplus.data ? `Rs. ${formatLKRAbbrev(surplus.data.monthly_surplus)}` : "—"}
                    </Text>
                    <Text className="text-[13px] text-foreground/35">surplus/mo</Text>
                  </View>
                </View>
                <Text className="text-center text-[14px] text-foreground/30">Tap a slice to see how each bucket works</Text>
              </Card>

              {/* Salli AI's Strategy — collapsible. Shown whenever there's a
                  full rationale OR a locked preview (Free tier) — never just
                  vanishes for a locked user the way `ai_rationale` alone would. */}
              {strategy.data.ai_rationale || strategy.data.rationale_locked ? (
                <View className="rounded-card border border-salli-accent/20 bg-card">
                  <Pressable
                    onPress={() => setStrategyOpen((o) => !o)}
                    className="flex-row items-center gap-2 p-3.5"
                  >
                    <View className="h-[26px] w-[26px] items-center justify-center rounded-card bg-salli-accent/15">
                      <PiggyBank size={16} color={colors.accent} strokeWidth={2} />
                    </View>
                    <Text className="flex-1 font-sans-semibold text-[15px] text-foreground">Salli AI&apos;s Strategy</Text>
                    <Text className="text-[13px] capitalize text-foreground/30">
                      {strategy.data.fire_style} · v{strategy.data.version}
                    </Text>
                    {strategyOpen ? (
                      <ChevronUp size={18} color={colors.mutedForeground} strokeWidth={2} />
                    ) : (
                      <ChevronDown size={18} color={colors.mutedForeground} strokeWidth={2} />
                    )}
                  </Pressable>
                  {strategyOpen ? (
                    <View className="px-3.5 pb-3.5">
                      <View className="mb-2.5 border-t border-foreground/[0.06] pt-2.5">
                        {strategy.data.rationale_locked ? (
                          <>
                            <Text className="pt-2 text-[15px] leading-[24px] text-foreground/50">
                              {strategy.data.rationale_preview}
                            </Text>
                            <Pressable
                              onPress={() => router.push("/(tabs)/more/billing")}
                              className="mt-2.5 flex-row items-center gap-1.5 rounded-card bg-salli-accent/[0.08] px-3 py-2"
                            >
                              <Lock size={14} color={colors.accent} strokeWidth={2} />
                              <Text className="flex-1 text-[14px] font-sans-medium text-salli-accent">
                                Read the full AI rationale · Upgrade to Pro
                              </Text>
                              <ChevronRight size={14} color={colors.accent} strokeWidth={2} />
                            </Pressable>
                          </>
                        ) : (
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
                        )}
                      </View>
                      <View className="flex-row flex-wrap gap-1.5">
                        {["4% rule", `${formatPct(strategy.data.swr, 0)} SWR`, `${formatPct(strategy.data.return_base, 0)} base`].map((t) => (
                          <View key={t} className="rounded-pill bg-salli-accent/[0.12] px-2.5 py-0.5">
                            <Text className="text-[13px] font-sans-medium text-salli-accent">{t}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : null}
                </View>
              ) : null}

              <ActionButton variant="secondary" loading={generateStrategy.isPending} onPress={() => generateStrategy.mutate()}>
                Refresh strategy
              </ActionButton>
            </>
          )}
        </View>
      ) : null}

      {tab === "Mentor" ? (
        <View className="gap-3 px-4 pt-3.5">
          <Card className="p-4">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="font-sans-semibold text-[16px] text-foreground">Freedom Mentor</Text>
              {runAdvisor.isPending ? <ActivityIndicator color={colors.accent} /> : null}
            </View>

            {advisorReport.data ? (
              <>
                <Text className="mb-2.5 text-[15px] leading-5 text-foreground/50">{advisorReport.data.summary}</Text>
                {advisorReport.data.recommendations.map((rec) =>
                  rec.locked ? (
                    <View key={rec.id} className="mb-2 flex-row items-center gap-2 rounded-card border border-foreground/10 bg-muted p-3 opacity-60">
                      <Lock size={14} color={colors.mutedForeground} strokeWidth={2} />
                      <View className="flex-1">
                        <Text className="font-sans-medium text-[15px] text-foreground">{rec.title}</Text>
                        <Text className="text-[13px] capitalize text-foreground/35">{rec.category}</Text>
                      </View>
                    </View>
                  ) : (
                    <View key={rec.id} className="mb-2 rounded-card border border-foreground/10 bg-muted p-3">
                      <View className="mb-1 flex-row items-center gap-1.5">
                        <View className="rounded-badge bg-salli-accent/15 px-1.5 py-0.5">
                          <Text className="text-[12px] font-sans-semibold text-salli-accent">P{rec.priority}</Text>
                        </View>
                        <Text className="flex-1 font-sans-medium text-[15px] text-foreground">{rec.title}</Text>
                      </View>
                      <Text className="text-[14px] leading-5 text-foreground/35">{rec.rationale}</Text>
                    </View>
                  ),
                )}
                {advisorReport.data.recommendations_locked_count > 0 ? (
                  <Pressable
                    onPress={() => router.push("/(tabs)/more/billing")}
                    className="mb-1 flex-row items-center gap-1.5 rounded-card bg-salli-accent/[0.08] px-3 py-2"
                  >
                    <Text className="flex-1 text-[14px] font-sans-medium text-salli-accent">
                      Unlock {advisorReport.data.recommendations_locked_count} more recommendation
                      {advisorReport.data.recommendations_locked_count > 1 ? "s" : ""}
                    </Text>
                    <ChevronRight size={14} color={colors.accent} strokeWidth={2} />
                  </Pressable>
                ) : null}
              </>
            ) : (
              <Text className="mb-3 text-[15px] text-foreground/35">
                Run the advisor for a prioritized, engine-backed action plan.
              </Text>
            )}
            <ActionButton variant="secondary" loading={runAdvisor.isPending} onPress={() => runAdvisor.mutate()}>
              {advisorReport.data ? "Re-run Freedom Mentor" : "Run Freedom Mentor"}
            </ActionButton>
            {isQuotaError(runAdvisor.error) ? (
              <QuotaBanner className="mt-3" />
            ) : null}
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
              <View className="rounded-card border border-foreground/[0.08] bg-salli-hero p-[16px]">
                <Text className="mb-1.5 text-[14px] font-sans-semibold uppercase tracking-wide text-white/50">
                  Goals Progress
                </Text>
                <View className="mb-3 flex-row items-baseline gap-1.5">
                  <Text className="font-sans-extrabold text-[40px] leading-none tracking-tighter text-white">
                    {complete.length}
                  </Text>
                  <Text className="text-[16px] font-sans-medium text-white/40">of {all.length} complete</Text>
                </View>
                <View className="flex-row gap-1.5">
                  <View className="flex-1 rounded-card bg-white/[0.06] px-2.5 py-2">
                    <Text className="mb-1 text-[13px] text-white/35">In Progress</Text>
                    <Text className="font-sans-bold text-[17px] leading-[20px] text-salli-accent">{active.length} active</Text>
                  </View>
                  <View className="flex-1 rounded-card bg-white/[0.06] px-2.5 py-2">
                    <Text className="mb-1 text-[13px] text-white/35">Saved Toward</Text>
                    <Text className="font-sans-bold text-[17px] leading-[20px] text-white">Rs. {formatLKRAbbrev(savedToward)}</Text>
                  </View>
                </View>
              </View>

              <Text className="mb-0.5 mt-1.5 pl-0.5 text-[14px] font-sans-semibold uppercase tracking-wide text-foreground/30">
                Your Goals
              </Text>

              {all.length === 0 ? (
                <Card className="items-center p-6">
                  <Text className="text-[15px] text-foreground/35">No goals yet — add your first one.</Text>
                </Card>
              ) : (
                all.map((goal) => {
                  const done = goal.progress >= 1;
                  const Icon = GOAL_ICON[goal.kind] ?? Target;
                  const year = goal.target_date ? new Date(goal.target_date).getFullYear() : null;
                  return (
                    <AnimatedPressable key={goal.id} onPress={() => setDetailGoal(goal)}>
                    <Card className={cn("p-3.5", done && "opacity-60")}>
                      <View className={cn("flex-row items-start justify-between", !done && "mb-2")}>
                        <View className="flex-1 flex-row items-center gap-2.5">
                          <View
                            className={cn(
                              "h-[34px] w-[34px] items-center justify-center rounded-card",
                              done ? "bg-salli-accent/[0.12]" : "border border-salli-accent/20 bg-salli-accent/[0.12]",
                            )}
                          >
                            {done ? (
                              <Check size={17} color={colors.accent} strokeWidth={2.5} />
                            ) : (
                              <Icon size={17} color={colors.accent} strokeWidth={2} />
                            )}
                          </View>
                          <View className="flex-1">
                            <Text className={cn("font-sans-semibold text-[15px] text-foreground", done && "line-through")}>
                              {goal.name}
                            </Text>
                            <Text className="mt-0.5 text-[14px] text-foreground/30">
                              {done ? `Rs. ${formatLKRAbbrev(goal.current_amount)} · Completed` : year ? `Target ${year}` : "No target date"}
                            </Text>
                          </View>
                        </View>
                        {/* Edit and delete live in the detail drawer, which is
                            reachable from every goal — the delete button used to
                            sit inside this `!done` branch, so a completed goal
                            could never be removed. */}
                        {done ? (
                          <View className="rounded-badge bg-salli-accent/15 px-2 py-0.5">
                            <Text className="text-[13px] font-sans-semibold text-salli-accent">Done</Text>
                          </View>
                        ) : (
                          <Text className="font-sans-bold text-[15px] text-salli-accent">{(goal.progress * 100).toFixed(0)}%</Text>
                        )}
                      </View>
                      {!done ? (
                        <>
                          <ProgressBar pct={goal.progress} />
                          <View className="mt-1.5 flex-row justify-between">
                            <Text className="text-[14px] text-foreground/40">Rs. {formatLKRAbbrev(goal.current_amount)} saved</Text>
                            <Text className="text-[14px] text-foreground/40">of Rs. {formatLKRAbbrev(goal.target_amount)}</Text>
                          </View>
                          {Number(goal.allocated_amount) === 0 ? (
                            <Text className="mt-1.5 text-[14px] text-foreground/30">
                              Tap to choose which account is saving for this.
                            </Text>
                          ) : Number(goal.shortfall) > 0 ? (
                            <Text className="mt-1.5 text-[14px] text-[#B45309]">
                              Rs. {formatLKRAbbrev(goal.shortfall)} short of what you earmarked.
                            </Text>
                          ) : null}
                        </>
                      ) : null}
                    </Card>
                    </AnimatedPressable>
                  );
                })
              )}

              <Pressable
                onPress={() => setAddOpen(true)}
                className="flex-row items-center gap-2.5 rounded-card border border-dashed border-foreground/[0.12] bg-card p-3.5"
              >
                <View className="h-[34px] w-[34px] items-center justify-center rounded-card bg-foreground/[0.04]">
                  <Plus size={17} color={colors.mutedForeground} strokeWidth={2.5} />
                </View>
                <Text className="font-sans-medium text-[15px] text-foreground/40">Add a goal</Text>
              </Pressable>
            </View>
          );
        })()
      ) : null}

      <Text className="mt-4 px-8 text-center text-[14px] leading-5 text-foreground/25">
        Planning estimates only · Not financial advice · Numbers from deterministic engine
      </Text>

      {/* Keyed on the goal so switching goals remounts the form rather than
          re-seeding it in an effect. */}
      <GoalDetailDrawer
        key={detailGoal?.id}
        goal={detailGoal}
        visible={detailGoal !== null}
        onClose={() => setDetailGoal(null)}
      />

      <Drawer
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add a goal"
        footer={
          <ActionButton loading={createGoal.isPending} disabled={!newName.trim() || !newAmount} onPress={submitGoal}>
            Add goal
          </ActionButton>
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
                    <View className="flex-1 rounded-card border border-foreground/[0.08] bg-card p-3">
                      <Text className="mb-1 text-[13px] font-sans-medium uppercase tracking-wide text-foreground/35">Allocation</Text>
                      <Text className="font-sans-extrabold text-[26px] leading-6 text-foreground">{formatPct(b.target_pct, 0)}</Text>
                    </View>
                    <View className="flex-1 rounded-card border border-foreground/[0.08] bg-card p-3">
                      <Text className="mb-1 text-[13px] font-sans-medium uppercase tracking-wide text-foreground/35">Routed / month</Text>
                      <Text className="font-sans-extrabold text-[26px] leading-6 text-foreground">
                        {route !== null ? `Rs. ${formatLKRAbbrev(route)}` : "—"}
                      </Text>
                    </View>
                  </View>
                  <Text className="mb-1 text-[13px] font-sans-medium uppercase tracking-wide text-foreground/35">How it works</Text>
                  <Text className="text-[15px] leading-5 text-foreground/60">{b.description}</Text>
                </>
              );
            })()
          : null}
      </Drawer>
    </PageShell>
  );
}
