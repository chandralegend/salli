import { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, ActivityIndicator, Modal, ScrollView } from "react-native";
import { router } from "expo-router";
import { Eye, Plus, Pencil, Trash2, RotateCcw, X } from "lucide-react-native";
import { ScreenShell, PageHeader, CardContainer, SectionTitle } from "@/components/ui/page-shell";
import { PostingRow } from "@/components/PostingRow";
import { PillButton } from "@/components/ui/pill-button";
import { TextField } from "@/components/ui/text-field";
import { AvatarMoreButton } from "@/components/layout/AvatarMoreButton";
import { useLedger, type Account, type JournalEntry } from "@/hooks/useLedger";
import { useThemeColors, useAppTheme, useThemeVars } from "@/lib/theme";
import { useSalliStore } from "@/lib/store";

const MONO_MEDIUM = { fontFamily: "IBMPlexMono_500Medium" };

const ACCOUNT_TYPES = ["asset", "liability", "equity", "income", "expense"] as const;
type AccountType = (typeof ACCOUNT_TYPES)[number];

/** Mirrors clients/web/src/app/(app)/ledger/page.tsx TYPE_COLORS */
const TYPE_COLORS: Record<string, { light: string; dark: string }> = {
  asset: { light: "bg-sky-50 text-sky-700", dark: "bg-sky-950 text-sky-400" },
  liability: { light: "bg-rose-50 text-rose-700", dark: "bg-rose-950 text-rose-400" },
  equity: { light: "bg-violet-50 text-violet-700", dark: "bg-violet-950 text-violet-400" },
  income: { light: "bg-emerald-50 text-emerald-700", dark: "bg-emerald-950 text-emerald-400" },
  expense: { light: "bg-amber-50 text-amber-700", dark: "bg-amber-950 text-amber-400" },
};

function fmt(v: string | number) {
  return Number(v).toLocaleString("en-LK", { minimumFractionDigits: 2 });
}

function TypeBadge({ type }: { type: string }) {
  const { isDark } = useAppTheme();
  const colors = TYPE_COLORS[type];
  const cls = colors ? (isDark ? colors.dark : colors.light) : "bg-muted";
  return (
    <View className={`px-1.5 py-0.5 rounded ${cls}`}>
      <Text className={`text-[11px] font-medium capitalize ${colors ? "" : "text-muted-foreground"}`}>
        {type}
      </Text>
    </View>
  );
}

type LedgerTab = "accounts" | "entries" | "income";

