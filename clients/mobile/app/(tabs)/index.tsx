import { View, Text, ActivityIndicator, Pressable } from "react-native";
import { Link, useRouter } from "expo-router";
import { Home, TrendingUp, Wallet, Activity } from "lucide-react-native";
import { ScreenShell, PageHeader, CardContainer } from "@/components/ui/page-shell";
import { BentoTile, useTileIconColor } from "@/components/ui/bento-tile";
import { SparklineWatermark, BarsWatermark, LandmarkWatermark } from "@/components/ui/card-watermarks";
import { PostingRow } from "@/components/PostingRow";
import { DeadlineChip } from "@/components/DeadlineChip";
import { AvatarMoreButton } from "@/components/layout/AvatarMoreButton";
import { useDashboard } from "@/hooks/useDashboard";
import { useTax } from "@/hooks/useTax";
import { useFiScore } from "@/hooks/useFi";
import { useThemeColors, useColorScheme } from "@/lib/theme";

function compact(s: string): { main: string; suffix: string } {
  const n = parseFloat(s.replace(/,/g, ""));
  if (!isFinite(n)) return { main: s, suffix: "" };
  if (Math.abs(n) >= 1_000_000) return { main: (n / 1_000_000).toFixed(2), suffix: "M" };
  if (Math.abs(n) >= 1_000) return { main: (n / 1_000).toFixed(0), suffix: "K" };
  return { main: s, suffix: "" };
}

