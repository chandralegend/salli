import { ArrowDownLeft, ArrowUpRight, Pencil, Power, PowerOff } from "lucide-react-native";
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";

import { AddEditAccountDrawer } from "@/components/AddEditAccountDrawer";
import { Card } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import {
  useAccountOverview,
  useDeactivateAccount,
  useReactivateAccount,
  type AccountTransaction,
} from "@/hooks/useLedger";
import { confirmDestructive } from "@/lib/confirm";
import { formatLKR, formatLKRAbbrev } from "@/lib/format";
import { useThemeColors } from "@/lib/theme";
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
    <Drawer visible={visible} onClose={onClose} title="Account Detail" keyboardAvoiding={false}>
      <>
        {overview.isLoading || !account ? (
          <View className="items-center justify-center py-16">
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <View className="gap-0">
            {/* hero */}
            <Card className="bg-salli-hero p-[18px]">
              <View className="mb-3.5 flex-row items-start justify-between">
                <View className="flex-1">
                  <View className="mb-1.5 flex-row items-center gap-2">
                    <View className="rounded-badge border-[1.5px] border-salli-accent bg-salli-accent/25 px-2 py-0.5">
                      <Text className="text-[11px] font-mono uppercase tracking-widest text-salli-accent">
                        {account.type}
                      </Text>
                    </View>
                    <Text className="text-[14px] text-white/30">
                      {account.code} · {account.currency}
                    </Text>
                  </View>
                  <Text className="mb-2 font-sans-bold text-[19px] text-white">{account.name}</Text>
                  <View className="flex-row items-baseline gap-1">
                    <Text className="font-sans-semibold text-[20px] text-white/40">Rs.</Text>
                    <Text className="font-sans-extrabold text-[40px] leading-none tracking-tighter text-white">
                      {formatLKRAbbrev(overview.data!.current_balance)}
                    </Text>
                  </View>
                  <Text className="mt-1 text-[14px] text-white/30">
                    Current balance · {account.is_active ? "Active" : "Inactive"}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setEditOpen(true)}
                  className="rounded-card border border-white/[0.08] bg-white/[0.06] p-2.5"
                >
                  <Pencil size={22} color="rgba(255,255,255,0.4)" strokeWidth={1.8} />
                </Pressable>
              </View>
              <View className="flex-row gap-2">
                <View className="flex-1 rounded-card bg-white/[0.06] px-3 py-2.5">
                  <Text className="mb-0.5 text-[13px] text-white/35">Money in ({period})</Text>
                  <Text className="font-sans-bold text-[16px] text-white">Rs. {formatLKRAbbrev(moneyIn)}</Text>
                </View>
                <View className="flex-1 rounded-card bg-white/[0.06] px-3 py-2.5">
                  <Text className="mb-0.5 text-[13px] text-white/35">Money out ({period})</Text>
                  <Text className="font-sans-bold text-[16px] text-white/60">Rs. {formatLKRAbbrev(moneyOut)}</Text>
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
                    period === p ? "bg-salli-accent" : "border-2 border-foreground bg-card",
                  )}
                >
                  <Text className={cn("text-[15px]", period === p ? "font-sans-semibold text-white" : "font-sans-medium text-muted-foreground")}>
                    {p}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text className="mb-1.5 mt-3.5 pl-0.5 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
              Entries · {visibleTxs.length}
            </Text>

            {rows.length === 0 ? (
              <Card className="items-center p-6">
                <Text className="text-[15px] text-muted-foreground">No entries in this period.</Text>
              </Card>
            ) : (
              <View className="gap-3.5">
                {rows.map((t) => {
                  const inflow = t.delta >= 0;
                  return (
                    <Card key={t.entry_id} className="flex-row items-center gap-2.5 p-3">
                      <View className={cn("h-10 w-[3px] rounded-pill", inflow ? "bg-salli-accent" : "bg-foreground/15")} />
                      <View
                        className={cn(
                          "h-8 w-8 items-center justify-center rounded-card",
                          inflow ? "bg-salli-accent/[0.12]" : "bg-foreground/[0.06]",
                        )}
                      >
                        {inflow ? (
                          <ArrowDownLeft size={16} color={colors.accent} strokeWidth={2} />
                        ) : (
                          <ArrowUpRight size={16} color={colors.mutedForeground} strokeWidth={2} />
                        )}
                      </View>
                      <View className="flex-1">
                        <Text numberOfLines={1} className="font-sans-semibold text-[15px] text-foreground">
                          {t.description}
                        </Text>
                        <Text className="mt-0.5 text-[14px] capitalize text-muted-foreground">
                          {t.entry_date} · {t.source}
                        </Text>
                      </View>
                      <Text className={cn("font-sans-bold text-[15px]", inflow ? "text-foreground" : "text-foreground/60")}>
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
                  <PowerOff size={17} color="#EF4444" strokeWidth={2} />
                  <Text className="font-sans-semibold text-[15px] text-destructive">Deactivate account</Text>
                </>
              ) : (
                <>
                  <Power size={17} color={colors.accent} strokeWidth={2} />
                  <Text className="font-sans-semibold text-[15px] text-salli-accent">Reactivate account</Text>
                </>
              )}
            </Pressable>
          </View>
        )}
      </>

      <AddEditAccountDrawer visible={editOpen} account={account} onClose={() => setEditOpen(false)} />
    </Drawer>
  );
}
