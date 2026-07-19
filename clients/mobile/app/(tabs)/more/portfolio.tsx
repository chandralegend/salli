import { ArrowUpRight, ChevronDown, Plus, Search } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { ScreenHeader } from "@/components/ui/screen-header";
import { useHoldings, usePortfolioSummary } from "@/hooks/usePortfolio";
import { formatLKR, formatLKRAbbrev, formatPct } from "@/lib/format";
import { useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

const TABS = ["Holdings", "Allocation"] as const;
const RANGES = ["1M", "3M", "YTD", "1Y", "All"] as const;

export default function PortfolioScreen() {
  const colors = useThemeColors();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Holdings");
  const [range, setRange] = useState<(typeof RANGES)[number]>("All");
  const [search, setSearch] = useState("");
  const holdings = useHoldings();
  const summary = usePortfolioSummary();

  const visible = (holdings.data ?? []).filter(
    (h) =>
      !search ||
      h.name.toLowerCase().includes(search.toLowerCase()) ||
      h.symbol.toLowerCase().includes(search.toLowerCase()),
  );

  const grouped = visible.reduce<Record<string, typeof holdings.data>>((acc, h) => {
    (acc[h.asset_class] ??= []).push(h);
    return acc;
  }, {});

  return (
    <View className="flex-1">
      <PageShell>
        <ScreenHeader
          title="Portfolio"
          back
          trailing={
            <View className="flex-row items-center gap-2">
              <View className="rounded-pill border border-foreground/[0.08] bg-card px-3 py-1.5">
                <Text className="text-[11px] text-foreground/40">Manual values only</Text>
              </View>
              <Pressable className="h-[34px] w-[34px] items-center justify-center rounded-full bg-salli-accent">
                <Plus size={14} color="#FFFFFF" strokeWidth={2.5} />
              </Pressable>
            </View>
          }
        />

        {(holdings.data ?? []).length === 0 ? (
          <View className="items-center gap-2 px-8 pt-16">
            <Text className="text-center font-sans-semibold text-[15px] text-foreground">No holdings yet</Text>
            <Text className="text-center text-[13px] text-foreground/35">Add a holding from the web app.</Text>
          </View>
        ) : (
          <View className="px-4 pt-3">
            <Card className="bg-salli-navy-card p-[18px]">
              <Text className="mb-2 text-[11px] font-sans-medium uppercase tracking-wide text-white/50">
                Total Portfolio Value
              </Text>
              <View className="mb-1.5 flex-row items-baseline gap-1">
                <Text className="font-sans-semibold text-[20px] text-white/40">Rs.</Text>
                <Text className="font-sans-extrabold text-[44px] tracking-tighter text-white">
                  {summary.data ? formatLKRAbbrev(summary.data.total_value) : "—"}
                </Text>
              </View>
              <View className="flex-row items-center gap-2.5">
                <Text className="text-[11px] text-white/30">
                  Cost Rs. {summary.data ? formatLKRAbbrev(summary.data.total_cost_basis) : "—"}
                </Text>
                {summary.data ? (
                  <View className="flex-row items-center gap-1 rounded-pill border border-salli-accent/30 bg-salli-accent/15 px-2.5 py-1">
                    <ArrowUpRight size={9} color={colors.accent} strokeWidth={2.5} />
                    <Text className="text-[11px] font-sans-semibold text-salli-accent">
                      +Rs. {formatLKRAbbrev(summary.data.total_gain)} ({formatPct(summary.data.total_gain_pct, 1)})
                    </Text>
                  </View>
                ) : null}
              </View>
            </Card>

            <View className="mt-2.5 flex-row gap-1.5">
              {RANGES.map((r) => (
                <Pressable
                  key={r}
                  onPress={() => setRange(r)}
                  className={cn("rounded-pill px-3.5 py-1", range === r ? "bg-salli-accent" : "border border-foreground/[0.08] bg-card")}
                >
                  <Text className={cn("text-[12px]", range === r ? "font-sans-semibold text-white" : "font-sans-medium text-foreground/40")}>
                    {r}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View className="mt-2 flex-row border-b border-foreground/[0.08]">
              {TABS.map((t) => (
                <Pressable key={t} onPress={() => setTab(t)} className={cn("px-3.5 py-2", tab === t && "border-b-2 border-salli-accent")}>
                  <Text className={cn("text-[13px]", tab === t ? "font-sans-semibold text-foreground" : "font-sans-medium text-foreground/35")}>
                    {t}
                  </Text>
                </Pressable>
              ))}
            </View>

            {tab === "Holdings" ? (
              <>
                <View className="mt-2.5 flex-row gap-2">
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
                    <ChevronDown size={13} color={colors.mutedForeground} strokeWidth={2} />
                    <Text className="font-sans-medium text-[12px] text-foreground/40">Gain</Text>
                  </View>
                </View>

                <View className="mt-3 gap-3">
                  {Object.entries(grouped).map(([assetClass, items]) => (
                    <View key={assetClass}>
                      <Text className="mb-1.5 pl-0.5 text-[11px] font-sans-semibold uppercase tracking-wide text-foreground/30">
                        {assetClass}
                      </Text>
                      <View className="gap-1.5">
                        {(items ?? []).map((h) => {
                          const gain = Number(h.current_value) - Number(h.cost_basis);
                          return (
                            <Card key={h.id} className="flex-row items-center gap-2.5 p-3">
                              <View className="h-[42px] w-[3px] rounded-pill bg-salli-accent" />
                              <View className="h-[38px] w-[38px] items-center justify-center rounded-[12px] border border-salli-accent/20 bg-salli-accent/[0.12]">
                                <Text className="font-sans-bold text-[10px] text-salli-accent">{h.symbol.slice(0, 4)}</Text>
                              </View>
                              <View className="flex-1">
                                <Text className="font-sans-semibold text-[13px] text-foreground">{h.name}</Text>
                                <Text className="text-[11px] text-foreground/30">
                                  {formatPct(Number(h.current_value) / Number(summary.data?.total_value ?? 1), 0)} of portfolio
                                </Text>
                              </View>
                              <View className="items-end">
                                <Text className="font-sans-semibold text-[13px] text-foreground">
                                  Rs. {formatLKRAbbrev(h.current_value)}
                                </Text>
                                <Text className={cn("text-[11px]", gain >= 0 ? "text-foreground/50" : "text-destructive")}>
                                  {gain >= 0 ? "+" : ""}Rs. {formatLKRAbbrev(gain)}
                                </Text>
                              </View>
                            </Card>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <View className="mt-3 gap-2">
                {(summary.data?.allocation ?? []).map((a) => (
                  <Card key={a.asset_class} className="p-3.5">
                    <View className="mb-1.5 flex-row items-center justify-between">
                      <Text className="font-sans-semibold text-[13px] capitalize text-foreground">{a.asset_class}</Text>
                      <Text className="font-sans-bold text-[13px] text-salli-accent">{formatPct(a.pct_of_portfolio, 1)}</Text>
                    </View>
                    <View className="h-1.5 overflow-hidden rounded-pill bg-foreground/10">
                      <View
                        className="h-full rounded-pill bg-salli-accent"
                        style={{ width: `${Math.min(100, Number(a.pct_of_portfolio) * 100)}%` }}
                      />
                    </View>
                    <Text className="mt-1.5 text-[11px] text-foreground/30">Rs. {formatLKR(a.current_value, 0)}</Text>
                  </Card>
                ))}
              </View>
            )}
          </View>
        )}
      </PageShell>

      {(holdings.data ?? []).length > 0 ? (
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
