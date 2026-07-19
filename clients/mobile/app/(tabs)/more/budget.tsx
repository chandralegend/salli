import { useQuery } from "@tanstack/react-query";
import { CreditCard, Plus } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { PillButton } from "@/components/ui/pill-button";
import { ScreenHeader } from "@/components/ui/screen-header";
import { getScoreFiScoreGet } from "@/lib/api/sdk.gen";
import { useBudgetSummaryFull, useBudgets, useCreateBudget } from "@/hooks/useBudget";
import { useAccounts } from "@/hooks/useLedger";
import { formatLKR, formatLKRAbbrev } from "@/lib/format";
import { cn } from "@/lib/utils";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const PRESETS: { label: string; value: number }[] = [
  { label: "60K", value: 60000 },
  { label: "84K", value: 84000 },
  { label: "1L", value: 100000 },
  { label: "1.2L", value: 120000 },
];

function monthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { from, to };
}

function currentMonthLabel() {
  const d = new Date();
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export default function BudgetScreen() {
  const budgets = useBudgets();
  const accounts = useAccounts();
  const createBudget = useCreateBudget();
  const latestBudget = budgets.data?.[0];
  const summary = useBudgetSummaryFull(latestBudget?.id);

  const fiScore = useQuery({
    queryKey: ["fi-score"],
    queryFn: async () => {
      const { data } = await getScoreFiScoreGet({ throwOnError: true });
      return data as unknown as { monthly_income: string } | null;
    },
  });

  const expenseAccounts = useMemo(() => (accounts.data ?? []).filter((a) => a.type === "expense"), [accounts.data]);
  const [limits, setLimits] = useState<Record<string, string>>({});
  const [monthlyLimit, setMonthlyLimit] = useState(0);
  const [cadence, setCadence] = useState<"Weekly" | "Monthly">("Monthly");

  const avgIncome = Number(fiScore.data?.monthly_income ?? 0);
  const recommended = avgIncome > 0 ? Math.round(avgIncome * 0.7) : 0;
  const allocated = Object.values(limits).reduce((sum, v) => sum + (Number(v) || 0), 0);
  const effectiveLimit = monthlyLimit || recommended || allocated;
  const pct = avgIncome > 0 && effectiveLimit > 0 ? Math.round((effectiveLimit / avgIncome) * 100) : null;
  const unallocated = effectiveLimit - allocated;
  const dominantId = Object.entries(limits).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0];

  const handleSave = () => {
    const { from, to } = monthRange();
    const lines = Object.entries(limits)
      .filter(([, v]) => Number(v) > 0)
      .map(([account_id, v]) => ({ account_id, limit_amount: Number(v) }));
    if (lines.length === 0) return;
    createBudget.mutate({ period_start: from, period_end: to, lines });
  };

  return (
    <PageShell>
      <ScreenHeader
        title={latestBudget ? "Budget" : "Budget Setup"}
        back
        trailing={
          <View className="rounded-pill border border-foreground/10 bg-foreground/[0.07] px-3 py-1">
            <Text className="text-[12px] font-sans-medium text-foreground/45">{currentMonthLabel()}</Text>
          </View>
        }
      />

      {latestBudget && summary.data ? (
        <View className="px-4 pt-3">
          <Card className="p-4">
            <View className="mb-2.5 flex-row justify-between">
              <Text className="font-sans-semibold text-[14px] text-foreground">Total Limit</Text>
              <Text className="font-sans-bold text-[14px] text-foreground">
                Rs. {formatLKRAbbrev(summary.data.total_limit)}
              </Text>
            </View>
            <View className="mb-2.5 flex-row justify-between">
              <Text className="text-[13px] text-foreground/50">Total Actual</Text>
              <Text className="font-sans-medium text-[13px] text-foreground">
                Rs. {formatLKRAbbrev(summary.data.total_actual)}
              </Text>
            </View>
            <View className="flex-row justify-between border-t border-foreground/[0.08] pt-2.5">
              <Text className="text-[13px] text-foreground/50">Variance</Text>
              <Text
                className={cn(
                  "font-sans-bold text-[13px]",
                  Number(summary.data.total_variance) < 0 ? "text-destructive" : "text-salli-accent",
                )}
              >
                Rs. {formatLKR(summary.data.total_variance, 0)}
              </Text>
            </View>
          </Card>

          <Card className="mt-2.5 overflow-hidden p-0">
            {summary.data.lines.map((line, i) => (
              <View
                key={i}
                className={cn("px-4 py-3", i < summary.data!.lines.length - 1 && "border-b border-foreground/[0.05]")}
              >
                <View className="mb-1.5 flex-row justify-between">
                  <Text className="font-sans-medium text-[13px] text-foreground">{line.category}</Text>
                  <Text
                    className={cn(
                      "font-sans-semibold text-[12px]",
                      Number(line.variance) < 0 ? "text-destructive" : "text-salli-accent",
                    )}
                  >
                    {Number(line.variance) < 0 ? "Over" : "OK"}
                  </Text>
                </View>
                <View className="h-1.5 overflow-hidden rounded-pill bg-foreground/10">
                  <View
                    className={cn("h-full rounded-pill", Number(line.actual_amount) > Number(line.limit_amount) ? "bg-destructive" : "bg-salli-accent")}
                    style={{ width: `${Math.min(100, (Number(line.actual_amount) / Number(line.limit_amount || 1)) * 100)}%` }}
                  />
                </View>
                <Text className="mt-1 text-[11px] text-foreground/30">
                  Rs. {formatLKR(line.actual_amount, 0)} of Rs. {formatLKR(line.limit_amount, 0)}
                </Text>
              </View>
            ))}
          </Card>
        </View>
      ) : (
        <View className="px-4 pt-3.5">
          {/* hero */}
          <Card className="bg-salli-navy-card p-0">
            <View className="p-[18px] pb-4">
              <View className="mb-2.5 flex-row items-start justify-between">
                <View>
                  <Text className="mb-1.5 text-[10px] font-sans-medium uppercase tracking-wide text-white/40">
                    Monthly Limit
                  </Text>
                  <View className="flex-row items-baseline gap-1.5">
                    <Text className="font-sans-semibold text-[20px] text-white/35">Rs.</Text>
                    <Text className="font-sans-extrabold text-[44px] leading-none tracking-tighter text-white">
                      {formatLKR(effectiveLimit, 0)}
                    </Text>
                  </View>
                </View>
                {pct !== null ? (
                  <View className="mt-1 rounded-[8px] border border-salli-accent/30 bg-salli-accent/20 px-2.5 py-1">
                    <Text className="text-[11px] font-sans-semibold text-salli-accent">{pct}% of income</Text>
                  </View>
                ) : null}
              </View>
              <View className="mb-2 h-[5px] overflow-hidden rounded-pill bg-white/[0.08]">
                <View
                  className="h-full rounded-pill bg-salli-accent"
                  style={{ width: `${pct !== null ? Math.min(100, pct) : 0}%` }}
                />
              </View>
              <View className="flex-row justify-between">
                <Text className="text-[11px] text-white/30">
                  Avg monthly income {avgIncome > 0 ? `Rs. ${formatLKRAbbrev(avgIncome)}` : "—"}
                </Text>
                <Text className="text-[11px] text-white/30">Recommended ≤80%</Text>
              </View>
            </View>
          </Card>

          {/* cadence + presets */}
          <View className="mt-2.5 flex-row items-center gap-2">
            <View className="flex-row rounded-pill border border-foreground/[0.07] bg-card p-[3px]">
              {(["Weekly", "Monthly"] as const).map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setCadence(c)}
                  className={cn("h-8 items-center justify-center rounded-pill px-3.5", cadence === c && "bg-salli-accent")}
                >
                  <Text className={cn("text-[12px]", cadence === c ? "font-sans-semibold text-white" : "font-sans-medium text-foreground/30")}>
                    {c}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View className="flex-row gap-1.5">
              {PRESETS.map((p) => (
                <Pressable
                  key={p.label}
                  onPress={() => setMonthlyLimit(p.value)}
                  className={cn(
                    "rounded-pill px-3 py-1",
                    monthlyLimit === p.value ? "bg-salli-accent" : "border border-foreground/[0.08] bg-card",
                  )}
                >
                  <Text
                    className={cn(
                      "text-[12px]",
                      monthlyLimit === p.value ? "font-sans-semibold text-white" : "font-sans-medium text-foreground/40",
                    )}
                  >
                    {p.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* category limits */}
          <View className="mb-2 mt-3 flex-row items-center justify-between">
            <Text className="text-[11px] font-sans-semibold uppercase tracking-wide text-foreground/30">
              Category Limits
            </Text>
            <Text className="text-[11px] font-sans-medium text-salli-accent">Auto-split</Text>
          </View>

          <View className="gap-1.5">
            {expenseAccounts.length === 0 ? (
              <Card className="items-center p-6">
                <Text className="text-[13px] text-foreground/35">No expense accounts to budget yet.</Text>
              </Card>
            ) : (
              expenseAccounts.map((a) => {
                const isDominant = a.id === dominantId && Number(limits[a.id] ?? 0) > 0;
                const share = effectiveLimit > 0 ? Math.min(100, (Number(limits[a.id] ?? 0) / effectiveLimit) * 100) : 0;
                return (
                  <View
                    key={a.id}
                    className="flex-row items-center gap-2.5 rounded-control border border-foreground/[0.08] bg-card px-3.5 py-[11px]"
                  >
                    <View
                      className={cn(
                        "h-8 w-8 items-center justify-center rounded-[9px]",
                        isDominant ? "border border-salli-accent/20 bg-salli-accent/[0.12]" : "bg-foreground/[0.06]",
                      )}
                    >
                      <CreditCard
                        size={13}
                        color={isDominant ? "#2563EB" : "rgba(128,128,128,0.7)"}
                        strokeWidth={2.5}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="font-sans-semibold text-[13px] text-foreground">{a.name}</Text>
                      <View className="mt-[5px] h-[3px] overflow-hidden rounded-pill bg-foreground/[0.06]">
                        <View
                          className={cn("h-full rounded-pill", isDominant ? "bg-salli-accent" : "bg-foreground/30")}
                          style={{ width: `${share}%` }}
                        />
                      </View>
                    </View>
                    <View className="min-w-[80px] flex-row items-center justify-end gap-1 rounded-[8px] border border-foreground/10 bg-muted px-2.5 py-1.5">
                      <Text className="text-[13px] font-sans-medium text-foreground/40">Rs.</Text>
                      <TextInput
                        value={limits[a.id] ?? ""}
                        onChangeText={(v) => setLimits((prev) => ({ ...prev, [a.id]: v }))}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="rgba(128,128,128,0.4)"
                        className="min-w-[36px] text-right font-sans-semibold text-[13px] text-foreground"
                      />
                    </View>
                  </View>
                );
              })
            )}
            <Pressable className="flex-row items-center gap-2.5 rounded-control border border-dashed border-foreground/10 bg-card px-3.5 py-[11px]">
              <View className="h-8 w-8 items-center justify-center rounded-[9px] bg-foreground/[0.04]">
                <Plus size={13} color="rgba(128,128,128,0.4)" strokeWidth={2.5} />
              </View>
              <Text className="font-sans-medium text-[13px] text-foreground/30">Add category</Text>
            </Pressable>
          </View>

          {/* unallocated indicator */}
          {effectiveLimit > 0 ? (
            <View className="mt-2 flex-row items-center gap-2 px-0.5">
              <View
                className={cn("h-2 w-2 rounded-full", unallocated < 0 ? "bg-destructive" : "bg-salli-accent")}
              />
              <Text className="text-[11px] text-foreground/30">
                Rs. {formatLKR(Math.abs(unallocated), 0)} {unallocated < 0 ? "over budget" : "unallocated"} · tap any category to edit
              </Text>
            </View>
          ) : null}

          <PillButton className="mb-2 mt-4" loading={createBudget.isPending} disabled={allocated === 0} onPress={handleSave}>
            Save Budget
          </PillButton>
          <Text className="mb-4 text-center text-[11px] text-foreground/25">Skip category limits for now</Text>
        </View>
      )}
    </PageShell>
  );
}
