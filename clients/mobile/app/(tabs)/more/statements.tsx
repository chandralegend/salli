import * as DocumentPicker from "expo-document-picker";
import { LinearGradient } from "expo-linear-gradient";
import { Check, CreditCard, Lock, MoreHorizontal, Search, SlidersHorizontal, Upload } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { PillButton } from "@/components/ui/pill-button";
import { ScreenHeader } from "@/components/ui/screen-header";
import { usePendingStatement, usePostStatement, uploadStatement } from "@/hooks/useStatements";
import { formatLKR } from "@/lib/format";
import { useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

const TABS = ["Review", "History", "Banks"] as const;
const STATUS = ["All", "Pending", "Matched", "Skipped"] as const;

export default function StatementsScreen() {
  const colors = useThemeColors();
  const [statementId, setStatementId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [approved, setApproved] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<(typeof TABS)[number]>("Review");
  const [status, setStatus] = useState<(typeof STATUS)[number]>("Pending");
  const [search, setSearch] = useState("");

  const pending = usePendingStatement(statementId);
  const postStatement = usePostStatement(statementId);

  const handleUpload = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    });
    if (result.canceled) return;
    const file = result.assets[0];
    setUploading(true);
    try {
      const { statement_id } = await uploadStatement(file.uri, file.name, file.mimeType ?? "application/octet-stream", "unknown");
      setStatementId(statement_id);
      setApproved(new Set());
    } finally {
      setUploading(false);
    }
  };

  const toggle = (id: string) => {
    setApproved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const transactions = pending.data?.transactions ?? [];
  const isMatched = (t: (typeof transactions)[number]) => Boolean(t.debit_account_id && t.credit_account_id);
  const imported = transactions.length;
  const matched = transactions.filter(isMatched).length;
  const unmatched = imported - matched;

  const visible = transactions.filter((t) => {
    if (status === "Pending" && isMatched(t)) return false;
    if (status === "Matched" && !isMatched(t)) return false;
    if (status === "Skipped") return false;
    if (search && !t.raw.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <View className="flex-1">
      <PageShell contentContainerStyle={statementId ? { paddingBottom: 180 } : undefined}>
        <ScreenHeader
          title="Statements"
          back
          trailing={
            statementId ? (
              <View className="h-[34px] w-[34px] items-center justify-center rounded-full border border-foreground/10 bg-foreground/[0.07]">
                <MoreHorizontal size={15} color={colors.mutedForeground} strokeWidth={2} />
              </View>
            ) : undefined
          }
        />

        {!statementId ? (
          <View className="items-center gap-3 px-8 pt-16">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-salli-accent/15">
              <Upload size={26} color={colors.accent} strokeWidth={1.8} />
            </View>
            <Text className="text-center font-sans-semibold text-[16px] text-foreground">
              Import a bank statement
            </Text>
            <Text className="text-center text-[13px] leading-5 text-foreground/40">
              PDF, CSV, or XLSX — any Sri Lankan bank.
            </Text>
            <PillButton className="mt-2" loading={uploading} onPress={handleUpload}>
              Choose file
            </PillButton>
          </View>
        ) : (
          <View className="px-4 pt-3">
            <Card className="bg-salli-navy-card p-4">
              <View className="mb-3 flex-row items-start justify-between">
                <View className="flex-1">
                  <Text className="mb-1 text-[10px] font-sans-medium uppercase tracking-wide text-white/45">
                    Bank Statement · Import
                  </Text>
                  <Text className="text-[12px] text-white/40">
                    {pending.data ? `${pending.data.period_start} → ${pending.data.period_end}` : "Parsing…"}
                  </Text>
                </View>
                <View className="items-end gap-1.5">
                  {unmatched > 0 ? (
                    <View className="rounded-[6px] border border-salli-accent/30 bg-salli-accent/20 px-2.5 py-0.5">
                      <Text className="text-[11px] font-sans-semibold text-salli-accent">{unmatched} Pending</Text>
                    </View>
                  ) : null}
                  <Lock size={28} color="rgba(255,255,255,0.2)" strokeWidth={1.5} />
                </View>
              </View>
              <View className="flex-row gap-1.5">
                <View className="flex-1 rounded-control bg-white/[0.06] p-2.5">
                  <Text className="mb-1 text-[10px] text-white/35">Imported</Text>
                  <Text className="font-sans-bold text-[13px] text-white">{imported}</Text>
                </View>
                <View className="flex-1 rounded-control bg-white/[0.06] p-2.5">
                  <Text className="mb-1 text-[10px] text-white/35">Matched</Text>
                  <Text className="font-sans-bold text-[13px] text-white">{matched}</Text>
                </View>
                <View className="flex-1 rounded-control border border-salli-accent/20 bg-salli-accent/15 p-2.5">
                  <Text className="mb-1 text-[10px] text-salli-accent/70">Unmatched</Text>
                  <Text className="font-sans-bold text-[13px] text-salli-accent">{unmatched}</Text>
                </View>
              </View>
            </Card>

            <View className="mt-3 flex-row border-b border-foreground/[0.08]">
              {TABS.map((t) => (
                <Pressable key={t} onPress={() => setTab(t)} className={cn("px-3.5 py-2", tab === t && "border-b-2 border-salli-accent")}>
                  <Text className={cn("text-[13px]", tab === t ? "font-sans-semibold text-foreground" : "font-sans-medium text-foreground/35")}>
                    {t}
                  </Text>
                </Pressable>
              ))}
            </View>

            {pending.isLoading ? (
              <View className="items-center pt-10">
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : transactions.length === 0 ? (
              <Card className="mt-3 items-center p-6">
                <Text className="text-[13px] text-foreground/35">No transactions parsed.</Text>
              </Card>
            ) : tab !== "Review" ? (
              <View className="items-center px-8 pt-16">
                <Text className="text-center text-[13px] text-foreground/35">{tab} view coming soon.</Text>
              </View>
            ) : (
              <>
                <View className="mt-2.5 flex-row items-center gap-2">
                  <View className="h-9 flex-1 flex-row items-center gap-2 rounded-[10px] border border-foreground/[0.08] bg-card px-3">
                    <Search size={13} color={colors.mutedForeground} strokeWidth={2} />
                    <TextInput
                      value={search}
                      onChangeText={setSearch}
                      placeholder="Search transactions..."
                      placeholderTextColor="rgba(128,128,128,0.4)"
                      className="flex-1 text-[13px] text-foreground"
                    />
                  </View>
                  <View className="h-9 flex-row items-center gap-1.5 rounded-[10px] border border-foreground/[0.08] bg-card px-3">
                    <SlidersHorizontal size={13} color={colors.mutedForeground} strokeWidth={2} />
                    <Text className="font-sans-medium text-[12px] text-foreground/40">Filter</Text>
                  </View>
                </View>

                <View className="mt-2.5 flex-row gap-1.5">
                  {STATUS.map((s) => {
                    const count = s === "All" ? imported : s === "Pending" ? unmatched : s === "Matched" ? matched : 0;
                    const showCount = s === "All" || s === "Pending";
                    return (
                      <Pressable
                        key={s}
                        onPress={() => setStatus(s)}
                        className={cn("rounded-pill px-3.5 py-1", status === s ? "bg-salli-accent" : "border border-foreground/[0.08] bg-card")}
                      >
                        <Text className={cn("text-[12px]", status === s ? "font-sans-semibold text-white" : "font-sans-medium text-foreground/40")}>
                          {s}
                          {showCount ? ` ${count}` : ""}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text className="mb-1.5 mt-3 pl-0.5 text-[11px] font-sans-semibold uppercase tracking-wide text-foreground/30">
                  Needs Review{pending.data ? ` · ${pending.data.period_start}` : ""}
                </Text>

                <View className="gap-1.5">
                  {visible.map((t) => {
                    const isApproved = approved.has(t.id);
                    return (
                      <Pressable
                        key={t.id}
                        onPress={() => toggle(t.id)}
                        className={cn(
                          "flex-row items-center gap-2.5 rounded-card border p-3",
                          isApproved ? "border-salli-accent/40 bg-card" : "border-salli-accent/25 bg-card",
                        )}
                      >
                        <View className="h-12 w-[3px] rounded-pill bg-salli-accent" />
                        <View className="h-9 w-9 items-center justify-center rounded-[11px] border border-salli-accent/20 bg-salli-accent/[0.12]">
                          <CreditCard size={15} color={colors.accent} strokeWidth={2} />
                        </View>
                        <View className="flex-1">
                          <Text className="font-sans-semibold text-[13px] text-foreground">{t.raw.description}</Text>
                          <Text className="mt-0.5 text-[11px] text-foreground/30">{t.raw.date}</Text>
                        </View>
                        <View className="items-end gap-1">
                          <Text className={cn("font-sans-bold text-[13px]", t.raw.credit_flag ? "text-foreground" : "text-foreground/70")}>
                            {t.raw.credit_flag ? "+" : "−"}Rs. {formatLKR(t.raw.amount, 0)}
                          </Text>
                          <View className={cn("rounded-[4px] px-1.5 py-0.5", isApproved ? "bg-salli-accent" : "bg-salli-accent/15")}>
                            <Text className={cn("text-[10px] font-sans-semibold", isApproved ? "text-white" : "text-salli-accent")}>
                              {isApproved ? "Approved" : "Unmatched"}
                            </Text>
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}
          </View>
        )}
      </PageShell>

      {statementId && transactions.length > 0 && tab === "Review" ? (
        <LinearGradient
          colors={["transparent", colors.background]}
          locations={[0, 0.4]}
          className="absolute bottom-0 left-0 right-0"
          style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 96 }}
        >
          <Pressable
            disabled={approved.size === 0 || postStatement.isPending}
            onPress={() => postStatement.mutate(Array.from(approved))}
            className={cn(
              "h-[52px] flex-row items-center justify-center gap-2 rounded-pill bg-salli-accent",
              (approved.size === 0 || postStatement.isPending) && "opacity-50",
            )}
            style={{ shadowColor: "#2563EB", shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 4 }, elevation: 6 }}
          >
            {postStatement.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Check size={15} color="#FFFFFF" strokeWidth={2.5} />
                <Text className="font-sans-semibold text-[16px] text-white">
                  Post {approved.size || ""} {approved.size === 1 ? "Entry" : "Entries"} to Ledger
                </Text>
              </>
            )}
          </Pressable>
        </LinearGradient>
      ) : null}
    </View>
  );
}
