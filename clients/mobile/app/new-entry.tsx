import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  CreditCard,
  PiggyBank,
  Plus,
  ShoppingBag,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";

import { AddEditAccountDrawer } from "@/components/AddEditAccountDrawer";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { Card } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { PageShell } from "@/components/ui/page-shell";
import { PostingChip } from "@/components/ui/posting-chip";
import { ActionButton } from "@/components/ui/action-button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { TextField } from "@/components/ui/text-field";
import type { Account } from "@/hooks/useDashboard";
import { useAccounts } from "@/hooks/useLedger";
import { useLedgerMutations, type EntryDraft } from "@/hooks/useLedger";
import type { AccountHint } from "@/lib/api/types.gen";
import { formatLKR } from "@/lib/format";
import { useSalliStore } from "@/lib/store";
import { useHardShadow, useThemeColors } from "@/lib/theme";
import { useToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type EntryType = "income" | "expense" | "transfer";

/** YYYY-MM-DD in the device's own timezone.
 *
 *  Not `toISOString().slice(0, 10)`, which converts to UTC first — in Colombo
 *  (UTC+5:30) an entry dated today, saved before 05:30, would post as
 *  yesterday. The ledger's dates are calendar dates, not instants. */
function toIsoDate(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
type Side = "debit" | "credit";

const TYPE_META: Record<Account["type"], { Icon: typeof Wallet; label: string }> = {
  asset: { Icon: Wallet, label: "Asset" },
  liability: { Icon: CreditCard, label: "Liability" },
  equity: { Icon: PiggyBank, label: "Equity" },
  income: { Icon: TrendingUp, label: "Income" },
  expense: { Icon: ShoppingBag, label: "Expense" },
};

/**
 * New entry — a screen, not a sheet.
 *
 * It was a bottom sheet mounted by Ledger, which meant the form was always
 * partly off-screen behind a keyboard and could only be reached by first
 * navigating to Ledger and setting a flag in the store. As a route it is a
 * plain push from anywhere, and the whole form is visible at once — which
 * matters because posting a balanced entry is a four-field decision, not a
 * one-line capture.
 *
 * Date and currency are new here, and both were bugs rather than omissions:
 * `entry_date` was hardcoded to today (so nothing could be back-dated) and
 * every posting was written as LKR regardless of the account's own currency.
 */
export default function NewEntryScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const shadow = useHardShadow();
  const accounts = useAccounts().data ?? [];
  // The AI draft from voice/free-text capture, left in the store by whoever
  // navigated here. Read once on mount so a re-render cannot re-apply it over
  // edits the user has since made.
  const [initialDraft] = useState(() => useSalliStore.getState().quickAddDraft);
  const onClose = () => router.back();
  const { postEntry } = useLedgerMutations();
  const showToast = useToast();

  const [type, setType] = useState<EntryType>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [debitAccountId, setDebitAccountId] = useState<string | null>(null);
  const [creditAccountId, setCreditAccountId] = useState<string | null>(null);
  const [debitHint, setDebitHint] = useState<AccountHint | null>(null);
  const [creditHint, setCreditHint] = useState<AccountHint | null>(null);
  const [picker, setPicker] = useState<Side | null>(null);
  // Set while the user is creating a brand-new account from inside the picker
  // (side that was open when they tapped "+ Add new account"). The entry form
  // underneath stays mounted throughout, so nothing typed so far is lost.
  const [pendingAccountSide, setPendingAccountSide] = useState<Side | null>(null);
  const [saving, setSaving] = useState(false);
  const [entryDate, setEntryDate] = useState(new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [currency, setCurrency] = useState("LKR");
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);

  // Seed from the AI draft exactly once, on mount. As a sheet this had to
  // re-run on every open to clear stale state; a screen is mounted fresh each
  // time, so the effect is gone — and with it the risk of re-applying the
  // draft over edits the user has already made.
  useEffect(() => {
    if (!initialDraft) return;
    setType(initialDraft.entry_type);
    setAmount(initialDraft.amount ?? "");
    setDescription(initialDraft.description ?? "");
    setDebitAccountId(initialDraft.debit_account_id ?? null);
    setCreditAccountId(initialDraft.credit_account_id ?? null);
    setDebitHint(initialDraft.debit_account_hint ?? null);
    setCreditHint(initialDraft.credit_account_hint ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const debitCandidates = useMemo(
    () =>
      accounts.filter((a) =>
        type === "income" ? a.type === "asset" : type === "transfer" ? a.type === "asset" : a.type === "expense",
      ),
    [accounts, type],
  );
  const creditCandidates = useMemo(
    () => accounts.filter((a) => (type === "income" ? a.type === "income" : a.type === "asset")),
    [accounts, type],
  );

  const debitAccount = accounts.find((a) => a.id === debitAccountId);
  const creditAccount = accounts.find((a) => a.id === creditAccountId);

  // The "category" of a lay transaction is its P&L account: the expense being
  // debited, or the income being credited. (Transfers have no category.)
  const categoryAccount = type === "income" ? creditAccount : type === "expense" ? debitAccount : undefined;

  const canSubmit = Boolean(amount && Number(amount) > 0 && description && debitAccountId && creditAccountId);
  const amountNum = Number(amount) || 0;

  const reset = () => {
    setAmount("");
    setDescription("");
    setDebitAccountId(null);
    setCreditAccountId(null);
    setType("expense");
  };

  const handleType = (t: EntryType) => {
    setType(t);
    setDebitAccountId(null);
    setCreditAccountId(null);
  };

  const handlePost = async () => {
    if (!debitAccountId || !creditAccountId) return;
    setSaving(true);
    try {
      await postEntry({
        // The chosen date, not today. This used to be `new Date()` with the
        // date shown as a decorative pill, so no entry could be back-dated.
        entry_date: toIsoDate(entryDate),
        description,
        debitAccountId,
        creditAccountId,
        amount,
        currency,
      });
      reset();
      onClose();
      showToast("Entry posted.", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Could not post this entry. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const pickerCandidates = picker === "debit" ? debitCandidates : creditCandidates;
  const pickerSelectedId = picker === "debit" ? debitAccountId : creditAccountId;

  // Sensible fallback account type for a brand-new account, when the AI parser
  // gave no hint for this side — based on the entry type + which side it is.
  const defaultTypeForSide = (side: Side): Account["type"] => {
    if (side === "debit") return type === "expense" ? "expense" : "asset";
    return type === "income" ? "income" : "asset";
  };
  const pendingHint = pendingAccountSide === "debit" ? debitHint : pendingAccountSide === "credit" ? creditHint : null;
  const pendingPrefill = pendingAccountSide
    ? { name: pendingHint?.name, type: pendingHint?.type ?? defaultTypeForSide(pendingAccountSide) }
    : undefined;

  const currencies = useMemo(() => {
    // Offered currencies come from the user's own accounts — there is no point
    // offering a unit they hold nothing in. LKR is always present as the base.
    const set = new Set<string>(["LKR"]);
    accounts.forEach((a) => set.add(a.currency));
    return [...set];
  }, [accounts]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <PageShell
        header={
          <View className="flex-row items-center gap-3 px-4 pt-1">
            <AnimatedPressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Back"
              className="h-11 w-11 items-center justify-center rounded-[11px] border-2 border-foreground bg-card"
            >
              <ChevronLeft size={21} color={colors.foreground} strokeWidth={2} />
            </AnimatedPressable>
            <Text
              style={{ letterSpacing: -0.7 }}
              className="flex-1 font-sans-extrabold text-[23px] text-foreground"
            >
              New entry
            </Text>
          </View>
        }
      >
      <View className="px-4">
        <SegmentedControl
          className="mt-3.5"
          options={["income", "expense", "transfer"] as EntryType[]}
          value={type}
          onChange={handleType}
          capitalize
        />

        <Card className="mt-4 bg-salli-hero px-5 pb-4 pt-5">
          <Text className="mb-2.5 text-[11px] font-mono uppercase tracking-widest text-white/60">Amount · LKR</Text>
          {/* No "Rs." prefix — the label above already reads "AMOUNT · LKR",
              and at 42px the prefix pushed the input onto a second line, so
              the figure rendered underneath its own currency mark. */}
          <View className="mb-3.5 flex-row items-end">
            <TextField
              label=""
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="rgba(255,255,255,0.25)"
              className="flex-1 border-0 bg-transparent p-0"
              style={{
                fontSize: 42,
                fontFamily: "Archivo_800ExtraBold",
                letterSpacing: -1.9,
                color: "#FFFFFF",
                paddingVertical: 0,
              }}
            />
            <Text className="pb-1.5 font-sans-extrabold text-[24px] text-white/35">.00</Text>
          </View>

          {type === "transfer" ? (
            <View className="self-start rounded-pill border border-white/10 bg-white/[0.07] px-3 py-1">
              <Text className="font-sans-medium text-[15px] text-white/40">Account transfer</Text>
            </View>
          ) : categoryAccount ? (
            <View className="self-start flex-row items-center gap-1.5 rounded-pill border border-salli-accent/40 bg-salli-accent/25 px-3 py-1">
              {(() => {
                const Icon = TYPE_META[categoryAccount.type].Icon;
                return <Icon size={11} color={colors.accent} strokeWidth={2.5} />;
              })()}
              <Text className="font-sans-semibold text-[15px] text-salli-accent">{categoryAccount.name}</Text>
            </View>
          ) : (
            <View className="self-start rounded-pill border border-white/10 bg-white/[0.07] px-3 py-1">
              <Text className="font-sans-medium text-[15px] text-white/35">
                {type === "income" ? "Pick an income source" : "Pick a category"}
              </Text>
            </View>
          )}
        </Card>

        <TextField
          label="Description"
          className="mt-2.5"
          value={description}
          onChangeText={setDescription}
          placeholder="What was this for?"
        />

        {/* Date and currency side by side, as the mockup has them. Both are new
            controls for values that were previously decided for you: the date
            was always today, and every posting was written as LKR whatever the
            account held. */}
        <View className="mt-2.5 flex-row gap-2.5">
          <Pressable
            onPress={() => setDatePickerOpen(true)}
            className="flex-1 flex-row items-center gap-2 rounded-card border-2 border-foreground bg-card px-3.5 py-3"
          >
            <View className="flex-1">
              <Text className="mb-0.5 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                Date
              </Text>
              <Text className="font-sans-semibold text-[15px] text-foreground">
                {entryDate.toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </Text>
            </View>
            <Calendar size={17} color={colors.mutedForeground} strokeWidth={2} />
          </Pressable>
          <Pressable
            onPress={() => currencies.length > 1 && setCurrencyPickerOpen(true)}
            className="flex-1 flex-row items-center gap-2 rounded-card border-2 border-foreground bg-card px-3.5 py-3"
          >
            <View className="flex-1">
              <Text className="mb-0.5 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                Currency
              </Text>
              <Text className="font-sans-semibold text-[15px] text-foreground">{currency}</Text>
            </View>
            {/* No chevron when there is nothing to choose between — a control
                that cannot change should not look like it can. */}
            {currencies.length > 1 ? (
              <ChevronDown size={17} color={colors.mutedForeground} strokeWidth={2} />
            ) : null}
          </Pressable>
        </View>

        <Text className="mb-1.5 mt-3.5 pl-0.5 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
          Double-Entry Accounts
        </Text>
        <View>
          <AccountRow
            side="debit"
            entryType={type}
            account={debitAccount}
            amount={amountNum}
            position="top"
            onPress={() => setPicker("debit")}
          />
          <AccountRow
            side="credit"
            entryType={type}
            account={creditAccount}
            amount={amountNum}
            position="bottom"
            onPress={() => setPicker("credit")}
          />
        </View>

        <View className="mb-2 mt-3 flex-row items-center gap-2 px-0.5">
          <View className={cn("h-2 w-2 rounded-full", canSubmit ? "bg-salli-accent" : "bg-foreground/20")} />
          <Text className="flex-1 text-[14px] leading-5 text-muted-foreground">
            {debitAccount && creditAccount
              ? `Entry balanced · Dr = Cr = Rs. ${formatLKR(amountNum, 0)} · immutable once posted`
              : "Pick a debit and credit account to balance this entry."}
          </Text>
        </View>

        <ActionButton
          className="mt-5"
          loading={saving}
          disabled={!canSubmit}
          onPress={handlePost}
        >
          Post entry
        </ActionButton>
        <Text className="mb-6 mt-2.5 text-center text-[13.5px] text-muted-foreground">
          Both sides balance. This cannot be edited once posted.
        </Text>
      </View>
      </PageShell>

      {/* Native picker. On iOS it sits in a sheet with an explicit Done, since
          the inline calendar has no commit affordance of its own; on Android
          the OS dialog handles that itself. */}
      {datePickerOpen && Platform.OS === "android" ? (
        <DateTimePicker
          value={entryDate}
          mode="date"
          maximumDate={new Date()}
          onChange={(_, picked) => {
            setDatePickerOpen(false);
            if (picked) setEntryDate(picked);
          }}
        />
      ) : null}
      <Drawer
        visible={datePickerOpen && Platform.OS === "ios"}
        onClose={() => setDatePickerOpen(false)}
        title="Entry date"
      >
        <DateTimePicker
          value={entryDate}
          mode="date"
          display="inline"
          // Future-dated entries are not something the ledger should invite:
          // you are recording what happened, not scheduling it.
          maximumDate={new Date()}
          onChange={(_, picked) => {
            if (picked) setEntryDate(picked);
          }}
        />
        <ActionButton className="mb-4 mt-2" onPress={() => setDatePickerOpen(false)}>
          Done
        </ActionButton>
      </Drawer>

      <Drawer
        visible={currencyPickerOpen}
        onClose={() => setCurrencyPickerOpen(false)}
        title="Currency"
      >
        <View className="mb-4 gap-3.5">
          {currencies.map((c) => {
            const held = accounts.filter((a) => a.currency === c).length;
            return (
              <Pressable
                key={c}
                onPress={() => {
                  setCurrency(c);
                  setCurrencyPickerOpen(false);
                }}
                className={cn(
                  "flex-row items-center justify-between rounded-card border-2 border-foreground px-4 py-3.5",
                  c === currency ? "bg-foreground" : "bg-card",
                )}
              >
                <Text
                  className={cn(
                    "font-sans-bold text-[17px]",
                    c === currency ? "text-primary-foreground" : "text-foreground",
                  )}
                >
                  {c}
                </Text>
                <Text
                  className={cn(
                    "text-[13.5px]",
                    c === currency ? "text-primary-foreground/70" : "text-muted-foreground",
                  )}
                >
                  {held} account{held === 1 ? "" : "s"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Drawer>

      <AccountPickerSheet
        visible={picker !== null}
        side={picker}
        entryType={type}
        candidates={pickerCandidates}
        selectedId={pickerSelectedId}
        onSelect={(id) => {
          if (picker === "debit") setDebitAccountId(id);
          else setCreditAccountId(id);
          setPicker(null);
        }}
        onClose={() => setPicker(null)}
        onCreateNew={() => {
          setPendingAccountSide(picker);
          setPicker(null);
        }}
      />

      {/* Lives on this screen (not on Ledger's Accounts tab) so creating an
          account never unmounts the in-progress entry — amount, description
          and type are untouched throughout. */}
      <AddEditAccountDrawer
        visible={pendingAccountSide !== null}
        prefill={pendingPrefill}
        onClose={() => setPendingAccountSide(null)}
        onCreated={(created) => {
          if (pendingAccountSide === "debit") setDebitAccountId(created.id);
          else if (pendingAccountSide === "credit") setCreditAccountId(created.id);
          setPendingAccountSide(null);
        }}
      />
    </View>
  );
}

// "Debit"/"Credit" mean nothing to a non-accountant — say what the side
// actually represents for this entry type instead.
const SIDE_LABEL: Record<EntryType, Record<Side, string>> = {
  expense: { debit: "Category", credit: "Paid from" },
  income: { debit: "Received into", credit: "Source" },
  transfer: { debit: "To", credit: "From" },
};

function AccountRow({
  side,
  entryType,
  account,
  amount,
  position,
  onPress,
}: {
  side: Side;
  entryType: EntryType;
  account: Account | undefined;
  amount: number;
  position: "top" | "bottom";
  onPress: () => void;
}) {
  const colors = useThemeColors();
  const meta = account ? TYPE_META[account.type] : null;
  const filled = Boolean(account);
  const label = SIDE_LABEL[entryType][side];

  return (
    <Pressable
      onPress={onPress}
      className={cn(
        "flex-row items-center gap-2.5 border-2 border-foreground bg-card px-3.5 py-3",
        position === "top" ? "rounded-t-card border-b-0" : "rounded-b-card",
      )}
    >
      {/* The mockup leads each account row with its DR/CR chip rather than a
          type glyph. The glyph could only restate the account's type, which
          the label beside it already says — and the chip is the one thing that
          makes the double-entry model visible on the screen that creates it.
          The section is literally headed "DOUBLE-ENTRY ACCOUNTS". */}
      <PostingChip side={side === "debit" ? "DR" : "CR"} className={filled ? undefined : "opacity-40"} />
      <View className="flex-1">
        <Text className="mb-0.5 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
          {label}
          {meta ? ` · ${meta.label}` : ""}
        </Text>
        <Text className={cn("font-sans-semibold text-[15px]", filled ? "text-foreground" : "text-muted-foreground")}>
          {account ? `${account.code} · ${account.name}` : `Select ${label.toLowerCase()}`}
        </Text>
      </View>
      <View className="flex-row items-center gap-2">
        <Text
          className={cn(
            "font-sans-semibold text-[15px]",
            side === "debit" ? "text-foreground" : "text-foreground/55",
            !filled && "text-muted-foreground",
          )}
        >
          {filled ? `Rs. ${formatLKR(amount, 0)}` : "—"}
        </Text>
        <ChevronDown size={15} color="rgba(148,163,184,0.5)" strokeWidth={2} />
      </View>
    </Pressable>
  );
}

function AccountPickerSheet({
  visible,
  side,
  entryType,
  candidates,
  selectedId,
  onSelect,
  onClose,
  onCreateNew,
}: {
  visible: boolean;
  side: Side | null;
  entryType: EntryType;
  candidates: Account[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
  onCreateNew: () => void;
}) {
  const colors = useThemeColors();
  return (
    <Drawer
      visible={visible}
      onClose={onClose}
      title={side ? SIDE_LABEL[entryType][side] : ""}
      keyboardAvoiding={false}
    >
      <AnimatedPressable
        onPress={onCreateNew}
        haptic="light"
        className="mb-2 flex-row items-center gap-2.5 rounded-card border border-dashed border-salli-accent/40 bg-salli-accent/[0.06] px-3.5 py-3"
      >
        <View className="h-8 w-8 items-center justify-center rounded-card bg-salli-accent/15">
          <Plus size={17} color={colors.accent} strokeWidth={2.5} />
        </View>
        <Text className="font-sans-semibold text-[15px] text-salli-accent">Add new account</Text>
      </AnimatedPressable>

      {candidates.length === 0 ? (
        <Text className="px-1 pb-4 text-[15px] text-muted-foreground">No matching accounts for this entry type yet.</Text>
      ) : (
        <View className="gap-3.5">
          {candidates.map((a) => {
            const meta = TYPE_META[a.type];
            const Icon = meta.Icon;
            const active = a.id === selectedId;
            return (
              <Pressable
                key={a.id}
                onPress={() => onSelect(a.id)}
                className={cn(
                  "flex-row items-center gap-3 rounded-card border px-3.5 py-3",
                  active ? "border-salli-accent bg-salli-accent/10" : "border-foreground/[0.08] bg-card",
                )}
              >
                <View
                  className={cn(
                    "h-8 w-8 items-center justify-center rounded-card",
                    active ? "border border-salli-accent/20 bg-salli-accent/10" : "bg-foreground/[0.06]",
                  )}
                >
                  <Icon size={15} color={active ? colors.accent : "rgba(148,163,184,0.7)"} strokeWidth={2.5} />
                </View>
                <View className="flex-1">
                  <Text
                    className={cn(
                      "font-sans-semibold text-[15px]",
                      active ? "text-salli-accent" : "text-foreground",
                    )}
                  >
                    {a.code} · {a.name}
                  </Text>
                  <Text className="mt-0.5 text-[14px] text-muted-foreground">{meta.label}</Text>
                </View>
                {a.currency !== "LKR" && (
                  <View className="rounded-badge border-[1.5px] border-foreground bg-foreground/[0.07] px-1.5 py-px">
                    <Text className="text-[13px] font-sans-medium text-muted-foreground">{a.currency}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      )}
    </Drawer>
  );
}
