import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Upload, Square, CheckSquare, CheckCircle } from "lucide-react-native";
import { ScreenShell, CardContainer, SectionTitle } from "@/components/ui/page-shell";
import { PillButton } from "@/components/ui/pill-button";
import { PostingRow } from "@/components/PostingRow";
import { useStatements, type ParsedTx, type UploadResult } from "@/hooks/useStatements";
import { useThemeColors, useAppTheme } from "@/lib/theme";

export default function StatementsScreen() {
  const theme = useThemeColors();
  const { isDark } = useAppTheme();
  const { upload, postApproved } = useStatements();

  const [result, setResult] = useState<UploadResult | null>(null);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [posted, setPosted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const approvedCount = result ? result.transactions.length - skipped.size : 0;

  async function handlePickAndUpload() {
    setErrorMessage(null);
    const picked = await DocumentPicker.getDocumentAsync({
      type: [
        "application/pdf",
        "text/csv",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ],
    });
    if (picked.canceled || !picked.assets?.[0]) return;

    const asset = picked.assets[0];
    try {
      const uploadResult = await upload.mutateAsync({
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType,
      });
      setResult(uploadResult);
      setSkipped(new Set());
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Upload failed");
    }
  }

  function toggle(id: string) {
    setSkipped((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(skipAll: boolean) {
    if (!result) return;
    setSkipped(skipAll ? new Set(result.transactions.map((t) => t.id)) : new Set());
  }

  async function handlePostApproved() {
    if (!result || approvedCount === 0) return;
    setErrorMessage(null);
    const approvedIds = result.transactions.map((t) => t.id).filter((id) => !skipped.has(id));
    try {
      await postApproved.mutateAsync({ statementId: result.statement_id, approvedIds });
      setPosted(true);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Post failed");
    }
  }

  function reset() {
    setResult(null);
    setSkipped(new Set());
    setPosted(false);
    setErrorMessage(null);
  }

  if (posted && result) {
    return (
      <ScreenShell edges={["left", "right"]}>
        <CardContainer>
          <View className="items-center gap-4 py-8">
            <View className={`w-14 h-14 rounded-full ${isDark ? "bg-emerald-950" : "bg-emerald-50"} items-center justify-center`}>
              <CheckCircle color="#059669" size={28} />
            </View>
            <View className="items-center">
              <Text className="text-foreground text-[16px]" style={{ fontFamily: "DMSans_700Bold" }}>
                {approvedCount} entries posted
              </Text>
              <Text className="text-muted-foreground text-[13px] mt-1 text-center">
                Journal entries have been created from the approved transactions.
              </Text>
            </View>
            <PillButton variant="primary" onPress={reset}>
              Upload another statement
            </PillButton>
          </View>
        </CardContainer>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell edges={["left", "right"]}>
      <View className="gap-3">
        {!result && (
          <CardContainer>
            <SectionTitle>Import</SectionTitle>
            <Text className="text-muted-foreground text-[13px] mb-4">
              Import bank statements, review the parsed transactions, then post them to the ledger.
            </Text>
            <Pressable
              onPress={handlePickAndUpload}
              disabled={upload.isPending}
              className="border-2 border-dashed border-border rounded-2xl py-10 items-center justify-center gap-3 active:bg-muted"
            >
              {upload.isPending ? (
                <ActivityIndicator color={theme.mutedForeground} />
              ) : (
                <Upload color={theme.mutedForeground} size={28} />
              )}
              <View className="items-center">
                <Text className="text-foreground text-[14px]" style={{ fontFamily: "DMSans_700Bold" }}>
                  {upload.isPending ? "Parsing statement…" : "Choose a bank statement"}
                </Text>
                <Text className="text-muted-foreground text-[12px] mt-1">
                  PDF, XLSX, or CSV · Any Sri Lankan bank
                </Text>
              </View>
            </Pressable>
            {errorMessage && (
              <Text className="text-destructive text-[12px] mt-3 text-center">{errorMessage}</Text>
            )}
          </CardContainer>
        )}

        {result && (
          <>
            <CardContainer>
              <View className="flex-row items-center justify-between mb-3">
                <View>
                  <Text className="text-foreground text-[14px]" style={{ fontFamily: "DMSans_700Bold" }}>
                    {result.transactions.length} transactions parsed
                  </Text>
                  <Text className="text-muted-foreground text-[11px] font-mono mt-0.5">
                    {result.statement_id}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center gap-2 mb-1">
                <PillButton variant="secondary" onPress={() => toggleAll(false)} className="px-4 py-2">
                  Approve all
                </PillButton>
                <PillButton variant="secondary" onPress={() => toggleAll(true)} className="px-4 py-2">
                  Skip all
                </PillButton>
              </View>
              <Text className="text-muted-foreground text-[12px] mb-3 tabular-nums">
                {approvedCount} approved · {skipped.size} skipped
              </Text>

              <PillButton
                variant="primary"
                onPress={handlePostApproved}
                disabled={approvedCount === 0}
                loading={postApproved.isPending}
              >
                {`Post ${approvedCount} to ledger`}
              </PillButton>

              {errorMessage && (
                <Text className="text-destructive text-[12px] mt-3 text-center">{errorMessage}</Text>
              )}
            </CardContainer>

            <CardContainer>
              <SectionTitle>Transactions</SectionTitle>
              <View>
                {result.transactions.map((tx: ParsedTx, i) => {
                  const isSkipped = skipped.has(tx.id);
                  return (
                    <Pressable
                      key={tx.id}
                      onPress={() => toggle(tx.id)}
                      className={`flex-row items-center gap-2.5 active:bg-muted ${isSkipped ? "opacity-40" : ""}`}
                    >
                      {isSkipped ? (
                        <Square color={theme.mutedForeground} size={18} />
                      ) : (
                        <CheckSquare color={theme.primary} size={18} />
                      )}
                      <View className="flex-1">
                        <PostingRow
                          date={tx.date}
                          description={tx.description}
                          amount={tx.amount}
                          isCredit={tx.credit_flag}
                          isLast={i === result.transactions.length - 1}
                        />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </CardContainer>
          </>
        )}
      </View>
    </ScreenShell>
  );
}
