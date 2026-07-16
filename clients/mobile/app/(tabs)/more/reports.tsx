import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Download } from "lucide-react-native";
import { ScreenShell, CardContainer } from "@/components/ui/page-shell";
import { BentoTile } from "@/components/ui/bento-tile";
import { useBalanceSheet, useNetWorthStatement, useGoalProgressReport } from "@/hooks/useReports";
import { downloadReportCsv } from "@/hooks/useDataExport";
import { useThemeColors } from "@/lib/theme";

const MONO_MEDIUM = { fontFamily: "IBMPlexMono_500Medium" };

function fmt(v: string | number | null | undefined) {
  if (v === null || v === undefined) return "—";
  return Number(v).toLocaleString("en-LK", { minimumFractionDigits: 2 });
}

type ReportTab = "balance-sheet" | "net-worth" | "goal-progress";

function ExportButton({ reportType }: { reportType: ReportTab }) {
  const theme = useThemeColors();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setPending(true);
    setError(null);
    try {
      await downloadReportCsv(reportType);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <View className="items-end">
      <Pressable
        onPress={handleExport}
        disabled={pending}
        className="flex-row items-center gap-1.5 px-3.5 py-2 rounded-full border border-border bg-card active:bg-muted"
        style={{ opacity: pending ? 0.6 : 1 }}
      >
        <Download color={theme.foreground} size={14} />
        <Text className="text-foreground text-[12.5px]" style={{ fontFamily: "DMSans_700Bold" }}>
          {pending ? "Exporting…" : "Export CSV"}
        </Text>
      </Pressable>
      {error && <Text className="text-destructive text-[11px] mt-1">{error}</Text>}
    </View>
  );
}

