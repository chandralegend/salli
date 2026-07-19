import { ShieldCheck } from "lucide-react-native";
import { Text, View } from "react-native";

import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { ScreenHeader } from "@/components/ui/screen-header";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

export default function AuditLogScreen() {
  const colors = useThemeColors();
  const entries = useAuditLog();

  return (
    <PageShell>
      <ScreenHeader title="Audit Log" back />

      <View className="gap-1.5 px-4 pt-3">
        {(entries.data ?? []).length === 0 ? (
          <Card className="items-center gap-2 p-6">
            <ShieldCheck size={20} color={colors.mutedForeground} strokeWidth={1.8} />
            <Text className="text-center text-[13px] text-foreground/35">
              No AI write actions recorded yet.
            </Text>
          </Card>
        ) : (
          (entries.data ?? []).map((e, i) => (
            <Card key={i} className="p-3.5">
              <View className="mb-1 flex-row items-center justify-between">
                <Text className="font-sans-semibold text-[13px] capitalize text-foreground">
                  {e.action.replace(/_/g, " ")}
                </Text>
                <View className={cn("rounded-[6px] px-2 py-0.5", e.decision === "approved" ? "bg-salli-accent/15" : "bg-destructive/15")}>
                  <Text className={cn("text-[10px] font-sans-semibold capitalize", e.decision === "approved" ? "text-salli-accent" : "text-destructive")}>
                    {e.decision}
                  </Text>
                </View>
              </View>
              <Text className="mb-1 text-[11px] text-foreground/30">{e.created_at}</Text>
              <Text numberOfLines={2} className="text-[11px] text-foreground/40">
                {JSON.stringify(e.params)}
              </Text>
            </Card>
          ))
        )}
      </View>
    </PageShell>
  );
}
