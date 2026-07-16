import { useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { Search } from "lucide-react-native";
import { ScreenShell, CardContainer } from "@/components/ui/page-shell";
import { TextField } from "@/components/ui/text-field";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useThemeColors } from "@/lib/theme";

const MONO_MEDIUM = { fontFamily: "IBMPlexMono_500Medium" };

function fmtDate(s: string) {
  return new Date(s).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AuditLogScreen() {
  const theme = useThemeColors();
  const [search, setSearch] = useState("");
  const auditLog = useAuditLog();

  const entries = (auditLog.data ?? []).filter((e) =>
    search ? e.action.toLowerCase().includes(search.toLowerCase()) : true,
  );

  return (
    <ScreenShell edges={["left", "right"]}>
      <Text className="text-muted-foreground text-[12.5px] mb-4">
        Every agent-initiated write, approved or denied
      </Text>

      <View className="relative mb-4">
        <View className="absolute left-3.5 top-0 bottom-0 justify-center z-10">
          <Search size={15} color={theme.mutedForeground} />
        </View>
        <TextField className="pl-10" placeholder="Search actions…" value={search} onChangeText={setSearch} />
      </View>

      <CardContainer className="p-0" style={{ padding: 0, overflow: "hidden" }}>
        {auditLog.isLoading ? (
          <View className="py-8"><ActivityIndicator color={theme.foreground} /></View>
        ) : entries.length === 0 ? (
          <View className="items-center gap-2 py-8">
            <Text className="text-[13px] font-medium text-foreground">No agent write actions recorded yet</Text>
          </View>
        ) : (
          entries.map((e, i) => (
            <View
              key={e.id}
              className={`px-5 py-3.5 ${i === entries.length - 1 ? "" : "border-b border-border"}`}
            >
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-foreground text-[13px]" style={MONO_MEDIUM} numberOfLines={1}>
                  {e.action}
                </Text>
                <View className={`px-2 py-0.5 rounded-full ${e.decision === "approved" ? "bg-emerald-100" : "bg-rose-100"}`}>
                  <Text className={`text-[10.5px] font-bold ${e.decision === "approved" ? "text-emerald-700" : "text-rose-700"}`}>
                    {e.decision}
                  </Text>
                </View>
              </View>
              <Text className="text-muted-foreground text-[11px]" style={MONO_MEDIUM} numberOfLines={2}>
                {JSON.stringify(e.params)}
              </Text>
              <Text className="text-muted-foreground text-[10.5px] mt-1">{fmtDate(e.created_at)}</Text>
            </View>
          ))
        )}
      </CardContainer>
    </ScreenShell>
  );
}