export default function ReportsScreen() {
  const theme = useThemeColors();
  const [tab, setTab] = useState<ReportTab>("balance-sheet");

  const balanceSheet = useBalanceSheet();
  const netWorth = useNetWorthStatement();
  const goalProgress = useGoalProgressReport();

  return (
    <ScreenShell edges={["left", "right"]}>
      <Text className="text-muted-foreground text-[12.5px] mb-4">
        Balance sheet, net worth & goal progress — exportable as CSV
      </Text>

      <View className="flex-row bg-muted rounded-full p-1 gap-0.5 mb-5">
        <SegmentButton label="Balance Sheet" active={tab === "balance-sheet"} onPress={() => setTab("balance-sheet")} />
        <SegmentButton label="Net Worth" active={tab === "net-worth"} onPress={() => setTab("net-worth")} />
        <SegmentButton label="Goals" active={tab === "goal-progress"} onPress={() => setTab("goal-progress")} />
      </View>

      {/* ── Balance Sheet tab ── */}
      {tab === "balance-sheet" && (
        <View className="gap-3">
          <ExportButton reportType="balance-sheet" />
          {!balanceSheet.data ? (
            <ActivityIndicator color={theme.foreground} />
          ) : (
            <>
              <View className="flex-row flex-wrap gap-3">
                <BentoTile variant="teal" label="Total Assets" value={fmt(balanceSheet.data.total_assets)} style={{ flexBasis: "47%", flexGrow: 1 }} />
                <BentoTile variant="card" label="Total Liabilities" value={fmt(balanceSheet.data.total_liabilities)} style={{ flexBasis: "47%", flexGrow: 1 }} />
                <BentoTile variant="card" label="Total Equity" value={fmt(balanceSheet.data.total_equity)} style={{ flexBasis: "47%", flexGrow: 1 }} />
                <BentoTile variant="mint" label="Net Worth" value={fmt(balanceSheet.data.net_worth)} style={{ flexBasis: "47%", flexGrow: 1 }} />
              </View>
              {(["assets", "liabilities", "equity"] as const).map((section) => (
                <CardContainer key={section} title={section.charAt(0).toUpperCase() + section.slice(1)}>
                  {balanceSheet.data![section].length === 0 ? (
                    <Text className="text-center text-muted-foreground text-[13px] py-3">No accounts.</Text>
                  ) : (
                    balanceSheet.data![section].map((line, i, arr) => (
                      <View
                        key={line.account_id}
                        className={`flex-row items-center justify-between py-2 ${i === arr.length - 1 ? "" : "border-b border-border"}`}
                      >
                        <Text className="text-[12.5px] text-foreground flex-1 pr-2" numberOfLines={1}>
                          {line.code} — {line.name}
                        </Text>
                        <Text className="text-[12.5px] text-foreground" style={MONO_MEDIUM}>{fmt(line.balance)}</Text>
                      </View>
                    ))
                  )}
                </CardContainer>
              ))}
            </>
          )}
        </View>
      )}

      {/* ── Net Worth tab ── */}
      {tab === "net-worth" && (
        <View className="gap-3">
          <ExportButton reportType="net-worth" />
          {!netWorth.data ? (
            <ActivityIndicator color={theme.foreground} />
          ) : (
            <>
              <View className="flex-row gap-3">
                <BentoTile variant="teal" label="Current Net Worth" value={fmt(netWorth.data.current_net_worth)} style={{ flex: 1 }} />
                <BentoTile
                  variant="card"
                  label="As Of"
                  value={netWorth.data.as_of ? new Date(netWorth.data.as_of).toLocaleDateString() : "—"}
                  style={{ flex: 1 }}
                />
              </View>
              <CardContainer title="Trend">
                {netWorth.data.trend.length === 0 ? (
                  <Text className="text-center text-muted-foreground text-[13px] py-3">No history yet.</Text>
                ) : (
                  netWorth.data.trend.map((t, i, arr) => (
                    <View
                      key={i}
                      className={`flex-row items-center justify-between py-2 ${i === arr.length - 1 ? "" : "border-b border-border"}`}
                    >
                      <Text className="text-[12.5px] text-foreground">{t.date ? new Date(t.date).toLocaleDateString() : "—"}</Text>
                      <Text className="text-[12.5px] text-foreground" style={MONO_MEDIUM}>{fmt(t.net_worth)}</Text>
                    </View>
                  ))
                )}
              </CardContainer>
            </>
          )}
        </View>
      )}

      {/* ── Goal Progress tab ── */}
      {tab === "goal-progress" && (
        <View className="gap-3">
          <ExportButton reportType="goal-progress" />
          {!goalProgress.data ? (
            <ActivityIndicator color={theme.foreground} />
          ) : (
            <>
              <View className="flex-row gap-3">
                <BentoTile variant="mint" label="Completed Goals" value={String(goalProgress.data.completed_count)} style={{ flex: 1 }} />
                <BentoTile variant="card" label="In Progress" value={String(goalProgress.data.in_progress_count)} style={{ flex: 1 }} />
              </View>
              <CardContainer title="Goals">
                {goalProgress.data.goals.length === 0 ? (
                  <Text className="text-center text-muted-foreground text-[13px] py-3">No goals yet.</Text>
                ) : (
                  goalProgress.data.goals.map((g, i, arr) => (
                    <View
                      key={g.id}
                      className={`flex-row items-center justify-between py-2 ${i === arr.length - 1 ? "" : "border-b border-border"}`}
                    >
                      <Text className="text-[12.5px] text-foreground flex-1 pr-2" numberOfLines={1}>{g.name}</Text>
                      <Text className="text-[11.5px] text-muted-foreground mr-2" style={MONO_MEDIUM}>
                        {fmt(g.current_amount)} / {fmt(g.target_amount)}
                      </Text>
                      <View className={`px-2 py-0.5 rounded-full ${g.progress >= 1 ? "bg-emerald-100" : "bg-sky-100"}`}>
                        <Text className={`text-[11px] font-bold ${g.progress >= 1 ? "text-emerald-700" : "text-sky-700"}`}>
                          {(g.progress * 100).toFixed(0)}%
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </CardContainer>
            </>
          )}
        </View>
      )}
    </ScreenShell>
  );
}

function SegmentButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className={`flex-1 py-1.5 rounded-full items-center ${active ? "bg-card" : ""}`}>
      <Text
        className={`text-[12px] ${active ? "text-foreground" : "text-muted-foreground"}`}
        style={{ fontFamily: active ? "DMSans_700Bold" : "DMSans_500Medium" }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}
