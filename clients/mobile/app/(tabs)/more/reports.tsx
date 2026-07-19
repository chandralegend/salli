import { Download } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { ScreenHeader } from "@/components/ui/screen-header";
import { useBalanceSheet, useNetWorthStatement } from "@/hooks/useReports";
import { formatLKR, formatLKRAbbrev } from "@/lib/format";
import { useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

const TABS = ["Balance Sheet", "Net Worth"] as const;

export default function ReportsScreen() {
  const colors = useThemeColors();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Balance Sheet");
  const balanceSheet = useBalanceSheet();
  const netWorth = useNetWorthStatement();

  return (
    <PageShell>
      <View className="flex-row items-center gap-2 px-5 pt-2.5">
        <View className="flex-1">
          <ScreenHeader title="Reports" back />
        </View>
        <Pressable className="mr-5 flex-row items-center gap-1.5 rounded-pill border border-foreground/[0.08] bg-card px-3.5 py-1.5">
          <Download size={13} color={colors.mutedForeground} strokeWidth={2} />
          <Text className="font-sans-medium text-[12px] text-foreground/50">Export</Text>
        </Pressable>
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

      {tab === "Balance Sheet" ? (
        <View className="px-4 pt-3">
          <Card className="bg-salli-navy-card p-[18px]">
            <Text className="mb-2 text-[11px] font-sans-medium uppercase tracking-wide text-white/50">
              Net Worth Snapshot
            </Text>
            <View className="mb-3.5 flex-row items-baseline gap-1">
              <Text className="font-sans-semibold text-[18px] text-white/40">Rs.</Text>
              <Text className="font-sans-extrabold text-[40px] tracking-tighter text-white">
                {balanceSheet.data ? formatLKRAbbrev(balanceSheet.data.net_worth) : "—"}
              </Text>
            </View>
            <View className="flex-row gap-1.5">
              <View className="flex-1 rounded-control bg-white/[0.06] p-2.5">
                <Text className="mb-1 text-[10px] text-white/35">Assets</Text>
                <Text className="font-sans-bold text-[13px] text-white">
                  Rs. {balanceSheet.data ? formatLKRAbbrev(balanceSheet.data.total_assets) : "—"}
                </Text>
              </View>
              <View className="flex-1 rounded-control bg-white/[0.06] p-2.5">
                <Text className="mb-1 text-[10px] text-white/35">Liabilities</Text>
                <Text className="font-sans-bold text-[13px] text-white/60">
                  Rs. {balanceSheet.data ? formatLKRAbbrev(balanceSheet.data.total_liabilities) : "—"}
                </Text>
              </View>
            </View>
          </Card>

          {(["assets", "liabilities", "equity"] as const).map((section) => {
            const lines = balanceSheet.data?.[section] ?? [];
            if (lines.length === 0) return null;
            const total =
              section === "assets"
                ? balanceSheet.data?.total_assets
                : section === "liabilities"
                  ? balanceSheet.data?.total_liabilities
                  : undefined;
            return (
              <Card key={section} className="mt-2.5 overflow-hidden p-0">
                <View className="border-b border-foreground/[0.06] px-4 py-3">
                  <Text className="font-sans-semibold text-[13px] capitalize text-foreground">{section}</Text>
                </View>
                <View className="px-4">
                  {lines.map((line, i) => (
                    <View key={i} className="flex-row items-center gap-2.5 border-b border-foreground/[0.05] py-2.5">
                      <View className="h-[30px] w-[3px] rounded-pill bg-salli-accent" />
                      <Text className="flex-1 text-[12px] text-foreground/55">
                        {line.code} · {line.name}
                      </Text>
                      <Text className="font-sans-medium text-[12px] text-foreground">
                        Rs. {formatLKR(line.balance, 0)}
                      </Text>
                    </View>
                  ))}
                  {total ? (
                    <View className="flex-row justify-between py-2.5">
                      <Text className="font-sans-semibold text-[12px] text-foreground/40">Total {section}</Text>
                      <Text className="font-sans-bold text-[13px] text-foreground">Rs. {formatLKR(total, 0)}</Text>
                    </View>
                  ) : null}
                </View>
              </Card>
            );
          })}
        </View>
      ) : (
        <View className="px-4 pt-3">
          <Card className="p-5">
            <Text className="mb-1.5 text-[11px] font-sans-medium uppercase tracking-wide text-foreground/35">
              Current Net Worth
            </Text>
            <Text className="mb-1 font-sans-extrabold text-[32px] tracking-tight text-foreground">
              Rs. {netWorth.data ? formatLKR(netWorth.data.current_net_worth, 0) : "—"}
            </Text>
            <Text className="text-[11px] text-foreground/30">As of {netWorth.data?.as_of ?? "—"}</Text>
          </Card>
          {(netWorth.data?.trend ?? []).length === 0 ? (
            <Card className="mt-2.5 items-center p-6">
              <Text className="text-[13px] text-foreground/35">No history yet.</Text>
            </Card>
          ) : (
            <Card className="mt-2.5 overflow-hidden p-0">
              {(netWorth.data?.trend ?? []).slice(-12).map((point, i) => (
                <View key={i} className="flex-row justify-between border-b border-foreground/[0.05] px-4 py-2.5">
                  <Text className="text-[12px] text-foreground/50">{point.date}</Text>
                  <Text className="font-sans-medium text-[12px] text-foreground">Rs. {formatLKR(point.net_worth, 0)}</Text>
                </View>
              ))}
            </Card>
          )}
        </View>
      )}
    </PageShell>
  );
}
