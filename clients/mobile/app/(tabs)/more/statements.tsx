import * as DocumentPicker from "expo-document-picker";
import { CreditCard, Upload } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { PillButton } from "@/components/ui/pill-button";
import { ScreenHeader } from "@/components/ui/screen-header";
import { usePendingStatement, usePostStatement, uploadStatement } from "@/hooks/useStatements";
import { formatLKR } from "@/lib/format";
import { useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

export default function StatementsScreen() {
  const colors = useThemeColors();
  const [statementId, setStatementId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [approved, setApproved] = useState<Set<string>>(new Set());

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

  return (
    <PageShell>
      <ScreenHeader title="Statements" back />

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
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="mb-1.5 text-[10px] font-sans-medium uppercase tracking-wide text-white/45">
                  Statement Import
                </Text>
                <Text className="text-[12px] text-white/40">
                  {pending.data ? `${pending.data.period_start} → ${pending.data.period_end}` : "Parsing…"}
                </Text>
              </View>
              <CreditCard size={26} color="rgba(255,255,255,0.2)" strokeWidth={1.5} />
            </View>
          </Card>

          {pending.isLoading ? (
            <View className="items-center pt-10">
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : transactions.length === 0 ? (
            <Card className="mt-3 items-center p-6">
              <Text className="text-[13px] text-foreground/35">No transactions parsed.</Text>
            </Card>
          ) : (
            <>
              <Text className="mb-1.5 mt-3.5 pl-0.5 text-[11px] font-sans-semibold uppercase tracking-wide text-foreground/30">
                Needs Review · {transactions.length} transactions
              </Text>
              <View className="gap-1.5">
                {transactions.map((t) => {
                  const isApproved = approved.has(t.id);
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => toggle(t.id)}
                      className={cn(
                        "flex-row items-center gap-2.5 rounded-card border p-3",
                        isApproved ? "border-salli-accent/40 bg-card" : "border-foreground/10 bg-card",
                      )}
                    >
                      <View className="h-9 w-[3px] rounded-pill bg-salli-accent" />
                      <View className="flex-1">
                        <Text className="font-sans-semibold text-[13px] text-foreground">{t.raw.description}</Text>
                        <Text className="mt-0.5 text-[11px] text-foreground/30">{t.raw.date}</Text>
                      </View>
                      <View className="items-end gap-1">
                        <Text className="font-sans-bold text-[13px] text-foreground">
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

              <PillButton
                className="mb-4 mt-4"
                variant="accent"
                loading={postStatement.isPending}
                disabled={approved.size === 0}
                onPress={() => postStatement.mutate(Array.from(approved))}
              >
                Post {approved.size || ""} {approved.size === 1 ? "Entry" : "Entries"} to Ledger
              </PillButton>
            </>
          )}
        </View>
      )}
    </PageShell>
  );
}
