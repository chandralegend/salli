import { CreditCard, Plus } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { PillButton } from "@/components/ui/pill-button";
import { ScreenHeader } from "@/components/ui/screen-header";
import { useBudgetSummaryFull, useBudgets, useCreateBudget } from "@/hooks/useBudget";
import { useAccounts } from "@/hooks/useLedger";
import { formatLKR, formatLKRAbbrev } from "@/lib/format";
import { cn } from "@/lib/utils";

function monthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { from, to };
}

export default function BudgetScreen() {
  const budgets = useBudgets();
  const accounts = useAccounts();
  const createBudget = useCreateBudget();
  const latestBudget = budgets.data?.[0];
  const summary = useBudgetSummaryFull(latestBudget?.id);

  const expenseAccounts = useMemo(() => (accounts.data ?? []).filter((a) => a.type === "expense"), [accounts.data]);
  const [limits, setLimits] = useState<Record<string, string>>({});

  const totalLimit = Object.values(limits).reduce((sum, v) => sum + (Number(v) || 0), 0);

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
      <ScreenHeader title={latestBudget ? "Budget" : "Budget Setup"} back />

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
        <View className="px-4 pt-3">
          <Card className="bg-salli-navy-card p-[18px]">
            <Text className="mb-1.5 text-[10px] font-sans-medium uppercase tracking-wide text-white/40">
              Monthly Limit
            </Text>
            <View className="flex-row items-baseline gap-1.5">
              <Text className="font-sans-semibold text-[20px] text-white/35">Rs.</Text>
              <Text className="font-sans-extrabold text-[36px] tracking-tighter text-white">
                {formatLKR(totalLimit, 0)}
              </Text>
            </View>
          </Card>

          <Text className="mb-1.5 mt-4 pl-0.5 text-[11px] font-sans-semibold uppercase tracking-wide text-foreground/30">
            Category Limits
          </Text>
          <View className="gap-1.5">
            {expenseAccounts.length === 0 ? (
              <Card className="items-center p-6">
                <Text className="text-[13px] text-foreground/35">No expense accounts to budget yet.</Text>
              </Card>
            ) : (
              expenseAccounts.map((a) => (
                <Card key={a.id} className="flex-row items-center gap-2.5 p-3">
                  <View className="h-8 w-8 items-center justify-center rounded-[9px] bg-salli-accent/[0.12]">
                    <CreditCard size={13} color="#2563EB" strokeWidth={2.5} />
                  </View>
                  <Text className="flex-1 font-sans-semibold text-[13px] text-foreground">{a.name}</Text>
                  <View className="min-w-[80px] rounded-[8px] border border-foreground/10 bg-muted px-2.5 py-1.5">
                    <TextInput
                      value={limits[a.id] ?? ""}
                      onChangeText={(v) => setLimits((prev) => ({ ...prev, [a.id]: v }))}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="rgba(128,128,128,0.4)"
                      className="text-right font-sans-semibold text-[13px] text-foreground"
                    />
                  </View>
                </Card>
              ))
            )}
            <Pressable className="flex-row items-center gap-2.5 rounded-card border border-dashed border-foreground/10 bg-card p-3">
              <View className="h-8 w-8 items-center justify-center rounded-[9px] bg-foreground/[0.04]">
                <Plus size={13} color="rgba(128,128,128,0.4)" strokeWidth={2.5} />
              </View>
              <Text className="font-sans-medium text-[13px] text-foreground/30">Add category</Text>
            </Pressable>
          </View>

          <PillButton className="mb-6 mt-4" loading={createBudget.isPending} disabled={totalLimit === 0} onPress={handleSave}>
            Save Budget
          </PillButton>
        </View>
      )}
    </PageShell>
  );
}
