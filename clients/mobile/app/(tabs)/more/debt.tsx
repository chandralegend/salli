import { Pencil, Plus, Search, SlidersHorizontal } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { ScreenHeader } from "@/components/ui/screen-header";
import { useDebts, usePayoffPlan } from "@/hooks/useDebt";
import { formatLKR, formatLKRAbbrev, formatPct } from "@/lib/format";
import { useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

const TABS = ["Overview", "Strategy", "Schedule"] as const;
const FILTERS = ["All", "Active", "Paid Off"] as const;

export default function DebtScreen() {
  const colors = useThemeColors();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [search, setSearch] = useState("");
  const [strategy, setStrategy] = useState<"avalanche" | "snowball">("avalanche");
  const [extra, setExtra] = useState(10000);
  const debts = useDebts();
  const plan = usePayoffPlan(extra, strategy);

  const allDebts = debts.data ?? [];
  const totalOutstanding = allDebts.reduce((sum, d) => sum + Number(d.principal), 0);
  const totalMinPayment = allDebts.reduce((sum, d) => sum + Number(d.minimum_payment), 0);

  const visibleDebts = allDebts.filter((d) => {
    if (filter === "Active" && !d.is_active) return false;
    if (filter === "Paid Off" && d.is_active) return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const strategyLabel = strategy.charAt(0).toUpperCase() + strategy.slice(1);

  return (
    <View className="flex-1">
      <PageShell>
        <ScreenHeader
          title="Debt"
          back
          trailing={
            <Pressable className="h-[34px] w-[34px] items-center justify-center rounded-full bg-salli-accent">
              <Plus size={14} color="#FFFFFF" strokeWidth={2.5} />
            </Pressable>
          }
        />

        <View className="mt-3 flex-row border-b border-foreground/[0.08] px-4">
          {TABS.map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} className={cn("px-3.5 py-2", tab === t && "border-b-2 border-salli-accent")}>
              <Text className={cn("text-[13px]", tab === t ? "font-sans-semibold text-foreground" : "font-sans-medium text-foreground/35")}>
                {t}
              </Text>
            </Pressable>
          ))}
        </View>

        {allDebts.length === 0 ? (
          <View className="items-center gap-2 px-8 pt-16">
            <Text className="text-center font-sans-semibold text-[15px] text-foreground">No debts tracked</Text>
            <Text className="text-center text-[13px] text-foreground/35">
              Add a loan from the web app to see a payoff plan here.
            </Text>
          </View>
        ) : tab !== "Overview" ? (
          <View className="items-center px-8 pt-16">
            <Text className="text-center text-[13px] text-foreground/35">{tab} view coming soon.</Text>
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
                {allDebts.length} active loan{allDebts.length === 1 ? "" : "s"} · {strategyLabel} strategy
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

            <View className="mt-3 flex-row items-center gap-2">
              <View className="h-[38px] flex-1 flex-row items-center gap-2 rounded-[10px] border border-foreground/[0.08] bg-card px-3">
                <Search size={13} color={colors.mutedForeground} strokeWidth={2} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search..."
                  placeholderTextColor="rgba(128,128,128,0.4)"
                  className="flex-1 text-[13px] text-foreground"
                />
              </View>
              <View className="h-[38px] flex-row items-center gap-1.5 rounded-[10px] border border-foreground/[0.08] bg-card px-3">
                <SlidersHorizontal size={13} color={colors.mutedForeground} strokeWidth={2} />
                <Text className="font-sans-medium text-[12px] text-foreground/40">Filter</Text>
              </View>
            </View>

            <View className="mt-2.5 flex-row gap-1.5">
              {FILTERS.map((f) => (
                <Pressable
                  key={f}
                  onPress={() => setFilter(f)}
                  className={cn("rounded-pill px-3.5 py-1", filter === f ? "bg-salli-accent" : "border border-foreground/[0.08] bg-card")}
                >
                  <Text className={cn("text-[12px]", filter === f ? "font-sans-semibold text-white" : "font-sans-medium text-foreground/40")}>
                    {f}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text className="mb-2 mt-3 pl-0.5 text-[11px] font-sans-semibold uppercase tracking-wide text-foreground/30">
              Active Debts
            </Text>
            <View className="gap-1.5">
              {visibleDebts.map((debt) => (
                <Card key={debt.id} className="flex-row gap-2.5 p-3.5">
                  <View className="mt-0.5 h-[54px] w-[3px] rounded-pill bg-salli-accent" />
                  <View className="flex-1">
                    <View className="mb-1 flex-row items-start justify-between">
                      <View>
                        <Text className="font-sans-semibold text-[13px] text-foreground">{debt.name}</Text>
                        <Text className="mt-0.5 text-[11px] text-foreground/30">APR {formatPct(debt.apr, 1)}</Text>
                      </View>
                      <View className="rounded-[6px] bg-salli-accent/15 px-2 py-0.5">
                        <Text className="text-[11px] font-sans-semibold text-salli-accent">
                          {debt.is_active ? "Active" : "Paid Off"}
                        </Text>
                      </View>
                    </View>
                    <View className="mt-1.5 flex-row gap-3">
                      <View className="flex-1">
                        <Text className="mb-0.5 text-[10px] text-foreground/30">Principal</Text>
                        <Text className="font-sans-semibold text-[13px] text-foreground">Rs. {formatLKRAbbrev(debt.principal)}</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="mb-0.5 text-[10px] text-foreground/30">Min/mo</Text>
                        <Text className="font-sans-semibold text-[13px] text-foreground">Rs. {formatLKRAbbrev(debt.minimum_payment)}</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="mb-0.5 text-[10px] text-foreground/30">Extra/mo</Text>
                        <Text className="font-sans-semibold text-[13px] text-salli-accent">+Rs. {formatLKRAbbrev(extra)}</Text>
                      </View>
                    </View>
                  </View>
                  <Pressable className="mt-0.5">
                    <Pencil size={14} color={colors.mutedForeground} strokeWidth={2} />
                  </Pressable>
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

      {allDebts.length > 0 ? (
        <Pressable
          className="absolute bottom-28 right-5 h-12 w-12 items-center justify-center rounded-full"
          style={{
            backgroundColor: colors.accent,
            shadowColor: "#2563EB",
            shadowOpacity: 0.4,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 4 },
            elevation: 6,
          }}
        >
          <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
        </Pressable>
      ) : null}
    </View>
  );
}
