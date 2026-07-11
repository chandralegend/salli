import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Modal, ScrollView, useWindowDimensions } from "react-native";
import {
  Trash2,
  Sparkles,
  Check,
  X,
  Clock,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react-native";
import Markdown from "react-native-markdown-display";
import { LineChart } from "react-native-gifted-charts";
import { ScreenShell, PageHeader, CardContainer, SectionTitle } from "@/components/ui/page-shell";
import { BentoTile } from "@/components/ui/bento-tile";
import { PillButton } from "@/components/ui/pill-button";
import { TextField } from "@/components/ui/text-field";
import { AvatarMoreButton } from "@/components/layout/AvatarMoreButton";
import { useThemeColors, useThemeVars } from "@/lib/theme";
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
  type AllocationBucket,
  type ProjectionsData,
  type SurplusBreakdown,
} from "@/hooks/useFi";

// ── Formatters ────────────────────────────────────────────────────────────────

function lkr(v: string | number): string {
  const n = typeof v === "string" ? Number(v) : v;
  if (!isFinite(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString("en-LK", { maximumFractionDigits: 0 });
}

function pct(v: string | number, dp = 1): string {
  const n = (typeof v === "string" ? Number(v) : v) * 100;
  return `${n.toFixed(dp)}%`;
}

function fmtCompact(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toFixed(0);
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function FinancialIndependenceScreen() {
  const theme = useThemeColors();
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
  const [strategyOpen, setStrategyOpen] = useState(false);
  const [advisorError, setAdvisorError] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview" | "strategy" | "goals">("overview");
  const { width: windowWidth } = useWindowDimensions();
  // ScreenShell padding (20×2) + CardContainer padding (20×2)
  const chartWidth = windowWidth - 80;

  const s = score.data;
  const strat = strategy.data;
  const proj = projections.data;
  const surplusData = surplus.data;

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

  async function handleRun() {
    setAdvisorError(null);
    try {
      await runAdvisor.mutateAsync();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("402") || msg.toLowerCase().includes("quota")) {
        setAdvisorError("You've used all your advisor runs this month — upgrade for more.");
      } else {
        setAdvisorError("Couldn't run the advisor. Try again.");
      }
    }
  }

  return (
    <ScreenShell>
      <PageHeader
        title="Financial Independence"
        titleSize={22}
        subtitle={
          strat
            ? `${strat.fire_style.charAt(0).toUpperCase() + strat.fire_style.slice(1)} FIRE · v${strat.version} · SWR ${(strat.swr * 100).toFixed(1)}%`
            : "FIRE planning · Sri Lanka · LKR"
        }
        actions={
          <>
            <Pressable
              onPress={() => recompute.mutate()}
              disabled={recompute.isPending}
              className="w-10 h-10 rounded-full items-center justify-center active:opacity-80"
              style={{ backgroundColor: theme.muted, opacity: recompute.isPending ? 0.5 : 1 }}
            >
              {recompute.isPending ? (
                <ActivityIndicator size="small" color={theme.foreground} />
              ) : (
                <RefreshCw color={theme.foreground} size={17} />
              )}
            </Pressable>
            <AvatarMoreButton />
          </>
        }
      />

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <View className="flex-row bg-muted rounded-full p-1 gap-0.5 mb-4">
        <FiTabButton label="Overview" active={tab === "overview"} onPress={() => setTab("overview")} />
        <FiTabButton label="Strategy" active={tab === "strategy"} onPress={() => setTab("strategy")} />
        <FiTabButton label="Goals" active={tab === "goals"} onPress={() => setTab("goals")} />
      </View>

      <View className="gap-3">
      {tab === "overview" && (
        <>
        {/* ── Overview ─────────────────────────────────────────────────── */}
        <SectionTitle>Overview</SectionTitle>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <BentoTile
              variant="card"
              label="FI Number"
              sub={strat ? `${(strat.swr * 100).toFixed(1)}% safe withdrawal rate` : "25× annual expenses"}
              value={fiNumber ? lkr(fiNumber) : "—"}
            />
          </View>
          <View className="flex-1">
            <BentoTile
              variant="mint"
              label="Net Worth"
              sub={`${(progressToFi * 100).toFixed(1)}% of FI number`}
              value={lkr(netWorth)}
              badge={s ? `+${pct(s.savings_rate, 1)}` : undefined}
              badgeVariant="neutral"
            />
          </View>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <BentoTile
              variant="dark"
              label="Years to FIRE"
              sub={`Base scenario · ${strat ? `${(strat.return_base * 100).toFixed(0)}% return` : "9% return"}`}
              value={yearsToFire != null ? String(yearsToFire) : "—"}
            />
          </View>
          <View className="flex-1">
            <BentoTile
              variant="teal"
              label="Savings Rate"
              sub="Monthly surplus ratio"
              value={savingsRate.toFixed(1)}
              suffix="%"
              badge={
                savingsRate >= 40 ? "↑ above 40% target" : savingsRate >= 20 ? "→ building" : "↓ below target"
              }
              badgeVariant={savingsRate >= 40 ? "green" : savingsRate >= 20 ? "amber" : "red"}
            />
          </View>
        </View>

        {/* ── FI Score ─────────────────────────────────────────────────── */}
        <SectionTitle>FI Score</SectionTitle>
        <View className="rounded-card p-5" style={{ backgroundColor: "#010001" }}>
          {score.isLoading || !s ? (
            <View className="py-8 items-center">
              <ActivityIndicator color="#E8FC85" />
            </View>
          ) : (
            <>
              <View className="flex-row items-baseline gap-1.5 mb-1">
                <Text style={{ fontSize: 44, fontWeight: "900", letterSpacing: -1.5, color: "#E8FC85", lineHeight: 48 }}>
                  {Number(s.overall_score).toFixed(0)}
                </Text>
                <Text style={{ fontSize: 15, fontWeight: "600", color: "rgba(255,255,255,0.25)" }}>/100</Text>
              </View>
              <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", marginBottom: 16 }}>
                {s.grade} · {strat?.fire_style ?? "Standard"} FIRE
              </Text>
              <View className="gap-2.5">
                {s.components.slice(0, 5).map((c) => {
                  const v = Number(c.score);
                  const amber = v < 50;
                  return (
                    <View key={c.key} className="flex-row items-center justify-between gap-2">
                      <Text style={{ fontSize: 11.5, color: "rgba(255,255,255,0.45)", width: 92 }} numberOfLines={1}>
                        {c.label}
                      </Text>
                      <View style={{ flex: 1, height: 3, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 999, overflow: "hidden" }}>
                        <View style={{ width: `${v}%`, height: "100%", backgroundColor: amber ? "#F59E0B" : "#E8FC85", borderRadius: 999 }} />
                      </View>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: amber ? "#F59E0B" : "rgba(255,255,255,0.5)", width: 22, textAlign: "right" }}>
                        {v.toFixed(0)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </View>
        </>
      )}

      {tab === "strategy" && (
        <>
        {/* ── Portfolio Projection ─────────────────────────────────────── */}
        <SectionTitle>Portfolio Projection</SectionTitle>
        <CardContainer>
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-foreground text-[14px]" style={{ fontFamily: "DMSans_700Bold" }}>
              Portfolio Projection
            </Text>
          </View>
          <Text className="text-muted-foreground text-[11.5px] mb-3">
            Conservative · Base · Growth scenarios
          </Text>
          <View className="flex-row gap-4 mb-3">
            <Legend color="#3B82F6" label="Conservative" />
            <Legend color="#10B981" label="Base" />
            <Legend color="#F59E0B" label="Growth" />
          </View>
          {projections.isLoading || !proj ? (
            <View className="h-48 bg-muted rounded-xl items-center justify-center">
              <ActivityIndicator color={theme.mutedForeground} />
            </View>
          ) : (
            <ProjectionChart data={proj} width={chartWidth} />
          )}
        </CardContainer>

        {/* ── Allocation Buckets ───────────────────────────────────────── */}
        <SectionTitle>Allocation Buckets</SectionTitle>
        {strategy.isLoading ? (
          <View className="h-36 bg-muted rounded-xl" />
        ) : (
          <AllocationBuckets buckets={strat?.buckets ?? []} surplus={surplusData} />
        )}

        {/* ── AI Strategy ──────────────────────────────────────────────── */}
        <SectionTitle>AI Strategy</SectionTitle>
        <View className="bg-card rounded-card overflow-hidden">
          <Pressable
            className="flex-row items-center justify-between px-5 py-4"
            onPress={() => setStrategyOpen((p) => !p)}
          >
            <View className="flex-1 pr-2">
              <View className="flex-row items-center gap-1.5 flex-wrap mb-1">
                <Text className="text-foreground text-[14px]" style={{ fontFamily: "DMSans_700Bold" }}>
                  AI Strategy
                </Text>
                {strat && (
                  <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: "#D5E9EA" }}>
                    <Text style={{ fontSize: 10.5, fontWeight: "700", color: "#7DA6A9" }}>
                      {strat.fire_style.charAt(0).toUpperCase() + strat.fire_style.slice(1)} FIRE
                    </Text>
                  </View>
                )}
                {strat && (
                  <View className="rounded-full px-2 py-0.5 bg-muted">
                    <Text className="text-[10.5px] font-semibold text-muted-foreground">v{strat.version}</Text>
                  </View>
                )}
              </View>
              {strat && (
                <Text className="text-muted-foreground text-[11.5px]">
                  {stratDate} · SWR {(strat.swr * 100).toFixed(1)}%{strat.target_age ? ` · Target age ${strat.target_age}` : ""}
                </Text>
              )}
            </View>
            {strategyOpen ? (
              <ChevronUp size={16} color={theme.mutedForeground} />
            ) : (
              <ChevronDown size={16} color={theme.mutedForeground} />
            )}
          </Pressable>

          {strategyOpen && strat && (
            <View className="px-5 pb-5 border-t border-border pt-4">
              <View className="mb-3">
                <Markdown
                  style={{
                    body: { color: theme.foreground, fontSize: 13, lineHeight: 20, opacity: 0.85 },
                    heading1: { color: theme.foreground, fontSize: 16, fontWeight: "700" as const, marginTop: 8, marginBottom: 6 },
                    heading2: { color: theme.foreground, fontSize: 14, fontWeight: "700" as const, marginTop: 8, marginBottom: 6 },
                    heading3: { color: theme.foreground, fontSize: 13, fontWeight: "700" as const, marginTop: 6, marginBottom: 4 },
                    strong: { color: theme.foreground, fontWeight: "700" as const },
                    bullet_list: { marginBottom: 6 },
                    ordered_list: { marginBottom: 6 },
                  }}
                >
                  {strat.ai_rationale}
                </Markdown>
              </View>
              <View className="flex-row gap-1.5 flex-wrap mb-4">
                {strat.theories_applied.map((t) => (
                  <View key={t} className="rounded-full px-2.5 py-1 bg-muted">
                    <Text className="text-[11px] font-bold text-foreground">{t}</Text>
                  </View>
                ))}
              </View>
              <View className="flex-row gap-2.5">
                <View className="flex-1 rounded-2xl p-3.5" style={{ backgroundColor: "#A5FFB9" }}>
                  <Text style={{ fontSize: 9.5, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, color: "rgba(0,0,0,0.4)", marginBottom: 5 }}>
                    Conservative
                  </Text>
                  <Text style={{ fontSize: 20, fontWeight: "900", letterSpacing: -0.6, color: "#010001" }}>
                    {(strat.return_conservative * 100).toFixed(1)}%
                  </Text>
                </View>
                <View className="flex-1 rounded-2xl p-3.5" style={{ backgroundColor: "#E8FC85" }}>
                  <Text style={{ fontSize: 9.5, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, color: "rgba(0,0,0,0.4)", marginBottom: 5 }}>
                    Base
                  </Text>
                  <Text style={{ fontSize: 20, fontWeight: "900", letterSpacing: -0.6, color: "#010001" }}>
                    {(strat.return_base * 100).toFixed(1)}%
                  </Text>
                </View>
                <View className="flex-1 rounded-2xl p-3.5" style={{ backgroundColor: "#010001" }}>
                  <Text style={{ fontSize: 9.5, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, color: "rgba(255,255,255,0.35)", marginBottom: 5 }}>
                    Growth
                  </Text>
                  <Text style={{ fontSize: 20, fontWeight: "900", letterSpacing: -0.6, color: "#E8FC85" }}>
                    {(strat.return_growth * 100).toFixed(1)}%
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
        </>
      )}

      {tab === "goals" && (
        <>
        {/* ── Goals ────────────────────────────────────────────────────── */}
        <SectionTitle>Goals</SectionTitle>
        <CardContainer>
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-foreground text-[14px]" style={{ fontFamily: "DMSans_700Bold" }}>
              Goals
            </Text>
            <PillButton variant="secondary" onPress={() => setAddOpen(true)}>
              + Add
            </PillButton>
          </View>
          <View className="gap-2">
            {goals.isLoading ? (
              <View className="h-16 bg-muted rounded-xl" />
            ) : (goals.data ?? []).length === 0 ? (
              <Text className="text-muted-foreground text-[13px] text-center py-4">No goals yet.</Text>
            ) : (
              goals.data!.map((g) => (
                <GoalRow key={g.id} goal={g} onDelete={() => deleteGoal.mutate(g.id)} />
              ))
            )}
          </View>
        </CardContainer>

        {/* ── FI Mentor ────────────────────────────────────────────────── */}
        <SectionTitle>FI Mentor</SectionTitle>
        <View className="rounded-card p-5" style={{ backgroundColor: "#010001" }}>
          <View className="flex-row items-center justify-between mb-3.5">
            <Text style={{ fontSize: 10.5, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>
              FI Mentor
            </Text>
            <View className="flex-row items-center gap-2">
              {advisory.data?.created_at && (
                <View className="flex-row items-center gap-1">
                  <Clock size={11} color="rgba(255,255,255,0.3)" />
                  <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                    {new Date(advisory.data.created_at).toLocaleDateString("en-LK", { month: "short", day: "numeric" })}
                  </Text>
                </View>
              )}
              <Pressable
                onPress={handleRun}
                disabled={runAdvisor.isPending}
                className="flex-row items-center gap-1 rounded-full px-3 py-1.5"
                style={{ backgroundColor: "rgba(255,255,255,0.1)", opacity: runAdvisor.isPending ? 0.6 : 1 }}
              >
                {runAdvisor.isPending ? (
                  <ActivityIndicator size="small" color="#E8FC85" />
                ) : (
                  <Sparkles size={12} color="#E8FC85" />
                )}
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#E8FC85" }}>
                  {runAdvisor.isPending ? "Running…" : "Run"}
                </Text>
              </Pressable>
            </View>
          </View>

          {advisorError && (
            <Text style={{ fontSize: 11.5, color: "#F87171", marginBottom: 10 }}>{advisorError}</Text>
          )}

          <View className="gap-2">
            {advisory.isLoading ? (
              <View className="h-16 rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.05)" }} />
            ) : !advisory.data?.id ? (
              <View className="py-6 items-center">
                <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", textAlign: "center", lineHeight: 18 }}>
                  {strat
                    ? `Your FI Mentor has access to your ${strat.fire_style.toUpperCase()} strategy. Tap Run for personalised guidance.`
                    : "Generate your FIRE strategy first, then run a mentoring session."}
                </Text>
              </View>
            ) : (
              <>
                {advisory.data.fire_tier_assessment && (
                  <View className="rounded-xl px-3.5 py-2.5 mb-1" style={{ backgroundColor: "rgba(232,252,133,0.1)" }}>
                    <View className="flex-row items-center gap-1.5">
                      <BadgeCheck size={14} color="#E8FC85" />
                      <Text className="flex-1" style={{ fontSize: 12, color: "#E8FC85", fontWeight: "600", lineHeight: 16 }}>
                        {advisory.data.fire_tier_assessment}
                      </Text>
                    </View>
                  </View>
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
          </View>
        </View>
        </>
      )}
      </View>

      <Text className="text-[11px] text-muted-foreground text-center mt-5 opacity-60">
        Guidance is informational, not financial advice.
      </Text>

      <AddGoalModal visible={addOpen} onClose={() => setAddOpen(false)} />
    </ScreenShell>
  );
}

// ── Tab button ────────────────────────────────────────────────────────────────

function FiTabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className={`flex-1 py-1.5 rounded-full items-center ${active ? "bg-card" : ""}`}>
      <Text
        className={`text-[12.5px] ${active ? "text-foreground" : "text-muted-foreground"}`}
        style={{ fontFamily: active ? "DMSans_700Bold" : "DMSans_500Medium" }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ── Legend chip ───────────────────────────────────────────────────────────────

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View style={{ width: 14, height: 2.5, backgroundColor: color, borderRadius: 2 }} />
      <Text className="text-muted-foreground text-[10.5px]">{label}</Text>
    </View>
  );
}

// ── Projection chart ─────────────────────────────────────────────────────────

function ProjectionChart({ data, width }: { data: ProjectionsData; width: number }) {
  const points = data.points;
  const fiNumber = Number(data.fi_number);

  const conservative = points.map((p) => ({ value: Number(p.conservative), label: `Y${p.year}` }));
  const base = points.map((p) => ({ value: Number(p.base) }));
  const growth = points.map((p) => ({ value: Number(p.growth) }));

  const CHART_HEIGHT = 190;
  const maxValue = Math.max(
    fiNumber || 0,
    ...points.map((p) => Number(p.growth)),
    1,
  ) * 1.1;

  // gifted-charts' referenceLine position is a pixel offset from the top of the
  // plot area, not a data value — derive it from the FI number / maxValue ratio.
  const fiLinePosition = fiNumber > 0 ? CHART_HEIGHT * (1 - fiNumber / maxValue) : undefined;

  return (
    <View style={{ width, overflow: "hidden" }}>
      <LineChart
        data={conservative}
        data2={base}
        data3={growth}
        height={CHART_HEIGHT}
        color="#3B82F6"
        color2="#10B981"
        color3="#F59E0B"
        thickness={1.5}
        thickness2={2}
        thickness3={1.5}
        areaChart
        areaChart1
        areaChart2
        startFillColor="#3B82F6"
        startFillColor2="#10B981"
        startFillColor3="#F59E0B"
        startOpacity={0.15}
        startOpacity2={0.2}
        startOpacity3={0.12}
        endOpacity={0.01}
        endOpacity2={0.01}
        endOpacity3={0.01}
        hideDataPoints
        hideDataPoints2
        hideDataPoints3
        maxValue={maxValue}
        noOfSections={4}
        yAxisTextStyle={{ fontSize: 9, color: "#94A3B8" }}
        xAxisLabelTextStyle={{ fontSize: 9, color: "#94A3B8" }}
        yAxisLabelWidth={40}
        formatYLabel={(v: string) => fmtCompact(Number(v))}
        rulesType="dashed"
        rulesColor="rgba(148,163,184,0.25)"
        xAxisColor="rgba(148,163,184,0.25)"
        yAxisColor="transparent"
        initialSpacing={8}
        endSpacing={8}
        width={width}
        adjustToWidth
        showReferenceLine1={fiLinePosition != null}
        referenceLine1Position={fiLinePosition}
        referenceLine1Config={{
          color: "#10B981",
          dashWidth: 6,
          dashGap: 3,
          thickness: 1.5,
          labelText: `FIRE target ${fmtCompact(fiNumber)}`,
          labelTextStyle: { fontSize: 9, color: "#10B981", fontWeight: "700" as const },
        }}
      />
    </View>
  );
}

// ── Allocation buckets ────────────────────────────────────────────────────────

const PALETTE = [
  { bg: "#E8FC85", text: "#010001", sub: "rgba(0,0,0,0.4)", barBg: "rgba(0,0,0,0.12)", bar: "#010001" },
  { bg: "#A5FFB9", text: "#010001", sub: "rgba(0,0,0,0.4)", barBg: "rgba(0,0,0,0.12)", bar: "#010001" },
  { bg: "#D5E9EA", text: "#010001", sub: "rgba(0,0,0,0.4)", barBg: "rgba(0,0,0,0.12)", bar: "#010001" },
  { bg: "#FFFFFF", text: "#010001", sub: "#7DA6A9", barBg: "#D5E9EA", bar: "#D97706" },
  { bg: "#010001", text: "#E8FC85", sub: "rgba(255,255,255,0.3)", barBg: "rgba(255,255,255,0.1)", bar: "#E8FC85" },
];

function AllocationBuckets({
  buckets,
  surplus,
}: {
  buckets: AllocationBucket[];
  surplus: SurplusBreakdown | null | undefined;
}) {
  const monthlySurplus = surplus ? Number(surplus.monthly_surplus) : 0;

  if (buckets.length === 0) {
    return (
      <View className="bg-card rounded-card p-5">
        <Text className="text-muted-foreground text-[13px] text-center py-4">
          No allocation buckets yet. Generate your FIRE strategy to see personalised buckets.
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-3">
      {buckets.map((bucket, i) => {
        const c = PALETTE[i % PALETTE.length];
        const pctVal = (bucket.target_pct * 100).toFixed(0);
        const monthlyAmount = monthlySurplus * bucket.target_pct;
        return (
          <View key={bucket.key} className="rounded-[20px] p-5" style={{ backgroundColor: c.bg }}>
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", color: c.sub }}>
                  {bucket.name}
                </Text>
                {bucket.description ? (
                  <Text style={{ fontSize: 12, color: c.sub, marginTop: 5, lineHeight: 17 }} numberOfLines={4}>
                    {bucket.description.split(".")[0]}
                  </Text>
                ) : null}
                <View style={{ height: 4, backgroundColor: c.barBg, borderRadius: 999, overflow: "hidden", marginTop: 14, marginBottom: 8 }}>
                  <View style={{ width: `${Math.min(100, bucket.target_pct * 100)}%`, height: "100%", backgroundColor: c.bar, borderRadius: 999 }} />
                </View>
                {monthlySurplus > 0 && (
                  <Text style={{ fontSize: 11.5, color: c.sub }}>Route LKR {lkr(monthlyAmount)}/mo</Text>
                )}
              </View>
              <Text style={{ fontSize: 28, fontWeight: "900", letterSpacing: -1, color: c.text }}>
                {pctVal}
                <Text style={{ fontSize: 13 }}>%</Text>
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ── Goal row ──────────────────────────────────────────────────────────────────

function GoalRow({ goal, onDelete }: { goal: Goal; onDelete: () => void }) {
  const progress = Math.round(goal.progress * 100);
  return (
    <View className="rounded-2xl bg-muted p-3.5">
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-foreground text-[13px] font-bold flex-1 pr-2" numberOfLines={1}>
          {goal.name}
        </Text>
        <View className="flex-row items-center gap-2">
          {goal.target_date && (
            <Text className="text-muted-foreground text-[11.5px]">{goal.target_date.slice(0, 4)}</Text>
          )}
          <Pressable onPress={onDelete} hitSlop={8}>
            <Trash2 size={14} color="#DC2626" />
          </Pressable>
        </View>
      </View>
      <View className="h-[3px] rounded-full bg-border overflow-hidden mb-1.5">
        <View style={{ width: `${progress}%`, height: "100%", backgroundColor: "#E8FC85", borderRadius: 999 }} />
      </View>
      <Text className="text-muted-foreground text-[11px]">
        LKR {lkr(goal.current_amount)} / {lkr(goal.target_amount)}
      </Text>
    </View>
  );
}

// ── Add goal modal ────────────────────────────────────────────────────────────

function AddGoalModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const create = useCreateGoal();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("");
  const [year, setYear] = useState("");
  const theme = useThemeColors();
  const themeVars = useThemeVars();

  function reset() {
    setName("");
    setTarget("");
    setCurrent("");
    setYear("");
  }

  async function submit() {
    if (!name.trim() || !target) return;
    const targetDate = year.trim() ? `${year.trim()}-12-31` : null;
    await create.mutateAsync({
      name,
      kind: "custom",
      target_amount: Number(target),
      current_amount: Number(current || 0),
      target_date: targetDate,
      priority: 2,
    });
    reset();
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={[themeVars, { backgroundColor: "rgba(0,0,0,0.4)" }]}>
        <View className="bg-background rounded-t-[28px] max-h-[85%]">
          <View className="flex-row items-center justify-between px-5 pt-5 pb-3">
            <Text className="text-foreground" style={{ fontFamily: "DMSans_900Black", fontSize: 20, letterSpacing: -0.5 }}>
              New goal
            </Text>
            <Pressable onPress={onClose} className="w-8 h-8 rounded-full items-center justify-center bg-muted">
              <X color={theme.foreground} size={16} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, gap: 14 }} keyboardShouldPersistTaps="handled">
            <Text className="text-muted-foreground text-[12.5px] -mt-2">
              Track progress toward a financial milestone.
            </Text>
            <View className="gap-1.5">
              <Text className="text-[12px] text-muted-foreground font-medium">Name</Text>
              <TextField value={name} onChangeText={setName} placeholder="e.g. House down payment" />
            </View>
            <View className="flex-row gap-3">
              <View className="flex-1 gap-1.5">
                <Text className="text-[12px] text-muted-foreground font-medium">Target (LKR)</Text>
                <TextField
                  keyboardType="numeric"
                  value={target}
                  onChangeText={(t) => setTarget(t.replace(/[^0-9.]/g, ""))}
                  placeholder="5000000"
                />
              </View>
              <View className="flex-1 gap-1.5">
                <Text className="text-[12px] text-muted-foreground font-medium">Saved so far</Text>
                <TextField
                  keyboardType="numeric"
                  value={current}
                  onChangeText={(t) => setCurrent(t.replace(/[^0-9.]/g, ""))}
                  placeholder="0"
                />
              </View>
            </View>
            <View className="gap-1.5">
              <Text className="text-[12px] text-muted-foreground font-medium">Target year (optional)</Text>
              <TextField
                keyboardType="numeric"
                value={year}
                onChangeText={(t) => setYear(t.replace(/[^0-9]/g, "").slice(0, 4))}
                placeholder="2030"
              />
            </View>
          </ScrollView>
          <View className="flex-row gap-2.5 px-5 pt-2 pb-6">
            <PillButton variant="secondary" onPress={onClose} className="flex-1">
              Cancel
            </PillButton>
            <PillButton
              variant="primary"
              onPress={submit}
              loading={create.isPending}
              disabled={!name.trim() || !target}
              className="flex-1"
            >
              Add goal
            </PillButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Recommendation item ──────────────────────────────────────────────────────

const PRIO_STYLE: Record<number, { color: string; bg: string }> = {
  1: { color: "#F87171", bg: "rgba(220,38,38,0.2)" },
  2: { color: "#FBBF24", bg: "rgba(217,119,6,0.2)" },
  3: { color: "#7DA6A9", bg: "rgba(125,166,169,0.2)" },
};

function RecItem({ rec, reportId }: { rec: Recommendation; reportId: string }) {
  const apply = useApplyRecommendation();
  const dismiss = useDismissRecommendation();
  const prio = PRIO_STYLE[rec.priority] ?? PRIO_STYLE[3];
  const done = rec.status !== "pending";

  return (
    <View className="rounded-xl px-3.5 py-2.5" style={{ backgroundColor: "rgba(255,255,255,0.05)", opacity: done ? 0.5 : 1 }}>
      <View className="flex-row items-center gap-1.5 mb-1">
        <View className="rounded px-1.5 py-0.5" style={{ backgroundColor: prio.bg }}>
          <Text style={{ fontSize: 9.5, fontWeight: "900", color: prio.color }}>P{rec.priority}</Text>
        </View>
        <Text className="flex-1" style={{ fontSize: 12.5, fontWeight: "700", color: "#fff" }} numberOfLines={2}>
          {rec.title}
        </Text>
      </View>
      <Text style={{ fontSize: 11.5, color: "rgba(255,255,255,0.38)", lineHeight: 16 }}>{rec.rationale}</Text>
      {!done && (
        <View className="flex-row gap-4 mt-2">
          {rec.action_type === "reminder" && (
            <Pressable
              onPress={() => apply.mutate({ reportId, recId: rec.id })}
              disabled={apply.isPending}
              className="flex-row items-center gap-1"
            >
              <Check size={11} color="#E8FC85" />
              <Text style={{ fontSize: 11, color: "#E8FC85", fontWeight: "700" }}>Create reminder</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => dismiss.mutate({ reportId, recId: rec.id })}
            disabled={dismiss.isPending}
            className="flex-row items-center gap-1"
          >
            <X size={11} color="rgba(255,255,255,0.38)" />
            <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.38)" }}>Dismiss</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