export default function LedgerScreen() {
  const theme = useThemeColors();
  const { isDark } = useAppTheme();
  const {
    accounts,
    entries,
    incomeStatement,
    accountMap,
    addAccount,
    updateAccount,
    deactivateAccount,
    addEntry,
    reverseEntry,
  } = useLedger();

  const [tab, setTab] = useState<LedgerTab>("accounts");

  // Add Account modal
  const [acctOpen, setAcctOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("asset");
  const [currency, setCurrency] = useState("LKR");

  // Edit Account modal
  const [editAcct, setEditAcct] = useState<Account | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<AccountType>("asset");
  const [editCurrency, setEditCurrency] = useState("LKR");

  // Deactivate confirm
  const [deactivateTarget, setDeactivateTarget] = useState<Account | null>(null);

  // Add Entry modal
  const [entryOpen, setEntryOpen] = useState(false);
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [entryDesc, setEntryDesc] = useState("");
  const [debitAccountId, setDebitAccountId] = useState("");
  const [creditAccountId, setCreditAccountId] = useState("");
  const [amount, setAmount] = useState("");

  // Opened from the floating dock's "+" button (see components/layout/FloatingTabBar.tsx)
  const quickAddEntryRequest = useSalliStore((s) => s.quickAddEntryRequest);
  const lastHandledRequest = useRef(0);
  useEffect(() => {
    if (quickAddEntryRequest > lastHandledRequest.current) {
      lastHandledRequest.current = quickAddEntryRequest;
      setTab("entries");
      setEntryOpen(true);
    }
  }, [quickAddEntryRequest]);

  // Reverse confirm
  const [reverseTarget, setReverseTarget] = useState<string | null>(null);

  const accountsList = accounts.data ?? [];
  const entriesList = entries.data ?? [];

  function openEdit(a: Account) {
    setEditAcct(a);
    setEditCode(a.code);
    setEditName(a.name);
    setEditType(a.type as AccountType);
    setEditCurrency(a.currency);
  }

  function resetAddAccountForm() {
    setCode("");
    setName("");
    setType("asset");
    setCurrency("LKR");
  }

  function resetEntryForm() {
    setEntryDesc("");
    setDebitAccountId("");
    setCreditAccountId("");
    setAmount("");
  }

  async function handleAddAccount() {
    if (!code || !name) return;
    await addAccount.mutateAsync({ code, name, type, currency });
    setAcctOpen(false);
    resetAddAccountForm();
  }

  async function handleUpdateAccount() {
    if (!editAcct || !editCode || !editName) return;
    await updateAccount.mutateAsync({
      id: editAcct.id,
      code: editCode,
      name: editName,
      type: editType,
      currency: editCurrency,
    });
    setEditAcct(null);
  }

  async function handleDeactivate() {
    if (!deactivateTarget) return;
    await deactivateAccount.mutateAsync(deactivateTarget.id);
    setDeactivateTarget(null);
  }

  async function handleAddEntry() {
    if (!entryDate || !entryDesc || !debitAccountId || !creditAccountId || !amount) return;
    await addEntry.mutateAsync({
      entry_date: entryDate,
      description: entryDesc,
      postings: [
        { account_id: debitAccountId, direction: 1, amount, currency: "LKR" },
        { account_id: creditAccountId, direction: -1, amount, currency: "LKR" },
      ],
    });
    setEntryOpen(false);
    resetEntryForm();
  }

  async function handleReverse() {
    if (!reverseTarget) return;
    await reverseEntry.mutateAsync(reverseTarget);
    setReverseTarget(null);
  }

  return (
    <ScreenShell>
      <PageHeader
        title="Ledger"
        subtitle="Double-entry accounting · YA 2025/26"
        actions={
          <>
            <Pressable
              onPress={() => (tab === "accounts" ? setAcctOpen(true) : setEntryOpen(true))}
              className="w-9 h-9 rounded-full bg-primary items-center justify-center active:opacity-85"
            >
              <Plus color={theme.primaryForeground} size={18} />
            </Pressable>
            <AvatarMoreButton />
          </>
        }
      />

      {/* Segmented control */}
      <View className="flex-row bg-muted rounded-full p-1 gap-0.5 mb-5">
        <SegmentButton label="Accounts" active={tab === "accounts"} onPress={() => setTab("accounts")} />
        <SegmentButton label="Entries" active={tab === "entries"} onPress={() => setTab("entries")} />
        <SegmentButton label="Income Statement" active={tab === "income"} onPress={() => setTab("income")} />
      </View>

      {/* ── Accounts tab ── */}
      {tab === "accounts" && (
        <CardContainer>
          {accounts.isLoading ? (
            <ActivityIndicator color={theme.foreground} />
          ) : accountsList.length === 0 ? (
            <View className="items-center gap-2 py-8">
              <Text className="text-[13px] font-medium text-foreground">No accounts yet</Text>
              <Pressable onPress={() => setAcctOpen(true)}>
                <Text className="text-[12px] text-primary underline">Add your first account</Text>
              </Pressable>
            </View>
          ) : (
            accountsList.map((a, i) => (
              <View
                key={a.id}
                className={`flex-row items-center gap-3 py-3 ${i === accountsList.length - 1 ? "" : "border-b border-border"}`}
              >
                <Text className="text-[11px] text-muted-foreground w-12 shrink-0" style={MONO_MEDIUM}>
                  {a.code}
                </Text>
                <View className="flex-1 min-w-0">
                  <Text className="text-[13.5px] font-medium text-foreground" numberOfLines={1}>
                    {a.name}
                  </Text>
                  <View className="flex-row items-center gap-1.5 mt-1">
                    <TypeBadge type={a.type} />
                    <Text className="text-[11px] text-muted-foreground" style={MONO_MEDIUM}>
                      {a.currency}
                    </Text>
                    {!a.is_active && (
                      <View className="px-1.5 py-0.5 rounded bg-muted">
                        <Text className="text-[11px] font-medium text-muted-foreground">Inactive</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View className="flex-row items-center gap-1 shrink-0">
                  <Pressable
                    onPress={() => router.push({ pathname: "/account-detail", params: { id: a.id } })}
                    className="w-8 h-8 rounded-full items-center justify-center active:bg-muted"
                  >
                    <Eye color={theme.mutedForeground} size={15} />
                  </Pressable>
                  <Pressable
                    onPress={() => openEdit(a)}
                    className="w-8 h-8 rounded-full items-center justify-center active:bg-muted"
                  >
                    <Pencil color={theme.mutedForeground} size={15} />
                  </Pressable>
                  {a.is_active && (
                    <Pressable
                      onPress={() => setDeactivateTarget(a)}
                      className="w-8 h-8 rounded-full items-center justify-center active:bg-muted"
                    >
                      <Trash2 color={theme.mutedForeground} size={15} />
                    </Pressable>
                  )}
                </View>
              </View>
            ))
          )}
        </CardContainer>
      )}

      {/* ── Entries tab ── */}
      {tab === "entries" && (
        <CardContainer>
          {entries.isLoading ? (
            <ActivityIndicator color={theme.foreground} />
          ) : entriesList.length === 0 ? (
            <View className="items-center gap-2 py-8">
              <Text className="text-[13px] font-medium text-foreground">No journal entries yet</Text>
              <Pressable onPress={() => setEntryOpen(true)}>
                <Text className="text-[12px] text-primary underline">Post the first entry</Text>
              </Pressable>
            </View>
          ) : (
            entriesList.map((entry: JournalEntry, i) => {
              const fp = entry.postings[0];
              const reversed = !!entry.reversed_by;
              return (
                <View
                  key={entry.id}
                  className={`flex-row items-center gap-2 ${reversed ? "opacity-50" : ""}`}
                >
                  <View className="flex-1 min-w-0">
                    <PostingRow
                      date={entry.entry_date}
                      description={reversed ? `${entry.description} (reversed)` : entry.description}
                      account={fp ? accountMap[fp.account_id]?.name : undefined}
                      amount={fp ? fmt(fp.amount) : "—"}
                      isCredit={fp ? fp.direction === -1 : false}
                      currency={fp?.currency}
                      isLast={i === entriesList.length - 1}
                    />
                    <View className="flex-row items-center gap-1.5 -mt-1 mb-2">
                      <View className="px-1.5 py-0.5 rounded bg-muted">
                        <Text className="text-[10.5px] font-medium text-muted-foreground capitalize">
                          {entry.source}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {!reversed && (
                    <Pressable
                      onPress={() => setReverseTarget(entry.id)}
                      className="w-8 h-8 rounded-full items-center justify-center active:bg-muted shrink-0"
                    >
                      <RotateCcw color={theme.mutedForeground} size={15} />
                    </Pressable>
                  )}
                </View>
              );
            })
          )}
        </CardContainer>
      )}

      {/* ── Income Statement tab ── */}
      {tab === "income" && (
        <View className="gap-4">
          {incomeStatement.isLoading ? (
            <ActivityIndicator color={theme.foreground} />
          ) : !incomeStatement.data ? (
            <CardContainer>
              <Text className="text-[13px] text-muted-foreground text-center py-6">
                No income statement data available.
              </Text>
            </CardContainer>
          ) : (
            <>
              <CardContainer>
                <SectionTitle>Income</SectionTitle>
                {Object.entries(incomeStatement.data.income ?? {}).length === 0 ? (
                  <Text className="text-[13px] text-muted-foreground text-center py-4">No income recorded</Text>
                ) : (
                  <>
                    {Object.entries(incomeStatement.data.income ?? {}).map(([k, v], idx, arr) => (
                      <View
                        key={k}
                        className={`flex-row justify-between items-center py-2.5 ${idx === arr.length - 1 ? "" : "border-b border-border"}`}
                      >
                        <Text className="text-[13px] text-foreground flex-1 pr-2">{k}</Text>
                        <Text className="text-[13px] font-medium text-foreground" style={MONO_MEDIUM}>
                          {fmt(v)}
                        </Text>
                      </View>
                    ))}
                    <View className="flex-row justify-between items-center px-4 py-2.5 mt-3 rounded-xl" style={{ backgroundColor: "#A5FFB9" }}>
                      <Text className="text-[13px] font-bold" style={{ color: "#010001" }}>Total Income</Text>
                      <Text className="text-[13px] font-bold" style={[MONO_MEDIUM, { color: "#010001" }]}>
                        {fmt(Object.values(incomeStatement.data.income ?? {}).reduce((s, v) => s + Number(v), 0))}
                      </Text>
                    </View>
                  </>
                )}
              </CardContainer>

              <CardContainer>
                <Text className="text-[11px] font-bold uppercase tracking-widest mb-2 mt-1 text-rose-500">
                  Expenses
                </Text>
                {Object.entries(incomeStatement.data.expenses ?? {}).length === 0 ? (
                  <Text className="text-[13px] text-muted-foreground text-center py-4">No expenses recorded</Text>
                ) : (
                  <>
                    {Object.entries(incomeStatement.data.expenses ?? {}).map(([k, v], idx, arr) => (
                      <View
                        key={k}
                        className={`flex-row justify-between items-center py-2.5 ${idx === arr.length - 1 ? "" : "border-b border-border"}`}
                      >
                        <Text className="text-[13px] text-foreground flex-1 pr-2">{k}</Text>
                        <Text className="text-[13px] font-medium text-foreground" style={MONO_MEDIUM}>
                          {fmt(v)}
                        </Text>
                      </View>
                    ))}
                    <View className={`flex-row justify-between items-center px-4 py-2.5 mt-3 rounded-xl ${isDark ? "bg-rose-950" : "bg-rose-100"}`}>
                      <Text className={`text-[13px] font-bold ${isDark ? "text-rose-300" : "text-rose-900"}`}>Total Expenses</Text>
                      <Text className={`text-[13px] font-bold ${isDark ? "text-rose-300" : "text-rose-900"}`} style={MONO_MEDIUM}>
                        {fmt(Object.values(incomeStatement.data.expenses ?? {}).reduce((s, v) => s + Number(v), 0))}
                      </Text>
                    </View>
                  </>
                )}
              </CardContainer>

              <View className="rounded-2xl px-5 py-4 flex-row items-center justify-between" style={{ backgroundColor: "#010001" }}>
                <Text className="text-[13px] font-semibold" style={{ color: "rgba(240,238,232,0.6)" }}>
                  Net Income
                </Text>
                <Text className="text-[22px] font-black" style={[MONO_MEDIUM, { color: "#E8FC85" }]}>
                  {fmt(incomeStatement.data.net_income)}
                </Text>
              </View>
            </>
          )}
        </View>
      )}

      {/* ── Add Account modal ── */}
      <FormModal
        visible={acctOpen}
        title="Add Account"
        onClose={() => setAcctOpen(false)}
        onSubmit={handleAddAccount}
        submitLabel="Create Account"
        submitting={addAccount.isPending}
        submitDisabled={!code || !name}
      >
        <FieldLabel>Code *</FieldLabel>
        <TextField placeholder="e.g. 1100" value={code} onChangeText={setCode} className="mb-3" />
        <FieldLabel>Name *</FieldLabel>
        <TextField placeholder="e.g. Cash at Bank" value={name} onChangeText={setName} className="mb-3" />
        <FieldLabel>Currency</FieldLabel>
        <TextField placeholder="LKR" value={currency} onChangeText={setCurrency} className="mb-3" />
        <FieldLabel>Type</FieldLabel>
        <TypeChipPicker value={type} onChange={setType} />
      </FormModal>

      {/* ── Edit Account modal ── */}
      <FormModal
        visible={!!editAcct}
        title="Edit Account"
        onClose={() => setEditAcct(null)}
        onSubmit={handleUpdateAccount}
        submitLabel="Save Changes"
        submitting={updateAccount.isPending}
        submitDisabled={!editCode || !editName}
      >
        <FieldLabel>Code *</FieldLabel>
        <TextField value={editCode} onChangeText={setEditCode} className="mb-3" />
        <FieldLabel>Name *</FieldLabel>
        <TextField value={editName} onChangeText={setEditName} className="mb-3" />
        <FieldLabel>Currency</FieldLabel>
        <TextField value={editCurrency} onChangeText={setEditCurrency} className="mb-3" />
        <FieldLabel>Type</FieldLabel>
        <TypeChipPicker value={editType} onChange={setEditType} />
      </FormModal>

      {/* ── Deactivate confirm modal ── */}
      <ConfirmModal
        visible={!!deactivateTarget}
        title="Deactivate account?"
        description={`${deactivateTarget?.name ?? ""} will be hidden from the chart of accounts. Existing journal entries are unaffected.`}
        confirmLabel="Deactivate"
        destructive
        onCancel={() => setDeactivateTarget(null)}
        onConfirm={handleDeactivate}
        loading={deactivateAccount.isPending}
      />

      {/* ── Add Entry modal ── */}
      <FormModal
        visible={entryOpen}
        title="New Journal Entry"
        onClose={() => setEntryOpen(false)}
        onSubmit={handleAddEntry}
        submitLabel="Post Entry"
        submitting={addEntry.isPending}
        submitDisabled={!entryDate || !entryDesc || !debitAccountId || !creditAccountId || !amount}
      >
        <FieldLabel>Date *</FieldLabel>
        <TextField placeholder="YYYY-MM-DD" value={entryDate} onChangeText={setEntryDate} className="mb-3" />
        <FieldLabel>Description *</FieldLabel>
        <TextField placeholder="e.g. Office supplies" value={entryDesc} onChangeText={setEntryDesc} className="mb-3" />
        <FieldLabel>Amount (LKR) *</FieldLabel>
        <TextField placeholder="0.00" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" className="mb-3" />
        <FieldLabel>Debit Account *</FieldLabel>
        <AccountChipPicker accounts={accountsList} value={debitAccountId} onChange={setDebitAccountId} />
        <View className="h-3" />
        <FieldLabel>Credit Account *</FieldLabel>
        <AccountChipPicker accounts={accountsList} value={creditAccountId} onChange={setCreditAccountId} />
        <Text className="text-[11.5px] text-muted-foreground mt-3">
          Debit and credit use the same amount to keep the entry balanced.
        </Text>
      </FormModal>

      {/* ── Reverse confirm modal ── */}
      <ConfirmModal
        visible={!!reverseTarget}
        title="Create reversing entry?"
        description="A new journal entry with all debits and credits swapped will be posted. Journal entries are immutable — this is the standard correction method."
        confirmLabel="Post Reversal"
        onCancel={() => setReverseTarget(null)}
        onConfirm={handleReverse}
        loading={reverseEntry.isPending}
      />
    </ScreenShell>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SegmentButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className={`flex-1 py-1.5 rounded-full items-center ${active ? "bg-card" : ""}`}>
      <Text
        className={`text-[12.5px] ${active ? "text-foreground" : "text-muted-foreground"}`}
        style={{ fontFamily: active ? "DMSans_700Bold" : "DMSans_500Medium" }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text className="text-[12px] font-medium text-muted-foreground mb-1.5">{children}</Text>;
}

function TypeChipPicker({ value, onChange }: { value: AccountType; onChange: (t: AccountType) => void }) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {ACCOUNT_TYPES.map((t) => {
        const active = value === t;
        return (
          <Pressable
            key={t}
            onPress={() => onChange(t)}
            className={`px-3 py-2 rounded-full border ${active ? "bg-primary border-primary" : "bg-card border-border"}`}
          >
            <Text
              className={`text-[12.5px] capitalize ${active ? "text-primary-foreground" : "text-foreground"}`}
              style={{ fontFamily: active ? "DMSans_700Bold" : "DMSans_500Medium" }}
            >
              {t}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function AccountChipPicker({
  accounts,
  value,
  onChange,
}: {
  accounts: Account[];
  value: string;
  onChange: (id: string) => void;
}) {
  if (accounts.length === 0) {
    return <Text className="text-[12.5px] text-muted-foreground">No accounts available</Text>;
  }
  return (
    <View className="border border-border rounded-2xl max-h-40">
      <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
        {accounts.map((a, i) => {
          const active = value === a.id;
          return (
            <Pressable
              key={a.id}
              onPress={() => onChange(a.id)}
              className={`flex-row items-center gap-2 px-3 py-2.5 ${i === accounts.length - 1 ? "" : "border-b border-border"} ${active ? "bg-muted" : ""}`}
            >
              <Text className="text-[11px] text-muted-foreground w-12" style={MONO_MEDIUM}>
                {a.code}
              </Text>
              <Text
                className={`text-[13px] flex-1 ${active ? "text-foreground" : "text-foreground"}`}
                style={{ fontFamily: active ? "DMSans_700Bold" : "DMSans_400Regular" }}
                numberOfLines={1}
              >
                {a.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function FormModal({
  visible,
  title,
  onClose,
  onSubmit,
  submitLabel,
  submitting,
  submitDisabled,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  submitLabel: string;
  submitting?: boolean;
  submitDisabled?: boolean;
  children: React.ReactNode;
}) {
  const theme = useThemeColors();
  const themeVars = useThemeVars();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={[themeVars, { backgroundColor: "rgba(0,0,0,0.4)" }]}>
        <View className="bg-background rounded-t-[28px] max-h-[85%]">
          <View className="flex-row items-center justify-between px-5 pt-5 pb-3">
            <Text className="text-foreground" style={{ fontFamily: "DMSans_900Black", fontSize: 20, letterSpacing: -0.5 }}>
              {title}
            </Text>
            <Pressable onPress={onClose} className="w-8 h-8 rounded-full items-center justify-center bg-muted">
              <X color={theme.foreground} size={16} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          <View className="flex-row gap-2.5 px-5 pt-2 pb-6">
            <PillButton variant="secondary" onPress={onClose} className="flex-1">
              Cancel
            </PillButton>
            <PillButton
              variant="primary"
              onPress={onSubmit}
              loading={submitting}
              disabled={submitDisabled}
              className="flex-1"
            >
              {submitLabel}
            </PillButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ConfirmModal({
  visible,
  title,
  description,
  confirmLabel,
  destructive,
  onCancel,
  onConfirm,
  loading,
}: {
  visible: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
}) {
  const themeVars = useThemeVars();
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View className="flex-1 items-center justify-center px-6" style={[themeVars, { backgroundColor: "rgba(0,0,0,0.4)" }]}>
        <View className="bg-background rounded-[24px] p-5 w-full max-w-[380px]">
          <Text className="text-foreground mb-2" style={{ fontFamily: "DMSans_900Black", fontSize: 18, letterSpacing: -0.4 }}>
            {title}
          </Text>
          <Text className="text-[13px] text-muted-foreground leading-[19px] mb-5">{description}</Text>
          <View className="flex-row gap-2.5">
            <PillButton variant="secondary" onPress={onCancel} className="flex-1">
              Cancel
            </PillButton>
            <PillButton
              variant={destructive ? "destructive" : "primary"}
              onPress={onConfirm}
              loading={loading}
              className="flex-1"
            >
              {confirmLabel}
            </PillButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}
