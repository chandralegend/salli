import * as DocumentPicker from "expo-document-picker";
import { LinearGradient } from "expo-linear-gradient";
import {
  Building2,
  Check,
  CreditCard,
  FileText,
  Info,
  Landmark,
  Lock,
  MoreVertical,
  Search,
  Upload,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, Text, TextInput, View } from "react-native";

import { QuotaBanner } from "@/components/shared/QuotaBanner";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { PillButton } from "@/components/ui/pill-button";
import { FilterChip } from "@/components/ui/filter-chip";
import { ScreenHeader } from "@/components/ui/screen-header";
import { StatTile } from "@/components/ui/stat-tile";
import { Tabs } from "@/components/ui/tabs";
import { useAccounts, useTrialBalance } from "@/hooks/useLedger";
import type { ParsedTransaction, StatementUploadResult } from "@/hooks/useStatements";
import { usePendingStatement, usePostStatement, uploadStatement } from "@/hooks/useStatements";
import { formatLKR } from "@/lib/format";
import { isQuotaError } from "@/lib/quota";
import { useIsTablet } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

const TABLET_POST_BAR_MAX_WIDTH = 720;

const TABS = ["Review", "History", "Banks"] as const;
type Tab = (typeof TABS)[number];
const STATUS = ["All", "Pending", "Matched", "Skipped"] as const;
type Status = (typeof STATUS)[number];

const isMatched = (t: ParsedTransaction) => Boolean(t.debit_account_id && t.credit_account_id);

/** Builds the honest secondary line: "30 Jun · Income · BOC credit" from the
 * fields the API actually returns (date, category, bank string, credit_flag). */
function txnSubtitle(t: ParsedTransaction, bank: string): string {
  const parts: string[] = [t.date];
  if (t.category) parts.push(t.category);
  parts.push(`${bank ? `${bank} ` : ""}${t.credit_flag ? "credit" : "debit"}`);
  return parts.join(" · ");
}

