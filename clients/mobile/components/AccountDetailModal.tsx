import { ArrowDownLeft, ArrowUpRight, ChevronLeft, Pencil, Power, PowerOff } from "lucide-react-native";
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Modal as RNModal, Pressable, ScrollView, Text, View } from "react-native";

import { AddEditAccountDrawer } from "@/components/AddEditAccountDrawer";
import { Card } from "@/components/ui/card";
import {
  useAccountOverview,
  useDeactivateAccount,
  useReactivateAccount,
  type AccountTransaction,
} from "@/hooks/useLedger";
import { confirmDestructive } from "@/lib/confirm";
import { formatLKR, formatLKRAbbrev } from "@/lib/format";
import { useThemeColors, useThemeVars } from "@/lib/theme";
import { cn } from "@/lib/utils";

const PERIODS = ["1M", "3M", "YTD", "1Y", "All"] as const;

function periodStart(period: (typeof PERIODS)[number]): Date | null {
  const now = new Date();
  switch (period) {
    case "1M":
      return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    case "3M":
      return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    case "YTD":
      return new Date(now.getFullYear(), 0, 1);
    case "1Y":
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    default:
      return null;
  }
}

/** Account Detail — navy hero (balance + money in/out for the period) over a
 * running list of entries, backed by GET /accounts/{id}/overview. */
