import { Sparkles, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

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

  return (
    <PageShell>
      <View className="px-5 pt-2.5">
        <Text className="font-sans-bold text-[22px] text-foreground">Financial Independence</Text>
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
        <View className="gap-3 px-4 pt-3.5">
          <Card className="p-5">
            <Text className="mb-1.5 text-[11px] font-sans-medium uppercase tracking-wide text-foreground/35">
              Freedom Number
            </Text>
            <Text className="mb-2 text-[12px] leading-4 text-foreground/30">
              The savings target where investment returns cover your lifestyle — permanently.
            </Text>
            <View className="mb-3 flex-row items-baseline gap-1">
              <Text className="font-sans-bold text-[20px] text-foreground/40">Rs.</Text>
              <Text className="font-sans-extrabold text-[36px] tracking-tighter text-foreground">
                {projections.data ? formatLKRAbbrev(projections.data.fi_number) : "—"}
              </Text>
            </View>
            <Text className="mb-3 text-[12px] text-foreground/30">4% SWR</Text>
            <ProgressBar pct={Number(fiScore.data?.progress_to_fi ?? 0)} />
            <Text className="mt-1.5 text-[11px] text-foreground/30">
              Funded {fiScore.data ? formatPct(fiScore.data.progress_to_fi) : "—"}
            </Text>
          </Card>

          <View className="flex-row gap-2.5">
            <StatTile
              className="flex-1"
              label="Net Worth"
              value={fiScore.data ? `Rs. ${formatLKRAbbrev(fiScore.data.net_worth)}` : "—"}
            />
            <StatTile
              className="flex-1"
              label="Savings Rate"
              value={fiScore.data ? formatPct(fiScore.data.savings_rate) : "—"}
            />
          </View>

          <Card className="p-4">
            <View className="mb-2.5 flex-row items-center justify-between">
              <Text className="font-sans-semibold text-[14px] text-foreground">FI Score</Text>
              <Text className="font-sans-bold text-[18px] text-foreground">
                {fiScore.data ? Number(fiScore.data.overall_score).toFixed(0) : "—"}
                <Text className="text-[11px] font-sans text-foreground/30">/100</Text>
              </Text>
            </View>
            <View className="gap-2.5">
              {(fiScore.data?.components ?? []).map((c) => (
                <View key={c.label}>
                  <View className="mb-1 flex-row justify-between">
                    <Text className="text-[12px] text-foreground/50">{c.label}</Text>
                    <Text className="text-[12px] font-sans-medium text-foreground">{Number(c.score).toFixed(0)}</Text>
                  </View>
                  <ProgressBar pct={Number(c.score) / 100} />
                </View>
              ))}
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