export default function StatementsScreen() {
  const colors = useThemeColors();
  const isTablet = useIsTablet();
  const [upload, setUpload] = useState<StatementUploadResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [approved, setApproved] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<Tab>("Review");
  const [status, setStatus] = useState<Status>("Pending");
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [quotaHit, setQuotaHit] = useState(false);

  const statementId = upload?.statement_id ?? null;
  const pending = usePendingStatement(statementId);
  const postStatement = usePostStatement(statementId);

  const handleUpload = async () => {
    setMenuOpen(false);
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
      setTab("Review");
      setStatus("Pending");
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
    ? `${upload.period_start}${upload.period_end ? ` → ${upload.period_end}` : ""}`
    : "";

  const visible = transactions.filter((t) => {
    if (status === "Pending" && isMatched(t)) return false;
    if (status === "Matched" && !isMatched(t)) return false;
    if (status === "Skipped") return false; // no server-side "skipped" state
    if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const showPostBar = Boolean(statementId) && imported > 0 && tab === "Review";

  return (
    <View className="flex-1">
      <PageShell
        animateOn={tab}
        contentContainerStyle={showPostBar ? { paddingBottom: 180 } : undefined}
        header={
          <>
            <ScreenHeader
              title="Statements"
              back
              trailing={
                <Pressable
                  onPress={() => setMenuOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Options"
                  className="h-[34px] w-[34px] items-center justify-center rounded-full border border-foreground/10 bg-foreground/[0.07]"
                >
                  <MoreVertical size={15} color={colors.mutedForeground} strokeWidth={2} />
                </Pressable>
              }
            />
            <Tabs items={TABS} value={tab} onChange={setTab} className="mt-3" />
          </>
        }
      >

        {quotaHit ? <QuotaBanner metric="statement_uploads" className="mx-4 mt-3" /> : null}

        {tab === "Review" ? (
          <ReviewTab
            colors={colors}
            upload={upload}
            pending={pending}
            uploading={uploading}
            onUpload={handleUpload}
            bank={bank}
            period={period}
            imported={imported}
            matched={matched}
            unmatched={unmatched}
            status={status}
            setStatus={setStatus}
            search={search}
            setSearch={setSearch}
            visible={visible}
            approved={approved}
            toggle={toggle}
          />
        ) : tab === "History" ? (
          <HistoryTab
            colors={colors}
            upload={upload}
            imported={imported}
            matched={matched}
            unmatched={unmatched}
            bank={bank}
            period={period}
            onUpload={handleUpload}
            uploading={uploading}
          />
        ) : (
          <BanksTab colors={colors} />
        )}
      </PageShell>

      {showPostBar ? (
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
            style={{
              shadowColor: colors.accent,
              shadowOpacity: 0.35,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 4 },
              elevation: 6,
              width: "100%",
              maxWidth: isTablet ? TABLET_POST_BAR_MAX_WIDTH : undefined,
              alignSelf: "center",
            }}
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

      <OptionsMenu
        visible={menuOpen}
        colors={colors}
        hasImport={Boolean(statementId)}
        onClose={() => setMenuOpen(false)}
        onUpload={handleUpload}
        onManageBanks={() => {
          setMenuOpen(false);
          setTab("Banks");
        }}
        onClearImport={() => {
          setMenuOpen(false);
          setUpload(null);
          setApproved(new Set());
        }}
      />
    </View>
  );
}

function ReviewTab({
  colors,
  upload,
  pending,
  uploading,
  onUpload,
  bank,
  period,
  imported,
  matched,
  unmatched,
  status,
  setStatus,
  search,
  setSearch,
  visible,
  approved,
  toggle,
}: {
  colors: ReturnType<typeof useThemeColors>;
  upload: StatementUploadResult | null;
  pending: ReturnType<typeof usePendingStatement>;
  uploading: boolean;
  onUpload: () => void;
  bank: string;
  period: string;
  imported: number;
  matched: number;
  unmatched: number;
  status: Status;
  setStatus: (s: Status) => void;
  search: string;
  setSearch: (s: string) => void;
  visible: ParsedTransaction[];
  approved: Set<string>;
  toggle: (id: string) => void;
}) {
  if (!upload) {
    return (
      <View className="items-center gap-3 px-8 pt-16">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-salli-accent/15">
          <Upload size={26} color={colors.accent} strokeWidth={1.8} />
        </View>
        <Text className="text-center font-sans-semibold text-[16px] text-foreground">Import a bank statement</Text>
        <Text className="text-center text-[13px] leading-5 text-foreground/40">
          PDF, CSV, or XLSX — any Sri Lankan bank. Salli parses it and drafts ledger entries for your review.
        </Text>
        <PillButton className="mt-2" loading={uploading} onPress={onUpload}>
          Choose file
        </PillButton>
      </View>
    );
  }

  return (
    <View className="px-4 pt-3">
      <Card className="bg-salli-navy-card p-4">
        <View className="mb-3 flex-row items-start justify-between">
          <View className="flex-1">
            <Text className="mb-1 text-[10px] font-sans-medium uppercase tracking-wide text-white/45">
              {bank ? `${bank} · Import` : "Bank Statement · Import"}
            </Text>
            <Text className="text-[12px] text-white/40">{period || "Parsed statement"}</Text>
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
          <StatTile onDark className="flex-1" label="Imported" value={String(imported)} />
          <StatTile onDark className="flex-1" label="Matched" value={String(matched)} />
          <StatTile
            onDark
            className="flex-1 border-salli-accent/20 bg-salli-accent/15"
            label="Unmatched"
            labelClassName="text-salli-accent/70"
            valueClassName="text-salli-accent"
            value={String(unmatched)}
          />
        </View>
      </Card>

      {pending.isLoading ? (
        <View className="items-center pt-10">
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : imported === 0 ? (
        <Card className="mt-3 items-center p-6">
          <Text className="text-[13px] text-foreground/35">No transactions parsed from this file.</Text>
        </Card>
      ) : (
        <>
          <View className="mt-3 flex-row items-center gap-2">
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
          </View>

          <View className="mt-2.5 flex-row gap-1.5">
            {STATUS.map((s) => {
              const count = s === "All" ? imported : s === "Pending" ? unmatched : s === "Matched" ? matched : 0;
              const showCount = s !== "Skipped";
              return (
                <FilterChip
                  key={s}
                  label={`${s}${showCount ? ` ${count}` : ""}`}
                  active={status === s}
                  onPress={() => setStatus(s)}
                />
              );
            })}
          </View>

          <Text className="mb-1.5 mt-3 pl-0.5 text-[11px] font-sans-semibold uppercase tracking-wide text-foreground/30">
            {status === "Matched" ? "Matched" : status === "Skipped" ? "Skipped" : "Needs Review"}
            {upload.period_start ? ` · ${upload.period_start}` : ""}
          </Text>

          {visible.length === 0 ? (
            <Card className="items-center p-6">
              <Text className="text-[13px] text-foreground/35">
                {status === "Skipped"
                  ? "Transactions aren't skipped on the server yet."
                  : "Nothing here for this filter."}
              </Text>
            </Card>
          ) : (
            <View className="gap-1.5">
              {visible.map((t) => {
                const matchedRow = isMatched(t);
                const isApproved = approved.has(t.id);
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => toggle(t.id)}
                    className={cn(
                      "flex-row items-center gap-2.5 rounded-card border p-3",
                      matchedRow && !isApproved
                        ? "border-foreground/[0.08] bg-card"
                        : "border-salli-accent/25 bg-card",
                    )}
                  >
                    <View
                      className={cn(
                        "h-12 w-[3px] rounded-pill",
                        matchedRow && !isApproved ? "bg-foreground/15" : "bg-salli-accent",
                      )}
                    />
                    <View className="h-9 w-9 items-center justify-center rounded-[8px] border border-salli-accent/20 bg-salli-accent/[0.12]">
                      <CreditCard size={15} color={colors.accent} strokeWidth={2} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-sans-semibold text-[13px] text-foreground" numberOfLines={1}>
                        {t.description}
                      </Text>
                      <Text className="mt-0.5 text-[11px] text-foreground/30" numberOfLines={1}>
                        {txnSubtitle(t, bank)}
                      </Text>
                    </View>
                    <View className="items-end gap-1">
                      <Text
                        className={cn(
                          "font-sans-bold text-[13px]",
                          t.credit_flag ? "text-foreground" : "text-foreground/70",
                        )}
                      >
                        {t.credit_flag ? "+" : "−"}Rs. {formatLKR(t.amount, 0)}
                      </Text>
                      <View
                        className={cn(
                          "rounded-[4px] px-1.5 py-0.5",
                          isApproved
                            ? "bg-salli-accent"
                            : matchedRow
                              ? "bg-foreground/[0.07]"
                              : "bg-salli-accent/15",
                        )}
                      >
                        <Text
                          className={cn(
                            "text-[10px] font-sans-semibold",
                            isApproved ? "text-white" : matchedRow ? "text-foreground/45" : "text-salli-accent",
                          )}
                        >
                          {isApproved ? "Approved" : matchedRow ? "Matched" : "Unmatched"}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </>
      )}
    </View>
  );
}

function HistoryTab({
  colors,
  upload,
  imported,
  matched,
  unmatched,
  bank,
  period,
  onUpload,
  uploading,
}: {
  colors: ReturnType<typeof useThemeColors>;
  upload: StatementUploadResult | null;
  imported: number;
  matched: number;
  unmatched: number;
  bank: string;
  period: string;
  onUpload: () => void;
  uploading: boolean;
}) {
  if (!upload) {
    return (
      <View className="items-center gap-2 px-8 pt-14">
        <View className="mb-1 h-14 w-14 items-center justify-center rounded-full bg-foreground/[0.06]">
          <FileText size={24} color={colors.mutedForeground} strokeWidth={1.6} />
        </View>
        <Text className="text-center font-sans-semibold text-[15px] text-foreground">No imports yet</Text>
        <Text className="text-center text-[13px] leading-5 text-foreground/40">
          Past statements aren't stored on the server. Import one to review and post it — it will appear here for the
          rest of your session.
        </Text>
        <PillButton className="mt-2" loading={uploading} onPress={onUpload}>
          Import statement
        </PillButton>
      </View>
    );
  }

  return (
    <View className="px-4 pt-3">
      <Card className="bg-salli-navy-card p-[18px]">
        <View className="flex-row items-start justify-between">
          <View>
            <Text className="mb-2 text-[11px] font-sans-medium uppercase tracking-wide text-white/50">
              This Import
            </Text>
            <View className="flex-row items-baseline gap-1.5">
              <Text className="font-sans-extrabold text-[40px] leading-none tracking-tighter text-white">
                {imported}
              </Text>
              <Text className="font-sans-medium text-[13px] text-white/40">transactions</Text>
            </View>
          </View>
          <View className="mt-1 rounded-[8px] border border-salli-accent/30 bg-salli-accent/20 px-2.5 py-1">
            <Text className="font-sans-semibold text-[11px] text-salli-accent">{matched} matched</Text>
          </View>
        </View>
        <View className="mt-3.5 flex-row gap-1.5">
          <StatTile onDark className="flex-1" label="Imported" value={String(imported)} />
          <StatTile onDark className="flex-1" label="Matched" value={String(matched)} />
          <StatTile
            onDark
            className="flex-1"
            label="Unmatched"
            valueClassName="text-salli-accent"
            value={String(unmatched)}
          />
        </View>
      </Card>

      <Text className="px-1.5 pb-1.5 pt-3.5 text-[11px] font-sans-semibold uppercase tracking-wide text-foreground/30">
        Imported This Session
      </Text>
      <Card className="flex-row items-center gap-2.5 p-3.5">
        <View className="h-9 w-9 items-center justify-center rounded-[10px] border border-salli-accent/15 bg-salli-accent/10">
          <FileText size={15} color={colors.accent} strokeWidth={2} />
        </View>
        <View className="flex-1">
          <Text className="font-sans-semibold text-[13px] text-foreground" numberOfLines={1}>
            {bank || "Bank statement"}
          </Text>
          <Text className="mt-0.5 text-[11px] text-foreground/30" numberOfLines={1}>
            {period ? `${period} · ` : ""}
            {imported} txns
          </Text>
        </View>
        <View className="items-end">
          <View className="rounded-[4px] bg-salli-accent/15 px-2 py-0.5">
            <Text className="text-[10px] font-sans-semibold text-salli-accent">{matched} matched</Text>
          </View>
          <Text className="mt-1 text-[10px] text-foreground/25">{unmatched} unmatched</Text>
        </View>
      </Card>

      <View className="mt-2.5 flex-row items-start gap-2 rounded-[8px] border border-foreground/[0.06] bg-foreground/[0.04] px-3.5 py-2.5">
        <Info size={13} color={colors.mutedForeground} strokeWidth={2} style={{ marginTop: 1 }} />
        <Text className="flex-1 text-[11px] leading-4 text-foreground/30">
          Posted entries live in your Ledger. A persistent statement history isn't tracked by the server yet.
        </Text>
      </View>
    </View>
  );
}

function BanksTab({ colors }: { colors: ReturnType<typeof useThemeColors> }) {
  const accounts = useAccounts();
  const balances = useTrialBalance();

  // Bank / cash accounts are the ledger asset accounts imports post against.
  const bankAccounts = useMemo(
    () => (accounts.data ?? []).filter((a) => a.type === "asset"),
    [accounts.data],
  );

  if (accounts.isLoading) {
    return (
      <View className="items-center pt-14">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (bankAccounts.length === 0) {
    return (
      <View className="items-center gap-2 px-8 pt-14">
        <View className="mb-1 h-14 w-14 items-center justify-center rounded-full bg-foreground/[0.06]">
          <Landmark size={24} color={colors.mutedForeground} strokeWidth={1.6} />
        </View>
        <Text className="text-center font-sans-semibold text-[15px] text-foreground">No asset accounts yet</Text>
        <Text className="text-center text-[13px] leading-5 text-foreground/40">
          Imports post against ledger asset accounts. Add one in the Ledger to map a bank account here.
        </Text>
      </View>
    );
  }

  return (
    <View className="px-4 pt-4">
      <Text className="px-1.5 pb-1.5 text-[11px] font-sans-semibold uppercase tracking-wide text-foreground/30">
        Ledger Bank &amp; Cash Accounts
      </Text>
      <View className="gap-1.5">
        {bankAccounts.map((a) => {
          const active = a.is_active;
          const bal = balances.data?.[a.id];
          const initials = a.code.slice(0, 4);
          return (
            <Card
              key={a.id}
              className={cn("flex-row items-center gap-2.5 p-3.5", !active && "opacity-55")}
            >
              <View className={cn("h-11 w-[3px] rounded-pill", active ? "bg-salli-accent" : "bg-foreground/12")} />
              <View
                className={cn(
                  "h-10 w-10 items-center justify-center rounded-[8px]",
                  active ? "border border-salli-accent/15 bg-salli-accent/10" : "bg-foreground/[0.06]",
                )}
              >
                {a.code ? (
                  <Text
                    className={cn(
                      "text-[10px] font-sans-bold",
                      active ? "text-salli-accent" : "text-foreground/50",
                    )}
                  >
                    {initials}
                  </Text>
                ) : (
                  <Building2 size={16} color={active ? colors.accent : colors.mutedForeground} strokeWidth={2} />
                )}
              </View>
              <View className="flex-1">
                <Text className="font-sans-semibold text-[13px] text-foreground" numberOfLines={1}>
                  {a.name}
                </Text>
                <Text className="mt-0.5 text-[11px] text-foreground/30" numberOfLines={1}>
                  {a.currency} · maps to {a.code}
                </Text>
              </View>
              <View className="items-end">
                <View className={cn("rounded-[4px] px-2 py-0.5", active ? "bg-salli-accent/15" : "bg-foreground/[0.07]")}>
                  <Text
                    className={cn(
                      "text-[10px] font-sans-semibold",
                      active ? "text-salli-accent" : "text-foreground/40",
                    )}
                  >
                    {active ? "Active" : "Inactive"}
                  </Text>
                </View>
                {bal != null ? (
                  <Text className="mt-1 text-[10px] text-foreground/25">Rs. {formatLKR(bal, 0)}</Text>
                ) : null}
              </View>
            </Card>
          );
        })}
      </View>

      <View className="mt-3 flex-row items-start gap-2 rounded-[8px] border border-foreground/[0.06] bg-foreground/[0.04] px-3.5 py-2.5">
        <Info size={13} color={colors.mutedForeground} strokeWidth={2} style={{ marginTop: 1 }} />
        <Text className="flex-1 text-[11px] leading-4 text-foreground/30">
          Each account maps to a ledger asset code so imported transactions post automatically.
        </Text>
      </View>
    </View>
  );
}

function OptionsMenu({
  visible,
  colors,
  hasImport,
  onClose,
  onUpload,
  onManageBanks,
  onClearImport,
}: {
  visible: boolean;
  colors: ReturnType<typeof useThemeColors>;
  hasImport: boolean;
  onClose: () => void;
  onUpload: () => void;
  onManageBanks: () => void;
  onClearImport: () => void;
}) {
  const items: { key: string; label: string; Icon: typeof Upload; onPress: () => void; danger?: boolean }[] = [
    { key: "upload", label: "Upload new statement", Icon: Upload, onPress: onUpload },
    { key: "banks", label: "Manage banks", Icon: Landmark, onPress: onManageBanks },
  ];
  if (hasImport) {
    items.push({ key: "clear", label: "Clear current import", Icon: Info, onPress: onClearImport, danger: true });
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/50" onPress={onClose}>
        <View
          className="absolute right-4 top-[104px] w-[236px] overflow-hidden rounded-[10px] border border-foreground/12 bg-card"
          style={{ shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 12 }}
        >
          {items.map((item, i) => (
            <Pressable
              key={item.key}
              onPress={item.onPress}
              className={cn(
                "flex-row items-center gap-3 px-4 py-3.5",
                i < items.length - 1 && "border-b border-foreground/[0.06]",
              )}
            >
              <item.Icon
                size={16}
                color={item.danger ? "#EF4444" : colors.foreground}
                strokeWidth={2}
              />
              <Text
                className={cn(
                  "font-sans-medium text-[14px]",
                  item.danger ? "text-[#EF4444]" : "text-foreground",
                )}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}
