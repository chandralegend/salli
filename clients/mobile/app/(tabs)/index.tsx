import { View, Text, ActivityIndicator } from "react-native";
import { Link } from "expo-router";
import { ScreenShell, PageHeader, CardContainer } from "@/components/ui/page-shell";
import { BentoTile } from "@/components/ui/bento-tile";
import { PostingRow } from "@/components/PostingRow";
import { DeadlineChip } from "@/components/DeadlineChip";
import { AvatarMoreButton } from "@/components/layout/AvatarMoreButton";
import { useDashboard } from "@/hooks/useDashboard";
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
  const theme = useThemeColors();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const nw = compact(netWorth);
  const inc = compact(incomeYtd);
  const exp = compact(expensesYtd);
  const today = new Date().toLocaleDateString("en-LK", { month: "short", day: "numeric", year: "numeric" });

  return (
    <ScreenShell>
      <PageHeader title="Overview" subtitle={`${today} · LKR`} actions={<AvatarMoreButton />} />

      <View className="gap-3">
        <BentoTile
          variant="dark"
          label="Net Worth"
          sub="Total financial standing"
          value={loading ? "—" : nw.main}
          suffix={nw.suffix || undefined}
          minHeight={140}
        />

        <View className="flex-row gap-3">
          <BentoTile
            variant="lime"
            label="Income YTD"
            value={loading ? "—" : inc.main}
            suffix={inc.suffix || undefined}
            badge={loading ? undefined : "YTD"}
            style={{ flex: 1 }}
          />
          <BentoTile
            variant="teal"
            label="Expenses YTD"
            value={loading ? "—" : exp.main}
            suffix={exp.suffix || undefined}
            badge={loading ? undefined : "YTD"}
            style={{ flex: 1 }}
          />
        </View>

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