export function AccountDetailModal({
  visible,
  accountId,
  onClose,
}: {
  visible: boolean;
  accountId: string | null;
  onClose: () => void;
}) {
  const colors = useThemeColors();
  const themeVars = useThemeVars();
  const overview = useAccountOverview(accountId);
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>("3M");
  const [editOpen, setEditOpen] = useState(false);
  const deactivate = useDeactivateAccount();
  const reactivate = useReactivateAccount();

  const account = overview.data?.account;
  const activeToggling = deactivate.isPending || reactivate.isPending;

  const confirmToggleActive = () => {
    if (!account) return;
    if (account.is_active) {
      confirmDestructive({
        title: "Deactivate account",
        message: `Deactivate "${account.name}"? It will be hidden from account pickers but its history is kept.`,
        confirmLabel: "Deactivate",
        onConfirm: () => deactivate.mutate(account.id),
      });
    } else {
      Alert.alert("Reactivate account", `Reactivate "${account.name}"?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Reactivate", onPress: () => reactivate.mutate(account.id) },
      ]);
    }
  };

  // Chronological deltas from running balances → per-entry signed amount.
  const withDelta = useMemo(() => {
    const txs = overview.data?.transactions ?? [];
    let prev = 0;
    return txs.map((t) => {
      const bal = Number(t.running_balance);
      const delta = bal - prev;
      prev = bal;
      return { ...t, delta };
    });
  }, [overview.data]);

  const start = periodStart(period);
  const visibleTxs = useMemo(
    () => withDelta.filter((t) => !start || new Date(t.entry_date) >= start),
    [withDelta, start],
  );

  const moneyIn = visibleTxs.reduce((s, t) => s + Math.max(0, t.delta), 0);
  const moneyOut = visibleTxs.reduce((s, t) => s + Math.max(0, -t.delta), 0);
  const rows: (AccountTransaction & { delta: number })[] = [...visibleTxs].reverse();

  return (
    <RNModal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <View style={[{ flex: 1, backgroundColor: colors.background }, themeVars]}>
        <View className="flex-row items-center gap-3 px-5 pt-4">
          <Pressable onPress={onClose} className="h-9 w-9 items-center justify-center rounded-full bg-foreground/[0.08]">
            <ChevronLeft size={16} color={colors.foreground} strokeWidth={2} />
          </Pressable>
          <Text className="flex-1 font-sans-bold text-[20px] text-foreground">Account Detail</Text>
        </View>

        {overview.isLoading || !account ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <ScrollView className="flex-1 px-4 pt-3.5" contentContainerStyle={{ paddingBottom: 32 }}>
            {/* hero */}
            <Card className="bg-salli-navy-card p-[18px]">
              <View className="mb-3.5 flex-row items-start justify-between">
                <View className="flex-1">
                  <View className="mb-1.5 flex-row items-center gap-2">
                    <View className="rounded-[5px] bg-salli-accent/25 px-2 py-0.5">
                      <Text className="text-[10px] font-sans-semibold uppercase tracking-wide text-salli-accent">
                        {account.type}
                      </Text>
                    </View>
                    <Text className="text-[11px] text-white/30">
                      {account.code} · {account.currency}
                    </Text>
                  </View>
                  <Text className="mb-2 font-sans-bold text-[17px] text-white">{account.name}</Text>
                  <View className="flex-row items-baseline gap-1">
                    <Text className="font-sans-semibold text-[18px] text-white/40">Rs.</Text>
                    <Text className="font-sans-extrabold text-[40px] leading-none tracking-tighter text-white">
                      {formatLKRAbbrev(overview.data!.current_balance)}
                    </Text>
                  </View>
                  <Text className="mt-1 text-[11px] text-white/30">
                    Current balance · {account.is_active ? "Active" : "Inactive"}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setEditOpen(true)}
                  className="rounded-[10px] border border-white/[0.08] bg-white/[0.06] p-2.5"
                >
                  <Pencil size={20} color="rgba(255,255,255,0.4)" strokeWidth={1.8} />
                </Pressable>
              </View>
              <View className="flex-row gap-2">
                <View className="flex-1 rounded-[11px] bg-white/[0.06] px-3 py-2.5">
                  <Text className="mb-0.5 text-[10px] text-white/35">Money in ({period})</Text>
                  <Text className="font-sans-bold text-[14px] text-white">Rs. {formatLKRAbbrev(moneyIn)}</Text>
                </View>
                <View className="flex-1 rounded-[11px] bg-white/[0.06] px-3 py-2.5">
                  <Text className="mb-0.5 text-[10px] text-white/35">Money out ({period})</Text>
                  <Text className="font-sans-bold text-[14px] text-white/60">Rs. {formatLKRAbbrev(moneyOut)}</Text>
                </View>
              </View>
            </Card>

            {/* period chips */}
            <View className="mt-2.5 flex-row gap-1.5">
              {PERIODS.map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setPeriod(p)}
                  className={cn(
                    "rounded-pill px-3 py-1.5",
                    period === p ? "bg-salli-accent" : "border border-foreground/[0.08] bg-card",
                  )}
                >
                  <Text className={cn("text-[12px]", period === p ? "font-sans-semibold text-white" : "font-sans-medium text-foreground/40")}>
                    {p}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text className="mb-1.5 mt-3.5 pl-0.5 text-[11px] font-sans-semibold uppercase tracking-wide text-foreground/30">
              Entries · {visibleTxs.length}
            </Text>

            {rows.length === 0 ? (
              <Card className="items-center p-6">
                <Text className="text-[13px] text-foreground/35">No entries in this period.</Text>
              </Card>
            ) : (
              <View className="gap-1.5">
                {rows.map((t) => {
                  const inflow = t.delta >= 0;
                  return (
                    <Card key={t.entry_id} className="flex-row items-center gap-2.5 p-3">
                      <View className={cn("h-10 w-[3px] rounded-pill", inflow ? "bg-salli-accent" : "bg-foreground/15")} />
                      <View
                        className={cn(
                          "h-8 w-8 items-center justify-center rounded-[10px]",
                          inflow ? "bg-salli-accent/[0.12]" : "bg-foreground/[0.06]",
                        )}
                      >
                        {inflow ? (
                          <ArrowDownLeft size={14} color={colors.accent} strokeWidth={2} />
                        ) : (
                          <ArrowUpRight size={14} color={colors.mutedForeground} strokeWidth={2} />
                        )}
                      </View>
                      <View className="flex-1">
                        <Text numberOfLines={1} className="font-sans-semibold text-[13px] text-foreground">
                          {t.description}
                        </Text>
                        <Text className="mt-0.5 text-[11px] capitalize text-foreground/30">
                          {t.entry_date} · {t.source}
                        </Text>
                      </View>
                      <Text className={cn("font-sans-bold text-[13px]", inflow ? "text-foreground" : "text-foreground/60")}>
                        {inflow ? "+" : "−"}Rs. {formatLKR(Math.abs(t.delta), 0)}
                      </Text>
                    </Card>
                  );
                })}
              </View>
            )}

            {/* activation control */}
            <Pressable
              onPress={confirmToggleActive}
              disabled={activeToggling}
              className={cn(
                "mt-3 h-12 flex-row items-center justify-center gap-2 rounded-card border",
                account.is_active
                  ? "border-destructive/25 bg-destructive/[0.08]"
                  : "border-salli-accent/25 bg-salli-accent/[0.08]",
                activeToggling && "opacity-50",
              )}
            >
              {account.is_active ? (
                <>
                  <PowerOff size={15} color="#EF4444" strokeWidth={2} />
                  <Text className="font-sans-semibold text-[13px] text-destructive">Deactivate account</Text>
                </>
              ) : (
                <>
                  <Power size={15} color={colors.accent} strokeWidth={2} />
                  <Text className="font-sans-semibold text-[13px] text-salli-accent">Reactivate account</Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        )}
      </View>

      <AddEditAccountDrawer visible={editOpen} account={account} onClose={() => setEditOpen(false)} />
    </RNModal>
  );
}
