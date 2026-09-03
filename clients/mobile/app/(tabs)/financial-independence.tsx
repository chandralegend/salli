import { useRouter } from "expo-router";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Lock,
  PiggyBank,
  Plus,
  Sparkles,
  Target,
} from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import Markdown from "react-native-markdown-display";
import Svg, { Circle, Line, Path, Polyline } from "react-native-svg";

import { GoalDetailDrawer } from "@/components/fi/GoalDetailDrawer";
import { SpendingBreakdown } from "@/components/fi/SpendingBreakdown";
import { TourTarget } from "@/components/tour/TourTarget";
import { ActionButton } from "@/components/ui/action-button";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { Card } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { InfoButton } from "@/components/ui/info-button";
import { NavSalli } from "@/components/ui/nav-icons";
import { PageShell } from "@/components/ui/page-shell";
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
  type FiGoal,
  type FiProjections,
} from "@/hooks/useFi";
import { useModeSwitch } from "@/hooks/useModeSwitch";
import { formatLKR, formatLKRAbbrev, formatPct } from "@/lib/format";
import { useSalliStore } from "@/lib/store";
import { useHardShadow, useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

/**
 * No "Mentor" tab any more.
 *
 * It ran the wealth advisor and rendered its report in a tab of its own — a
 * second, separate AI surface sitting three taps from the first one, with its
 * own button, its own quota banner and its own way of presenting an answer.
 * The agent has had `run_wealth_advisor` and `get_latest_advisor_report` as
 * tools all along, so Salli could always do this; the tab was a parallel route
 * to the same engine. Asking Salli directly also means you can follow up,
 * which a static report never allowed.
 */
const TABS = ["Overview", "Strategy", "Goals"] as const;

/** Distinct-but-on-brand colours for allocation pie segments. */
const PIE_COLORS = ["#16130f", "#b7b1a5", "#4b463d", "#e4e0d6", "#6b6459", "#2c2822", "#8c877c"];

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

/** Conic-style progress ring (mockup's FI Score badge): a thin accent arc that
 * fills to `score`%, with the integer score centered in the hole. */

export default function FinancialIndependenceScreen() {
  const colors = useThemeColors();
  const shadow = useHardShadow();
  const askSalli = useSalliStore((st) => st.askSalli);
  const { enterBuddy } = useModeSwitch();
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
              <Text style={{ letterSpacing: -0.8 }} className="flex-1 font-sans-extrabold text-[27px] text-foreground">
                Freedom
              </Text>
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
        <View className="px-4 pt-3">
          {/* The score as a sentence, leading the screen.
              It used to lead with the Freedom Number in an inverted hero card
              and a pair of 32px stat tiles — three big figures competing before
              you learned the one thing this screen is about. The score is the
              summary; the number it implies comes after it. */}
          <View className="px-1">
            <Text className="font-sans text-[29px] leading-[34px] tracking-tight text-foreground">
              You&rsquo;re{" "}
              <Text className="font-sans-extrabold">
                {fiScore.data ? `${Number(fiScore.data.overall_score).toFixed(0)}/100` : "—"}
              </Text>{" "}
              of the way there.
            </Text>
            <Text className="mt-2 text-[16px] text-muted-foreground">
              {fiScore.data?.grade ? `${fiScore.data.grade}. ` : ""}
              {projections.data ? `About ${yearsToFi.toFixed(0)} years to go.` : ""}
            </Text>
            <View className="mt-4 h-[11px] overflow-hidden rounded-pill bg-foreground/20">
              <View
                className="h-full rounded-pill bg-salli-accent"
                style={{
                  width: `${Math.min(100, Math.max(0, Number(fiScore.data?.overall_score ?? 0)))}%`,
                }}
              />
            </View>
          </View>

          <View className="my-4 h-px bg-foreground/15" />

          {/* The score's own components, which this screen has never shown.
              `components` has been on the payload all along — label, score and
              weight per driver — and without it the number was unexplained:
              you could see 58/100 and nothing about what would move it. */}
          {fiScore.data?.components?.length ? (
            <>
              <Text className="mb-3 px-1 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                What moves the score
              </Text>
              <View className="gap-3.5">
                {fiScore.data.components.map((c) => (
                  <View
                    key={c.label}
                    className="flex-row items-center gap-3 rounded-card border-2 border-foreground bg-card px-[15px] py-3.5"
                  >
                    <Text numberOfLines={1} className="flex-1 font-sans-bold text-[16px] text-foreground">
                      {c.label}
                    </Text>
                    <View className="h-[11px] w-[96px] overflow-hidden rounded-pill bg-foreground/20">
                      <View
                        className="h-full rounded-pill bg-salli-accent"
                        style={{ width: `${Math.min(100, Math.max(0, Number(c.score)))}%` }}
                      />
                    </View>
                    <Text className="w-[34px] text-right font-sans-extrabold text-[15px] text-foreground">
                      {Number(c.score).toFixed(0)}
                    </Text>
                  </View>
                ))}
              </View>
              <View className="my-4 h-px bg-foreground/15" />
            </>
          ) : null}

          {/* The Freedom Number, now a sentence rather than the loudest block
              on the screen. It is a target, not a status. */}
          <AnimatedPressable onPress={() => setTab("Strategy")} className="px-1">
            <Text className="font-sans text-[20px] leading-[26px] tracking-tight text-foreground">
              You&rsquo;d need{" "}
              <Text className="font-sans-extrabold">
                Rs. {projections.data ? formatLKRAbbrev(projections.data.fi_number) : "—"}
              </Text>{" "}
              invested for returns alone to cover your spending.
            </Text>
            <Text className="mt-2 text-[14px] text-muted-foreground">
              At a 4% withdrawal rate
              {targetAge ? ` · target age ${targetAge}` : ""}
              {projections.data ? ` · on track for ${freedomYear}` : ""}
            </Text>
          </AnimatedPressable>

          <View className="my-4 h-px bg-foreground/15" />

          {/* Where the money actually goes — by category tag, and split needs
              vs wants. Sits above Goals because it answers the question people
              open this screen with. */}
          <SpendingBreakdown surplus={surplus.data} />

          {/* Goals, to the mockup: a mono section label with the action on the
              right, then a card per goal. It used to be a single card holding a
              "N of M complete" line and three compact rows with no amounts —
              the percentage without the figures behind it, which is the half
              people cannot act on. Same /fi/goals data the Goals tab renders in
              full; nothing is invented client-side. */}
          <View className="my-4 h-px bg-foreground/15" />

          <View className="mb-3 flex-row items-baseline justify-between">
            <Text className="px-1 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
              Goals
            </Text>
            <Pressable onPress={() => setTab("Goals")} hitSlop={8}>
              <Text className="text-[13.5px] text-muted-foreground underline">
                {allGoals.length === 0 ? "Add a goal" : "See all"}
              </Text>
            </Pressable>
          </View>
          {allGoals.length === 0 ? (
            <Text className="px-1 text-[16px] text-muted-foreground">
              Nothing saved toward yet. A goal earns its progress from the accounts
              you earmark for it.
            </Text>
          ) : (
            <View className="gap-3.5">
              {(activeGoals.length > 0 ? activeGoals : completeGoals).slice(0, 3).map((goal) => {
                const done = goal.progress >= 1;
                return (
                  <AnimatedPressable
                    key={goal.id}
                    onPress={() => setDetailGoal(goal)}
                    press="sink"
                    className="rounded-card border-2 border-foreground bg-card p-[15px]"
                    style={shadow}
                  >
                    <View className="flex-row items-baseline justify-between gap-2.5">
                      <Text
                        numberOfLines={1}
                        className={cn(
                          "flex-1 font-sans-bold text-[17px]",
                          done ? "text-muted-foreground line-through" : "text-foreground",
                        )}
                      >
                        {goal.name}
                      </Text>
                      <Text className="shrink-0 font-sans-extrabold text-[15px] text-foreground">
                        {done ? "Done" : `${(goal.progress * 100).toFixed(0)}%`}
                      </Text>
                    </View>
                    <View className="mt-3 h-[11px] overflow-hidden rounded-pill bg-foreground/20">
                      <View
                        className="h-full rounded-pill bg-salli-accent"
                        style={{ width: `${Math.min(100, Math.max(0, goal.progress * 100))}%` }}
                      />
                    </View>
                    {/* The amounts, which the old rows omitted entirely, plus
                        the priority — which only means anything once two goals
                        share an account and one has to give way. */}
                    <Text className="mt-2.5 text-[13.5px] text-muted-foreground">
                      Rs. {formatLKRAbbrev(goal.current_amount)} of Rs.{" "}
                      {formatLKRAbbrev(goal.target_amount)}
                      {goal.priority ? ` · priority ${goal.priority}` : ""}
                    </Text>
                    {Number(goal.allocated_amount) === 0 ? (
                      <Text className="mt-1.5 text-[13.5px] text-salli-accent">
                        No accounts earmarked yet — tap to pick some.
                      </Text>
                    ) : null}
                  </AnimatedPressable>
                );
              })}
            </View>
          )}

          <View className="my-4 h-px bg-foreground/15" />

          {/* Where the Mentor tab used to be. Salli has the advisor as a tool,
              so this is the same engine reached by asking rather than by
              navigating — and a conversation you can follow up on rather than
              a report you can only read. */}
          <AnimatedPressable
            onPress={() => {
              askSalli(
                "Look at my Freedom position and give me a prioritised plan. Run the wealth advisor if you need a fresh one.",
              );
              enterBuddy();
            }}
            press="sink"
            haptic="light"
            className="h-[52px] flex-row items-center justify-center gap-2 rounded-card border-2 border-foreground bg-salli-ai"
            style={shadow}
          >
            <NavSalli size={19} color="#000000" strokeWidth={2} />
            <Text className="font-sans-bold text-[17px]" style={{ color: "#000000" }}>
              Ask Salli for a plan
            </Text>
          </AnimatedPressable>

        </View>
      ) : null}

      {tab === "Strategy" ? (
        <View className="gap-3 px-4 pt-3.5">
          {/* Portfolio projection chart */}
          {projections.data ? (
            <View className="rounded-card border border-foreground/[0.08] bg-salli-hero p-[16px]">
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-[11px] font-mono uppercase tracking-widest text-white/50">
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
              <Text className="text-center text-[15px] text-muted-foreground">
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
                <Text className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                  Allocation{surplus.data ? ` · Rs. ${formatLKRAbbrev(surplus.data.monthly_surplus)}/mo surplus` : ""}
                </Text>
                <View className="my-2 h-[156px] w-[156px] items-center justify-center self-center">
                  <AllocationDonut buckets={strategy.data.buckets} onSelect={setSelectedBucket} />
                  <View pointerEvents="none" style={{ position: "absolute", alignItems: "center" }}>
                    <Text className="font-sans-extrabold text-[18px] leading-5 text-foreground">
                      {surplus.data ? `Rs. ${formatLKRAbbrev(surplus.data.monthly_surplus)}` : "—"}
                    </Text>
                    <Text className="text-[13px] text-muted-foreground">surplus/mo</Text>
                  </View>
                </View>
                <Text className="text-center text-[14px] text-muted-foreground">Tap a slice to see how each bucket works</Text>
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
                    <Text className="text-[13px] capitalize text-muted-foreground">
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

      {tab === "Goals" ? (
        (() => {
          const all = goals.data ?? [];
          const complete = all.filter((g) => g.progress >= 1);
          const active = all.filter((g) => g.progress < 1);
          const savedToward = all.reduce((s, g) => s + Number(g.current_amount), 0);
          return (
            <View className="px-4 pt-3.5">
              {/* A sentence, not an inverted hero with a 40px count. The block
                  it replaces led a list of goals with a tally of the same list
                  and two nested stat cells — three restatements before the
                  goals themselves. */}
              <Text className="px-1 font-sans text-[20px] leading-[26px] tracking-tight text-foreground">
                {all.length === 0
                  ? "No goals yet."
                  : complete.length === all.length
                    ? `All ${all.length} of your goals are done.`
                    : `You've finished ${complete.length} of ${all.length} goals.`}
              </Text>
              {all.length > 0 ? (
                <Text className="mt-2 px-1 text-[16px] text-muted-foreground">
                  Rs. {formatLKRAbbrev(savedToward)} saved toward them so far.
                </Text>
              ) : null}

              <View className="my-4 h-px bg-foreground/15" />

              {all.length === 0 ? (
                <Text className="px-1 text-[16px] text-muted-foreground">
                  A goal earns its progress from the accounts you earmark for it, so
                  it only moves when your money does.
                </Text>
              ) : (
                <View className="gap-3.5">
                  {all.map((goal) => {
                    const done = goal.progress >= 1;
                    const year = goal.target_date ? new Date(goal.target_date).getFullYear() : null;
                    return (
                      <AnimatedPressable
                        key={goal.id}
                        onPress={() => setDetailGoal(goal)}
                        press="sink"
                        className="rounded-card border-2 border-foreground bg-card p-[15px]"
                        style={shadow}
                      >
                        <View className="flex-row items-baseline justify-between gap-2.5">
                          <Text
                            numberOfLines={1}
                            className={cn(
                              "flex-1 font-sans-bold text-[17px]",
                              done ? "text-muted-foreground line-through" : "text-foreground",
                            )}
                          >
                            {goal.name}
                          </Text>
                          <Text className="shrink-0 font-sans-extrabold text-[15px] text-foreground">
                            {done ? "Done" : `${(goal.progress * 100).toFixed(0)}%`}
                          </Text>
                        </View>
                        {/* The bar and the amounts show for completed goals too.
                            They used to be inside a `!done` branch, so finishing
                            a goal erased the figures you finished it with. */}
                        <View className="mt-3 h-[11px] overflow-hidden rounded-pill bg-foreground/20">
                          <View
                            className="h-full rounded-pill bg-salli-accent"
                            style={{ width: `${Math.min(100, Math.max(0, goal.progress * 100))}%` }}
                          />
                        </View>
                        <Text className="mt-2.5 text-[13.5px] text-muted-foreground">
                          Rs. {formatLKRAbbrev(goal.current_amount)} of Rs.{" "}
                          {formatLKRAbbrev(goal.target_amount)}
                          {goal.priority ? ` · priority ${goal.priority}` : ""}
                          {year ? ` · by ${year}` : ""}
                        </Text>
                        {!done && Number(goal.allocated_amount) === 0 ? (
                          <Text className="mt-1.5 text-[13.5px] text-salli-accent">
                            No accounts earmarked yet — tap to pick some.
                          </Text>
                        ) : !done && Number(goal.shortfall) > 0 ? (
                          <Text className="mt-1.5 text-[13.5px] text-salli-accent">
                            Rs. {formatLKRAbbrev(goal.shortfall)} short of what you earmarked.
                          </Text>
                        ) : null}
                      </AnimatedPressable>
                    );
                  })}
                </View>
              )}

              <View className="h-3.5" />

              {/* Dashed rather than solid: it is a slot for a goal that does
                  not exist yet, not a goal. */}
              <Pressable
                onPress={() => setAddOpen(true)}
                className="h-[52px] flex-row items-center justify-center gap-2 rounded-card border-2 border-dashed border-foreground/50 bg-card"
              >
                <Plus size={19} color={colors.accent} strokeWidth={2.4} />
                <Text className="font-sans-bold text-[17px] text-foreground">Add a goal</Text>
              </Pressable>
            </View>
          );
        })()
      ) : null}

      <Text className="mt-4 px-8 text-center text-[14px] leading-5 text-muted-foreground">
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
        <View className="gap-3.5">
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
                    <View className="flex-1 rounded-card border-2 border-foreground bg-card p-3">
                      <Text className="mb-1 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">Allocation</Text>
                      <Text className="font-sans-extrabold text-[26px] leading-6 text-foreground">{formatPct(b.target_pct, 0)}</Text>
                    </View>
                    <View className="flex-1 rounded-card border-2 border-foreground bg-card p-3">
                      <Text className="mb-1 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">Routed / month</Text>
                      <Text className="font-sans-extrabold text-[26px] leading-6 text-foreground">
                        {route !== null ? `Rs. ${formatLKRAbbrev(route)}` : "—"}
                      </Text>
                    </View>
                  </View>
                  <Text className="mb-1 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">How it works</Text>
                  <Text className="text-[15px] leading-5 text-foreground/60">{b.description}</Text>
                </>
              );
            })()
          : null}
      </Drawer>
    </PageShell>
  );
}
