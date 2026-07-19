import { AlertTriangle, Shield, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { ScreenHeader } from "@/components/ui/screen-header";
import { useCoverageReport, useInsuranceMutations, usePolicies, useTargets } from "@/hooks/useInsurance";
import { formatLKR, formatLKRAbbrev } from "@/lib/format";
import { useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

const TABS = ["Policies", "Targets", "Coverage Report"] as const;

export default function InsuranceScreen() {
  const colors = useThemeColors();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Policies");
  const policies = usePolicies();
  const targets = useTargets();
  const report = useCoverageReport();
  const { deletePolicy, deleteTarget } = useInsuranceMutations();

  return (
    <PageShell>
      <ScreenHeader title="Insurance" back />

      <View className="mx-4 mt-3 flex-row border-b border-foreground/[0.08]">
        {TABS.map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} className={cn("px-3.5 py-2", tab === t && "border-b-2 border-salli-accent")}>
            <Text className={cn("text-[13px]", tab === t ? "font-sans-semibold text-foreground" : "font-sans-medium text-foreground/35")}>
              {t}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === "Policies" ? (
        <View className="gap-1.5 px-4 pt-3">
          {(policies.data ?? []).length === 0 ? (
            <Card className="items-center p-6">
              <Text className="text-[13px] text-foreground/35">No policies yet.</Text>
            </Card>
          ) : (
            (policies.data ?? []).map((p) => (
              <Card key={p.id} className="flex-row items-center gap-2.5 p-3.5">
                <View className="h-9 w-9 items-center justify-center rounded-[11px] bg-salli-accent/[0.12]">
                  <Shield size={15} color={colors.accent} strokeWidth={2} />
                </View>
                <View className="flex-1">
                  <Text className="font-sans-semibold text-[13px] text-foreground">{p.name}</Text>
                  <Text className="text-[11px] capitalize text-foreground/30">
                    {p.policy_type} · {p.provider} · expires {p.expiry_date}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="font-sans-semibold text-[13px] text-foreground">Rs. {formatLKRAbbrev(p.coverage_amount)}</Text>
                  <Pressable onPress={() => deletePolicy.mutate(p.id)} className="mt-1">
                    <Trash2 size={13} color={colors.mutedForeground} strokeWidth={2} />
                  </Pressable>
                </View>
              </Card>
            ))
          )}
        </View>
      ) : null}

      {tab === "Targets" ? (
        <View className="gap-1.5 px-4 pt-3">
          {(targets.data ?? []).length === 0 ? (
            <Card className="items-center p-6">
              <Text className="text-[13px] text-foreground/35">No coverage targets declared.</Text>
            </Card>
          ) : (
            (targets.data ?? []).map((t) => (
              <Card key={t.policy_type} className="flex-row items-center justify-between p-3.5">
                <Text className="font-sans-semibold text-[13px] capitalize text-foreground">{t.policy_type}</Text>
                <View className="flex-row items-center gap-3">
                  <Text className="font-sans-semibold text-[13px] text-foreground">Rs. {formatLKRAbbrev(t.target_amount)}</Text>
                  <Pressable onPress={() => deleteTarget.mutate(t.policy_type)}>
                    <Trash2 size={13} color={colors.mutedForeground} strokeWidth={2} />
                  </Pressable>
                </View>
              </Card>
            ))
          )}
        </View>
      ) : null}

      {tab === "Coverage Report" ? (
        <View className="gap-2.5 px-4 pt-3">
          {report.data?.lines.length ? (
            <Card className="overflow-hidden p-0">
              {report.data.lines.map((line, i) => (
                <View key={i} className={cn("flex-row items-center justify-between px-4 py-3", i < report.data!.lines.length - 1 && "border-b border-foreground/[0.05]")}>
                  <Text className="font-sans-medium text-[13px] capitalize text-foreground">{line.policy_type}</Text>
                  <Text className={cn("font-sans-semibold text-[13px]", Number(line.gap) > 0 ? "text-destructive" : "text-salli-accent")}>
                    Gap Rs. {formatLKR(line.gap, 0)}
                  </Text>
                </View>
              ))}
            </Card>
          ) : (
            <Card className="items-center p-6">
              <Text className="text-[13px] text-foreground/35">No coverage targets declared.</Text>
            </Card>
          )}

          {(report.data?.missing_types.length ?? 0) > 0 ? (
            <Card className="flex-row items-start gap-2 border-destructive/25 bg-destructive/5 p-3.5">
              <AlertTriangle size={14} color="#EF4444" strokeWidth={2} />
              <Text className="flex-1 text-[12px] text-destructive">
                Missing coverage: {report.data!.missing_types.join(", ")}
              </Text>
            </Card>
          ) : null}

          {(report.data?.expiring_soon.length ?? 0) > 0 ? (
            <Card className="overflow-hidden p-0">
              <View className="border-b border-foreground/[0.06] px-4 py-3">
                <Text className="font-sans-semibold text-[13px] text-foreground">Expiring Soon</Text>
              </View>
              {report.data!.expiring_soon.map((e, i) => (
                <View key={i} className="flex-row items-center justify-between px-4 py-3">
                  <Text className="text-[13px] text-foreground">{e.policy_name}</Text>
                  <Text className="text-[12px] text-foreground/40">{e.days_until_expiry} days</Text>
                </View>
              ))}
            </Card>
          ) : null}
        </View>
      ) : null}
    </PageShell>
  );
}
