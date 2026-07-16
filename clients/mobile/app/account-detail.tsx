import { View, Text, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { CardContainer, SectionTitle } from "@/components/ui/page-shell";
import { useAccountOverview } from "@/hooks/useLedger";
import { useThemeColors } from "@/lib/theme";

const MONO_MEDIUM = { fontFamily: "IBMPlexMono_500Medium" };

function fmt(v: string | number) {
  return Number(v).toLocaleString("en-LK", { minimumFractionDigits: 2 });
}

export default function AccountDetailScreen() {
  const theme = useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const overview = useAccountOverview(id ?? null);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <View className="flex-row items-center gap-3 px-5 pt-2 pb-4">
        <Pressable
          onPress={() => router.back()}
          className="w-9 h-9 rounded-full items-center justify-center active:bg-muted -ml-2"
        >
          <ArrowLeft color={theme.foreground} size={19} />
        </Pressable>
        <Text className="text-foreground text-[16px]" style={{ fontFamily: "DMSans_900Black" }}>
          Account
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 0, paddingBottom: 40 }}>
        {overview.isLoading ? (
          <View className="py-12"><ActivityIndicator color={theme.foreground} /></View>
        ) : overview.isError ? (
          <CardContainer>
            <Text className="text-center text-muted-foreground text-[13px] py-4">
              Account not found, or you don&apos;t have access to it.
            </Text>
          </CardContainer>
        ) : overview.data ? (
          <>
            <View className="flex-row items-center gap-1.5 mb-1.5">
              <Text className="text-muted-foreground text-[12px]" style={MONO_MEDIUM}>
                {overview.data.account.code}
              </Text>
              <View className="px-1.5 py-0.5 rounded-full bg-muted">
                <Text className="text-[10.5px] font-bold text-muted-foreground capitalize">
                  {overview.data.account.type}
                </Text>
              </View>
              <View className={`px-1.5 py-0.5 rounded-full ${overview.data.account.is_active ? "bg-emerald-100" : "bg-muted"}`}>
                <Text className={`text-[10.5px] font-bold ${overview.data.account.is_active ? "text-emerald-700" : "text-muted-foreground"}`}>
                  {overview.data.account.is_active ? "Active" : "Inactive"}
                </Text>
              </View>
            </View>
            <Text
              className="text-foreground mb-5"
              style={{ fontFamily: "DMSans_900Black", fontSize: 24, letterSpacing: -0.6 }}
            >
              {overview.data.account.name}
            </Text>

            <View
              className="rounded-2xl px-5 py-4 mb-5"
              style={{ backgroundColor: "#010001" }}
            >
              <Text className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "rgba(240,238,232,0.6)" }}>
                Current Balance
              </Text>
              <Text className="text-[26px] font-black mt-1" style={[MONO_MEDIUM, { color: "#E8FC85" }]}>
                {overview.data.account.currency} {fmt(overview.data.current_balance)}
              </Text>
            </View>

            <SectionTitle>Transactions</SectionTitle>
            <CardContainer className="p-0" style={{ padding: 0, overflow: "hidden" }}>
              {overview.data.transactions.length === 0 ? (
                <View className="items-center py-8">
                  <Text className="text-[13px] font-medium text-foreground">No transactions yet</Text>
                </View>
              ) : (
                [...overview.data.transactions].reverse().map((t, i, arr) => {
                  const priorBalance = i < arr.length - 1 ? Number(arr[i + 1].running_balance) : 0;
                  const delta = Number(t.running_balance) - priorBalance;
                  return (
                    <View
                      key={`${t.entry_id}-${i}`}
                      className={`px-4 py-3 ${i === arr.length - 1 ? "" : "border-b border-border"}`}
                    >
                      <View className="flex-row items-center justify-between mb-1">
                        <Text className="text-[13px] text-foreground flex-1 pr-2" numberOfLines={1} style={{ fontFamily: "DMSans_700Bold" }}>
                          {t.description}
                        </Text>
                        <Text className={`text-[13px] ${delta < 0 ? "text-destructive" : "text-emerald-600"}`} style={MONO_MEDIUM}>
                          {delta >= 0 ? "+" : ""}{fmt(delta)}
                        </Text>
                      </View>
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center gap-1.5">
                          <Text className="text-[11px] text-muted-foreground" style={MONO_MEDIUM}>{t.entry_date}</Text>
                          <View className="px-1.5 py-0.5 rounded-full bg-muted">
                            <Text className="text-[10px] font-medium text-muted-foreground capitalize">{t.source}</Text>
                          </View>
                        </View>
                        <Text className="text-[11px] text-muted-foreground" style={MONO_MEDIUM}>
                          bal. {fmt(t.running_balance)}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </CardContainer>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
