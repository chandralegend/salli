import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { ScreenHeader } from "@/components/ui/screen-header";
import { useSubscriptionMutations, useSubscriptionReports, useSubscriptions } from "@/hooks/useSubscriptions";
import { formatLKR } from "@/lib/format";
import { useThemeColors } from "@/lib/theme";

export default function SubscriptionsScreen() {
  const colors = useThemeColors();
  const subscriptions = useSubscriptions();
  const reports = useSubscriptionReports();
  const { remove } = useSubscriptionMutations();

  const reportFor = (id: string) => reports.data?.find((r) => r.subscription_id === id);

  return (
    <PageShell>
      <ScreenHeader title="Subscriptions" back />

      <View className="gap-2 px-4 pt-3">
        {(subscriptions.data ?? []).length === 0 ? (
          <Card className="items-center p-6">
            <Text className="text-[13px] text-foreground/35">No subscriptions tracked yet.</Text>
          </Card>
        ) : (
          (subscriptions.data ?? []).map((s) => {
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
  );
}
