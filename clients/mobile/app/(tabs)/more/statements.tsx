import * as DocumentPicker from "expo-document-picker";
import { LinearGradient } from "expo-linear-gradient";
import { Check, Upload } from "lucide-react-native";
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";

import { QuotaBanner } from "@/components/shared/QuotaBanner";
import { ActionButton } from "@/components/ui/action-button";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { Chip, Hero, Rule, SectionLabel, Strong } from "@/components/ui/blocks";
import { Card } from "@/components/ui/card";
import { FilterChip } from "@/components/ui/filter-chip";
import { PageShell } from "@/components/ui/page-shell";
import { ScreenHeader } from "@/components/ui/screen-header";
import { useAccounts, useTrialBalance } from "@/hooks/useLedger";
import type { ParsedTransaction, StatementUploadResult } from "@/hooks/useStatements";
import { usePendingStatement, usePostStatement, uploadStatement } from "@/hooks/useStatements";
import { formatDate, formatLKR } from "@/lib/format";
import { isQuotaError } from "@/lib/quota";
import { useIsTablet } from "@/lib/responsive";
import { useHardShadow, useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

const TABLET_POST_BAR_MAX_WIDTH = 720;

/**
 * Two filters, not four.
 *
 * "Skipped" was a chip whose handler read `if (status === "Skipped") return
 * false` — it always rendered an empty list, under an empty-state message that
 * admitted the server has no skipped state. "All" and the two real states are
 * what is left.
 */
const STATUS = ["Needs review", "Matched", "All"] as const;
type Status = (typeof STATUS)[number];

const isMatched = (t: ParsedTransaction) => Boolean(t.debit_account_id && t.credit_account_id);

/** Builds the honest secondary line: "30 Jun 2026 · Income · BOC credit" from
 * the fields the API actually returns (date, category, bank string, credit_flag). */
function txnSubtitle(t: ParsedTransaction, bank: string): string {
  const parts: string[] = [formatDate(t.date)];
  if (t.category) parts.push(t.category);
  parts.push(`${bank ? `${bank} ` : ""}${t.credit_flag ? "credit" : "debit"}`);
  return parts.join(" · ");
}

/**
 * Import a statement, review what was parsed, post it.
 *
 * This was three tabs, and two of them were not what their labels said.
 *
 * "History" received the SAME props as Review — the same imported/matched/
 * unmatched counts from the same piece of state — and rendered them as the same
 * three stat tiles, above a one-row list of the current import. It then
 * explained in its own footnote that statement history is not stored on the
 * server. It was a second view of the open import, called history.
 *
 * "Banks" was reachable from a menu item labelled "Manage banks" and offered
 * nothing to manage: a read-only list of the ledger's asset accounts. It
 * survives as a block called what it is — where imports post — shown while no
 * import is open, which is when it is useful.
 *
 * The counts were also stated three times on the Review tab alone: as three
 * stat tiles, as an "N Pending" badge beside them, and again in the filter chip
 * labels. The chips keep them, since a filter should say how much it will show.
 */
export default function StatementsScreen() {
  const colors = useThemeColors();
  const isTablet = useIsTablet();
  const shadow = useHardShadow();
  const [upload, setUpload] = useState<StatementUploadResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [approved, setApproved] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<Status>("Needs review");
  const [quotaHit, setQuotaHit] = useState(false);

  const statementId = upload?.statement_id ?? null;
  const pending = usePendingStatement(statementId);
  const postStatement = usePostStatement(statementId);

  const accounts = useAccounts();
  const balances = useTrialBalance();
  // Bank / cash accounts are the ledger asset accounts imports post against.
  const bankAccounts = useMemo(
    () => (accounts.data ?? []).filter((a) => a.type === "asset"),
    [accounts.data],
  );

  const handleUpload = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        "application/pdf",
        "text/csv",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ],
    });
    if (result.canceled) return;
    const file = result.assets[0];
    setUploading(true);
    setQuotaHit(false);
    try {
      const res = await uploadStatement(file.uri, file.name, file.mimeType ?? "application/octet-stream", "");
      setUpload(res);
      setApproved(new Set());
      setStatus("Needs review");
    } catch (err) {
      if (isQuotaError(err)) setQuotaHit(true);
      else Alert.alert("Upload failed", "We couldn't process that statement. Please try again.");
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

  // Live list after a post shrinks; before any refetch we use the upload payload.
  const transactions = pending.data?.transactions ?? upload?.transactions ?? [];
  const bank = upload?.bank ?? "";
  const imported = transactions.length;
  const matched = transactions.filter(isMatched).length;
  const unmatched = imported - matched;
  const period = upload?.period_start
    ? `${formatDate(upload.period_start)}${upload.period_end ? ` to ${formatDate(upload.period_end)}` : ""}`
    : "";

  const visible = transactions.filter((t) => {
    if (status === "Needs review" && isMatched(t)) return false;
    if (status === "Matched" && !isMatched(t)) return false;
    return true;
  });

  const showPostBar = Boolean(statementId) && imported > 0;

  return (
    <View className="flex-1">
      <PageShell
        contentContainerStyle={showPostBar ? { paddingBottom: 180 } : undefined}
        header={
          <ScreenHeader
            title="Statements"
            back
            trailing={
              <AnimatedPressable
                onPress={handleUpload}
                accessibilityRole="button"
                accessibilityLabel="Import a statement"
                className="h-11 w-11 items-center justify-center rounded-[11px] border-2 border-foreground bg-card"
              >
                {uploading ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <Upload size={19} color={colors.accent} strokeWidth={2.2} />
                )}
              </AnimatedPressable>
            }
          />
        }
      >
        {quotaHit ? <QuotaBanner className="mx-5 mb-3" /> : null}

        {!upload ? (
          <View>
            <View className="px-5">
              <Hero>Import a bank statement.</Hero>
              <Text className="mt-2 text-[16px] leading-[23px] text-muted-foreground">
                PDF, CSV or XLSX from any Sri Lankan bank. Salli drafts the ledger entries and
                you approve them. Nothing posts until you say so.
              </Text>
              <ActionButton className="mt-5" loading={uploading} onPress={handleUpload}>
                Choose a file
              </ActionButton>
            </View>

            {bankAccounts.length > 0 ? (
              <>
                <Rule />
                <SectionLabel>Imports post to</SectionLabel>
                <View className="mt-3 gap-[9px] px-5">
                  {bankAccounts.map((a) => {
                    const bal = balances.data?.[a.id];
                    return (
                      <Card
                        key={a.id}
                        flat
                        className={cn(
                          "flex-row items-center gap-[11px] px-3.5 py-3",
                          !a.is_active && "border-foreground/25",
                        )}
                      >
                        <Chip className="min-w-[58px]">{a.code}</Chip>
                        <View className="min-w-0 flex-1">
                          <Text numberOfLines={1} className="font-sans-bold text-[15px] text-foreground">
                            {a.name}
                          </Text>
                          <Text className="mt-0.5 text-[13px] text-muted-foreground">
                            {a.currency}
                            {a.is_active ? "" : " · inactive"}
                          </Text>
                        </View>
                        {bal != null ? (
                          <Text className="shrink-0 font-sans-extrabold text-[14px] text-foreground">
                            Rs. {formatLKR(bal, 0)}
                          </Text>
                        ) : null}
                      </Card>
                    );
                  })}
                </View>
                <View className="mt-3 px-5">
                  <Text className="text-[13.5px] leading-5 text-muted-foreground">
                    Each parsed transaction is matched to one of these by its ledger code. Add or
                    change them in the Ledger.
                  </Text>
                </View>
              </>
            ) : (
              <>
                <Rule />
                <View className="px-5">
                  <Text className="text-[15px] leading-[21px] text-muted-foreground">
                    You have no asset accounts yet. Imports post against them, so add one in the
                    Ledger first.
                  </Text>
                </View>
              </>
            )}
            <View className="h-7" />
          </View>
        ) : (
          <View>
            <View className="px-5">
              <Hero>
                <Strong>{imported}</Strong> transaction{imported === 1 ? "" : "s"}
                {bank ? ` from ${bank}` : ""}.
              </Hero>
              <Text className="mt-2 text-[16px] leading-[23px] text-muted-foreground">
                {period ? `${period}. ` : ""}
                {unmatched === 0
                  ? "All of them match an account already."
                  : `${matched} match an account already; ${unmatched} need a look.`}
              </Text>
            </View>

            {pending.isLoading ? (
              <View className="items-center pt-10">
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : imported === 0 ? (
              <>
                <Rule />
                <View className="px-5">
                  <Text className="text-[15px] leading-[21px] text-muted-foreground">
                    Nothing could be parsed from that file.
                  </Text>
                </View>
              </>
            ) : (
              <>
                <Rule />
                <View className="flex-row flex-wrap gap-1.5 px-5">
                  {STATUS.map((s) => {
                    const count = s === "All" ? imported : s === "Needs review" ? unmatched : matched;
                    return (
                      <FilterChip
                        key={s}
                        label={`${s} ${count}`}
                        active={status === s}
                        onPress={() => setStatus(s)}
                      />
                    );
                  })}
                </View>

                <View className="mt-3.5 gap-[9px] px-5">
                  {visible.length === 0 ? (
                    <Text className="text-[15px] leading-[21px] text-muted-foreground">
                      Nothing here under that filter.
                    </Text>
                  ) : (
                    visible.map((t) => {
                      const matchedRow = isMatched(t);
                      const isApproved = approved.has(t.id);
                      return (
                        <AnimatedPressable
                          key={t.id}
                          onPress={() => toggle(t.id)}
                          press="sink"
                          accessibilityRole="button"
                          accessibilityLabel={`${isApproved ? "Unapprove" : "Approve"} ${t.description}`}
                          className={cn(
                            "flex-row items-center gap-[11px] rounded-card border-2 bg-card px-3.5 py-3",
                            isApproved ? "border-salli-accent" : "border-foreground",
                          )}
                        >
                          {/* A checkbox, because the row's job is approving. The
                              badge it replaces read "Approved"/"Matched"/
                              "Unmatched" — three words for two independent
                              facts, one of which the filter above already
                              states. */}
                          <View
                            className={cn(
                              "h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] border-2 border-foreground",
                              isApproved ? "bg-salli-accent" : "bg-card",
                            )}
                          >
                            {isApproved ? <Check size={14} color="#FFFFFF" strokeWidth={3} /> : null}
                          </View>
                          <View className="min-w-0 flex-1">
                            <Text
                              numberOfLines={1}
                              className="font-sans-bold text-[15px] text-foreground"
                            >
                              {t.description}
                            </Text>
                            <Text numberOfLines={1} className="mt-0.5 text-[13px] text-muted-foreground">
                              {txnSubtitle(t, bank)}
                              {matchedRow ? "" : " · no account"}
                            </Text>
                          </View>
                          <Text className="shrink-0 font-sans-extrabold text-[15px] text-foreground">
                            {t.credit_flag ? "+" : "−"}
                            {formatLKR(t.amount, 0)}
                          </Text>
                        </AnimatedPressable>
                      );
                    })
                  )}
                </View>

                <Rule />
                <View className="px-5">
                  <ActionButton
                    variant="secondary"
                    onPress={() => {
                      setUpload(null);
                      setApproved(new Set());
                    }}
                  >
                    Discard this import
                  </ActionButton>
                  <Text className="mt-3 text-[13.5px] leading-5 text-muted-foreground">
                    Approved entries post to your Ledger. This import lasts the session only;
                    statement history isn't stored.
                  </Text>
                </View>
              </>
            )}
            <View className="h-7" />
          </View>
        )}
      </PageShell>

      {showPostBar ? (
        <LinearGradient
          colors={["transparent", colors.background]}
          locations={[0, 0.4]}
          className="absolute bottom-0 left-0 right-0"
          style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 96 }}
        >
          <Pressable
            disabled={approved.size === 0 || postStatement.isPending}
            onPress={() => postStatement.mutate(Array.from(approved))}
            className={cn(
              "h-[52px] flex-row items-center justify-center gap-2 rounded-card border-2 border-foreground bg-salli-accent",
              (approved.size === 0 || postStatement.isPending) && "opacity-50",
            )}
            style={[
              shadow,
              {
                width: "100%",
                maxWidth: isTablet ? TABLET_POST_BAR_MAX_WIDTH : undefined,
                alignSelf: "center",
              },
            ]}
          >
            {postStatement.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="font-sans-bold text-[17px] text-white">
                {approved.size === 0
                  ? "Select entries to post"
                  : `Post ${approved.size} ${approved.size === 1 ? "entry" : "entries"}`}
              </Text>
            )}
          </Pressable>
        </LinearGradient>
      ) : null}
    </View>
  );
}
