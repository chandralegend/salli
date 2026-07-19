import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { ScreenHeader } from "@/components/ui/screen-header";
import { useDebts, usePayoffPlan } from "@/hooks/useDebt";
import { formatLKR, formatLKRAbbrev, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function DebtScreen() {
  const [strategy, setStrategy] = useState<"avalanche" | "snowball">("avalanche");
  const [extra, setExtra] = useState(10000);
  const debts = useDebts();
  const plan = usePayoffPlan(extra, strategy);

  const totalOutstanding = (debts.data ?? []).reduce((sum, d) => sum + Number(d.principal), 0);
  const totalMinPayment = (debts.data ?? []).reduce((sum, d) => sum + Number(d.minimum_payment), 0);

  return (
    <PageShell>
      <ScreenHeader title="Debt" back />

      {(debts.data ?? []).length === 0 ? (
        <View className="items-center gap-2 px-8 pt-16">
          <Text className="text-center font-sans-semibold text-[15px] text-foreground">No debts tracked</Text>
          <Text className="text-center text-[13px] text-foreground/35">
            Add a loan from the web app to see a payoff plan here.
          </Text>
        </View>
      ) : (
        <View className="px-4 pt-3">
          <Card className="bg-salli-navy-card p-[18px]">
            <Text className="mb-2 text-[11px] font-sans-medium uppercase tracking-wide text-white/50">
              Total Outstanding
            </Text>
            <View className="mb-1 flex-row items-baseline gap-1">
              <Text className="font-sans-semibold text-[20px] text-white/40">Rs.</Text>
              <Text className="font-sans-extrabold text-[44px] tracking-tighter text-white">
                {formatLKRAbbrev(totalOutstanding)}
              </Text>
            </View>
            <Text className="mb-3.5 text-[11px] text-white/30">
              {debts.data?.length} active loan{debts.data?.length === 1 ? "" : "s"} · {strategy} strategy
            </Text>
            <View className="flex-row gap-1.5">
              <View className="flex-1 rounded-control bg-white/[0.06] p-2.5">
                <Text className="mb-1 text-[10px] text-white/35">Monthly Min</Text>
                <Text className="font-sans-bold text-[13px] text-white">Rs. {formatLKRAbbrev(totalMinPayment)}</Text>
              </View>
              <View className="flex-1 rounded-control bg-white/[0.06] p-2.5">
                <Text className="mb-1 text-[10px] text-white/35">Payoff</Text>
                <Text className="font-sans-bold text-[13px] text-white">{plan.data?.months_to_payoff ?? "—"} mo</Text>
              </View>
              <View className="flex-1 rounded-control bg-white/[0.06] p-2.5">
                <Text className="mb-1 text-[10px] text-white/35">Total Interest</Text>
                <Text className="font-sans-bold text-[13px] text-salli-accent">
                  Rs. {plan.data ? formatLKRAbbrev(plan.data.total_interest_paid) : "—"}
                </Text>
              </View>
            </View>
          </Card>

          <View className="mt-2.5 gap-1.5">
            {(debts.data ?? []).map((debt) => (
              <Card key={debt.id} className="flex-row gap-2.5 p-3.5">
                <View className="mt-0.5 h-[54px] w-[3px] rounded-pill bg-salli-accent" />
                <View className="flex-1">
                  <View className="mb-1 flex-row items-start justify-between">
                    <View>
                      <Text className="font-sans-semibold text-[13px] text-foreground">{debt.name}</Text>
                      <Text className="mt-0.5 text-[11px] text-foreground/30">
                        APR {formatPct(debt.apr, 1)}
                      </Text>
                    </View>
                    <View className="rounded-[6px] bg-salli-accent/15 px-2 py-0.5">
                      <Text className="text-[11px] font-sans-semibold text-salli-accent">Active</Text>
                    </View>
                  </View>
                  <View className="mt-1.5 flex-row gap-3">
                    <View>
                      <Text className="text-[10px] text-foreground/30">Principal</Text>
                      <Text className="font-sans-semibold text-[13px] text-foreground">
                        Rs. {formatLKRAbbrev(debt.principal)}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-[10px] text-foreground/30">Min/mo</Text>
                      <Text className="font-sans-semibold text-[13px] text-foreground">
                        Rs. {formatLKRAbbrev(debt.minimum_payment)}
                      </Text>
                    </View>
                  </View>
                </View>
              </Card>
            ))}
          </View>

          <Card className="mt-2.5 p-4">
            <Text className="mb-2.5 text-[11px] font-sans-semibold uppercase tracking-wide text-foreground/30">
              Payoff Strategy
            </Text>
            <View className="mb-3 flex-row rounded-pill border border-foreground/[0.06] bg-foreground/[0.06] p-1">
              {(["avalanche", "snowball"] as const).map((s) => (
                <Pressable key={s} onPress={() => setStrategy(s)} className={cn("h-9 flex-1 items-center justify-center rounded-pill", strategy === s && "bg-salli-accent")}>
                  <Text className={cn("text-[13px] capitalize", strategy === s ? "font-sans-semibold text-white" : "font-sans-medium text-foreground/35")}>
                    {s}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View className="flex-row items-center justify-between rounded-control border border-foreground/[0.07] bg-muted px-3.5 py-2.5">
              <View>
                <Text className="mb-0.5 text-[10px] font-sans-medium uppercase tracking-wide text-foreground/30">
                  Extra Monthly Payment
                </Text>
                <Text className="font-sans-semibold text-[16px] text-foreground">Rs. {formatLKR(extra, 0)}</Text>
              </View>
              <View className="flex-row gap-2">
                <Pressable onPress={() => setExtra((v) => Math.max(0, v - 5000))} className="h-7 w-7 items-center justify-center rounded-full bg-foreground/10">
                  <Text className="text-foreground">−</Text>
                </Pressable>
                <Pressable onPress={() => setExtra((v) => v + 5000)} className="h-7 w-7 items-center justify-center rounded-full bg-foreground/10">
                  <Text className="text-foreground">+</Text>
                </Pressable>
              </View>
            </View>
          </Card>

          <View className="mt-2.5 flex-row gap-2">
            <Card className="flex-1 p-3.5">
              <Text className="mb-1.5 text-[11px] text-foreground/40">Months to Payoff</Text>
              <Text className="font-sans-extrabold text-[28px] tracking-tight text-foreground">
                {plan.data?.months_to_payoff ?? "—"}
              </Text>
              {plan.data?.months_to_payoff ? (
                <Text className="mt-0.5 text-[11px] text-foreground/25">
                  {(plan.data.months_to_payoff / 12).toFixed(1)} years
                </Text>
              ) : null}
            </Card>
            <Card className="flex-1 p-3.5">
              <Text className="mb-1.5 text-[11px] text-foreground/40">Total Interest</Text>
              <Text className="font-sans-bold text-[20px] tracking-tight text-foreground">
                Rs. {plan.data ? formatLKRAbbrev(plan.data.total_interest_paid) : "—"}
              </Text>
              <Text className="mt-0.5 text-[11px] text-salli-accent">saved</Text>
            </Card>
          </View>

          <Text className="mt-3 px-2 text-center text-[11px] leading-4 text-foreground/25">
            Planning estimate only · Assumes fixed APR and on-time payments
          </Text>
        </View>
      )}
    </PageShell>
  );
}