export default function DashboardScreen() {
  const { loading, netWorth, incomeYtd, expensesYtd, upcomingReminders, recentEntries } = useDashboard();
  const { latest: latestTax } = useTax();
  const fiScore = useFiScore();
  const theme = useThemeColors();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const navyIconColor = useTileIconColor("navy");
  const greenIconColor = useTileIconColor("green");
  const purpleIconColor = useTileIconColor("purple");

  const s = fiScore.data;
  const fiScoreValue = s ? Math.round(Number(s.overall_score)) : 0;

  const nw = compact(netWorth);
  const inc = compact(incomeYtd);
  const exp = compact(expensesYtd);
  const today = new Date().toLocaleDateString("en-LK", { month: "short", day: "numeric", year: "numeric" });

  return (
    <ScreenShell>
      <PageHeader title="Overview" subtitle={`${today} · LKR`} actions={<AvatarMoreButton />} />

      <View className="gap-3">
        <BentoTile
          variant="navy"
          label="Net Worth"
          sub="Total financial standing"
          value={loading ? "—" : nw.main}
          suffix={nw.suffix || undefined}
          minHeight={140}
          icon={<Home size={15} color={navyIconColor} strokeWidth={2} />}
          watermark={<SparklineWatermark />}
        />

        <View className="flex-row gap-3">
          <BentoTile
            variant="green"
            label="Income YTD"
            value={loading ? "—" : inc.main}
            suffix={inc.suffix || undefined}
            badge={loading ? undefined : "YTD"}
            style={{ flex: 1 }}
            icon={<TrendingUp size={15} color={greenIconColor} strokeWidth={2} />}
            watermark={<BarsWatermark />}
          />
          <BentoTile
            variant="purple"
            label="Expenses YTD"
            value={loading ? "—" : exp.main}
            suffix={exp.suffix || undefined}
            badge={loading ? undefined : "YTD"}
            style={{ flex: 1 }}
            icon={<Wallet size={15} color={purpleIconColor} strokeWidth={2} />}
          />
        </View>

        {/* Tax Payable — mirrors clients/web dashboard's gold Tax Payable tile */}
        <Pressable
          onPress={() => router.push("/(tabs)/more/tax")}
          className="rounded-[20px] overflow-hidden p-[18px]"
          style={{ backgroundColor: "#e7bd61" }}
        >
          <View style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} pointerEvents="none">
            <LandmarkWatermark />
          </View>
          <Text style={{ fontSize: 10.5, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", color: "rgba(23,18,8,0.55)" }}>
            Tax Payable
          </Text>
          <Text style={{ fontSize: 11, color: "rgba(23,18,8,0.5)", marginTop: 3 }}>
            Assessment Year 2025/26 · due Sep 30, 2026
          </Text>
          {latestTax.isLoading ? (
            <ActivityIndicator color="#171208" style={{ marginTop: 14, alignSelf: "flex-start" }} />
          ) : (
            <Text style={{ fontSize: 28, fontWeight: "900", letterSpacing: -1, color: "#171208", marginTop: 14, marginBottom: 6 }}>
              {latestTax.data?.tax_payable ?? "—"} <Text style={{ fontSize: 14 }}>LKR</Text>
            </Text>
          )}
          <Text style={{ fontSize: 12, fontWeight: "800", color: "#171208" }}>View full breakdown →</Text>
        </Pressable>

        {/* FI Score — mirrors clients/web dashboard's dark FI Score tile */}
        <Pressable
          onPress={() => router.push("/(tabs)/financial-independence")}
          className="rounded-card p-5"
          style={{ backgroundColor: "#010001" }}
        >
          <View className="flex-row items-center gap-2 mb-1">
            <Activity size={14} color="#E8FC85" />
            <Text style={{ fontSize: 10.5, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>
              FI Score
            </Text>
          </View>
          {fiScore.isLoading || !s ? (
            <ActivityIndicator color="#E8FC85" style={{ marginTop: 8, alignSelf: "flex-start" }} />
          ) : (
            <>
              <View className="flex-row items-baseline gap-1.5 mb-1 mt-1">
                <Text style={{ fontSize: 44, fontWeight: "900", letterSpacing: -1.5, color: "#E8FC85", lineHeight: 48 }}>
                  {fiScoreValue}
                </Text>
                <Text style={{ fontSize: 15, fontWeight: "600", color: "rgba(255,255,255,0.25)" }}>/100</Text>
              </View>
              <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", marginBottom: 14 }}>
                {s.grade} · Standard FIRE
              </Text>
              <View className="gap-2.5 mb-4">
                {s.components.slice(0, 3).map((c) => {
                  const v = Number(c.score);
                  const amber = v < 50;
                  return (
                    <View key={c.key} className="flex-row items-center justify-between gap-2">
                      <Text style={{ fontSize: 11.5, color: "rgba(255,255,255,0.45)", width: 92 }} numberOfLines={1}>
                        {c.label}
                      </Text>
                      <View style={{ flex: 1, height: 3, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 999, overflow: "hidden" }}>
                        <View style={{ width: `${v}%`, height: "100%", backgroundColor: amber ? "#F59E0B" : "#E8FC85", borderRadius: 999 }} />
                      </View>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: amber ? "#F59E0B" : "rgba(255,255,255,0.5)", width: 22, textAlign: "right" }}>
                        {v.toFixed(0)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}
          <Text style={{ fontSize: 12, fontWeight: "800", color: "#E8FC85" }}>View FIRE strategy →</Text>
        </Pressable>

        <CardContainer>
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-foreground text-[14px]" style={{ fontFamily: "DMSans_700Bold", letterSpacing: -0.3 }}>
              Recent Entries
            </Text>
            <Link href="/(tabs)/ledger" asChild>
              <Text className="text-muted-foreground text-[13px]" style={{ fontFamily: "DMSans_600SemiBold" }}>
                All
              </Text>
            </Link>
          </View>
          {loading ? (
            <ActivityIndicator color={theme.foreground} />
          ) : recentEntries.length === 0 ? (
            <View className="items-center gap-2 py-6">
              <Text className="text-[13px] font-medium text-foreground">No transactions yet</Text>
              <Text className="text-[12px] text-muted-foreground">Upload a bank statement on the web app to get started</Text>
            </View>
          ) : (
            recentEntries.map((entry, i) => {
              const fp = entry.postings[0];
              if (!fp) return null;
              return (
                <PostingRow
                  key={entry.id}
                  date={entry.entry_date}
                  description={entry.description}
                  amount={fp.amount}
                  isCredit={fp.direction === -1}
                  currency={fp.currency}
                  isLast={i === recentEntries.length - 1}
                />
              );
            })
          )}
        </CardContainer>

        <CardContainer>
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-foreground text-[14px]" style={{ fontFamily: "DMSans_700Bold", letterSpacing: -0.3 }}>
              Deadlines
            </Text>
            <Link href="/(tabs)/more/reminders" asChild>
              <Text className="text-muted-foreground text-[13px]" style={{ fontFamily: "DMSans_600SemiBold" }}>
                All
              </Text>
            </Link>
          </View>
          {upcomingReminders.length === 0 ? (
            <View className="items-center py-4">
              <Text className="text-[13px] text-muted-foreground">No upcoming deadlines</Text>
            </View>
          ) : (
            <View className="gap-2">
              {upcomingReminders.map((r) => {
                const isOverdue = r.status !== "done" && new Date(r.due_date) < new Date();
                const isDueSoon = !isOverdue && new Date(r.due_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                return (
                  <View
                    key={r.id}
                    className="flex-row items-center justify-between p-3 rounded-2xl"
                    style={{
                      backgroundColor: isOverdue
                        ? (isDark ? "#4C0519" : "#FEE2E2")
                        : isDueSoon
                          ? (isDark ? "#451A03" : "#FEF3C7")
                          : theme.muted,
                    }}
                  >
                    <View>
                      <Text
                        className="text-[13px]"
                        style={{
                          fontFamily: "DMSans_700Bold",
                          color: isOverdue
                            ? (isDark ? "#FDA4AF" : "#7F1D1D")
                            : isDueSoon
                              ? (isDark ? "#FCD34D" : "#78350F")
                              : theme.foreground,
                        }}
                      >
                        {r.kind}
                      </Text>
                      <Text
                        className="text-[11.5px] mt-0.5"
                        style={{
                          color: isOverdue
                            ? (isDark ? "#FB7185" : "#B91C1C")
                            : isDueSoon
                              ? "#B45309"
                              : theme.mutedForeground,
                        }}
                      >
                        {new Date(r.due_date).toLocaleDateString("en-LK", { month: "short", day: "numeric" })}
                      </Text>
                    </View>
                    <DeadlineChip dueDate={r.due_date} done={r.status === "done"} />
                  </View>
                );
              })}
            </View>
          )}
        </CardContainer>
      </View>
    </ScreenShell>
  );
}
