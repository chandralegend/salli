import { AlertTriangle, Plus, RefreshCw, Trash2 } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { ScreenHeader } from "@/components/ui/screen-header";
import { useSubscriptionMutations, useSubscriptionReports, useSubscriptions } from "@/hooks/useSubscriptions";
import { formatLKR, formatLKRAbbrev } from "@/lib/format";
import { useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** Normalises any billing cadence to a monthly-equivalent amount. */
function monthlyEquivalent(amount: number, frequency: string): number {
  const f = frequency.toLowerCase();
  if (f === "annual" || f === "yearly") return amount / 12;
  if (f === "weekly") return (amount * 52) / 12;
  if (f === "quarterly") return amount / 3;
  return amount; // monthly
}

export default function SubscriptionsScreen() {
  const colors = useThemeColors();
  const subscriptions = useSubscriptions();
  const reports = useSubscriptionReports();
  const { remove } = useSubscriptionMutations();

  const reportFor = (id: string) => reports.data?.find((r) => r.subscription_id === id);

  const active = (subscriptions.data ?? []).filter((s) => s.is_active);
  const monthlyTotal = active.reduce((sum, s) => sum + monthlyEquivalent(Number(s.amount), s.frequency), 0);
  const alertCount = (reports.data ?? []).reduce((n, r) => n + r.alerts.length, 0);

  return (
    <View className="flex-1">
      <PageShell>
        <ScreenHeader
          title="Subscriptions"
          back
          trailing={
            <Pressable className="h-[34px] w-[34px] items-center justify-center rounded-full bg-salli-accent">
              <Plus size={14} color="#FFFFFF" strokeWidth={2.5} />
            </Pressable>
          }
        />

        {/* hero — monthly recurring cost */}
        <View className="px-4 pt-3">
          <Card className="bg-salli-navy-card p-[18px]">
            <Text className="mb-1.5 text-[11px] font-sans-medium uppercase tracking-wide text-white/50">
              Monthly Recurring
            </Text>
            <View className="mb-1 flex-row items-baseline gap-1">
              <Text className="font-sans-semibold text-[18px] text-white/40">Rs.</Text>
              <Text className="font-sans-extrabold text-[40px] leading-none tracking-tighter text-white">
                {formatLKRAbbrev(monthlyTotal)}
              </Text>
            </View>
            <View className="mb-3.5 flex-row">
              <View
                className={cn(
                  "rounded-pill border px-2.5 py-0.5",
                  alertCount > 0
                    ? "border-destructive/25 bg-destructive/10"
                    : "border-salli-accent/20 bg-salli-accent/15",
                )}
              >
                <Text
                  className={cn(
                    "text-[11px] font-sans-semibold",
                    alertCount > 0 ? "text-destructive" : "text-salli-accent",
                  )}
                >
                  {alertCount > 0 ? `${alertCount} alert${alertCount === 1 ? "" : "s"}` : "All healthy"}
                </Text>
              </View>
            </View>
            <View className="flex-row gap-1.5">
              <View className="flex-1 rounded-control bg-white/[0.06] p-2.5">
                <Text className="mb-1 text-[10px] text-white/35">Active</Text>
                <Text className="font-sans-bold text-[13px] text-white">{active.length}</Text>
              </View>
              <View className="flex-1 rounded-control bg-white/[0.06] p-2.5">
                <Text className="mb-1 text-[10px] text-white/35">Annualised</Text>
                <Text className="font-sans-bold text-[13px] text-white">Rs. {formatLKRAbbrev(monthlyTotal * 12)}</Text>
              </View>
              <View className="flex-1 rounded-control bg-white/[0.06] p-2.5">
                <Text className="mb-1 text-[10px] text-white/35">Alerts</Text>
                <Text className={cn("font-sans-bold text-[13px]", alertCount > 0 ? "text-destructive" : "text-white")}>
                  {alertCount}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        <Text className="mb-1.5 mt-3 px-4 pl-[18px] text-[11px] font-sans-semibold uppercase tracking-wide text-foreground/30">
          Active Subscriptions
        </Text>

        <View className="gap-2 px-4">
          {active.length === 0 ? (
            <Card className="items-center p-6">
              <Text className="text-[13px] text-foreground/35">No subscriptions tracked yet.</Text>
            </Card>
          ) : (
            active.map((s) => {
              const report = reportFor(s.id);
              return (
                <Card key={s.id} className="p-3.5">
                  <View className="flex-row items-center gap-2.5">
                    <View className="h-9 w-9 items-center justify-center rounded-[11px] bg-foreground/[0.06]">
                      <RefreshCw size={14} color={colors.mutedForeground} strokeWidth={2} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-sans-semibold text-[13px] text-foreground">{s.name}</Text>
                      <Text className="text-[11px] capitalize text-foreground/30">
                        {s.frequency} · next {s.next_due_date}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="font-sans-semibold text-[13px] text-foreground">Rs. {formatLKR(s.amount, 0)}</Text>
                      <Pressable onPress={() => remove.mutate(s.id)} className="mt-1">
                        <Trash2 size={13} color={colors.mutedForeground} strokeWidth={2} />
                      </Pressable>
                    </View>
                  </View>
                  {report?.alerts.length ? (
                    <View className="mt-2.5 gap-1.5 border-t border-foreground/[0.06] pt-2.5">
                      {report.alerts.map((a, i) => (
                        <View key={i} className="flex-row items-center gap-1.5">
                          <AlertTriangle size={12} color="#EF4444" strokeWidth={2} />
                          <Text className="flex-1 text-[11px] text-destructive">{a.message}</Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View className="mt-2.5 border-t border-foreground/[0.06] pt-2.5">
                      <Text className="text-[11px] text-salli-accent">No alerts</Text>
                    </View>
                  )}
                </Card>
              );
            })
          )}
        </View>
      </PageShell>
    </View>
  );
}
