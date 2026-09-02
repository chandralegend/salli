import {
  ChevronDown,
  CreditCard,
  Landmark,
  PiggyBank,
  Plus,
  ShoppingBag,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { AddEditAccountDrawer } from "@/components/AddEditAccountDrawer";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { Card } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { ActionButton } from "@/components/ui/action-button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { TextField } from "@/components/ui/text-field";
import type { Account } from "@/hooks/useDashboard";
import { useLedgerMutations, type EntryDraft } from "@/hooks/useLedger";
import type { AccountHint } from "@/lib/api/types.gen";
import { formatLKR } from "@/lib/format";
import { useThemeColors } from "@/lib/theme";
import { useToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type EntryType = "income" | "expense" | "transfer";
type Side = "debit" | "credit";

type NewEntryModalProps = {
  visible: boolean;
  onClose: () => void;
  accounts: Account[];
  /** AI-parsed draft to pre-fill the form when opened via voice/text quick-add. */
  initialDraft?: EntryDraft | null;
};

const TYPE_META: Record<Account["type"], { Icon: typeof Wallet; label: string }> = {
  asset: { Icon: Wallet, label: "Asset" },
  liability: { Icon: CreditCard, label: "Liability" },
  equity: { Icon: PiggyBank, label: "Equity" },
  income: { Icon: TrendingUp, label: "Income" },
  expense: { Icon: ShoppingBag, label: "Expense" },
};

/** Add Journal Entry — mockup's "New Entry" screen, as a modal so it can be
 * deep-linked from the tab-bar "+" button from any tab. */
export function NewEntryModal({ visible, onClose, accounts, initialDraft }: NewEntryModalProps) {
  const colors = useThemeColors();
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

  // On each open, apply the AI draft (voice/text quick-add) or start blank. The
  // modal instance is persistent, so this also clears stale state between opens.
  // Set account ids directly (not via handleType, which would clear them).
  useEffect(() => {
    if (!visible) return;
    setPicker(null);
    setPendingAccountSide(null);
    if (initialDraft) {
      setType(initialDraft.entry_type);
      setAmount(initialDraft.amount ?? "");
      setDescription(initialDraft.description ?? "");
      setDebitAccountId(initialDraft.debit_account_id ?? null);
      setCreditAccountId(initialDraft.credit_account_id ?? null);
      setDebitHint(initialDraft.debit_account_hint ?? null);
      setCreditHint(initialDraft.credit_account_hint ?? null);
    } else {
      setType("expense");
      setAmount("");
      setDescription("");
      setDebitAccountId(null);
      setCreditAccountId(null);
      setDebitHint(null);
      setCreditHint(null);
    }
  }, [visible, initialDraft]);

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
        entry_date: new Date().toISOString().slice(0, 10),
        description,
        debitAccountId,
        creditAccountId,
        amount,
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

  return (
    <Drawer
      visible={visible}
      onClose={onClose}
      footer={
        <ActionButton loading={saving} disabled={!canSubmit} onPress={handlePost}>
          Post Entry
        </ActionButton>
      }
    >
      <>
        <View className="mb-1 flex-row items-center gap-3">
          <Text style={{ letterSpacing: -0.7 }} className="flex-1 font-sans-extrabold text-[23px] text-foreground">New Entry</Text>
          <View className="rounded-pill border border-foreground/10 bg-foreground/[0.07] px-3.5 py-1.5">
            <Text className="font-sans-medium text-[15px] text-muted-foreground">
              {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
            </Text>
          </View>
        </View>

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
      </>

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

      {/* Lives inside NewEntryModal (not the Ledger screen's Accounts-tab
          instance) so creating an account never unmounts the in-progress
          entry — amount/description/type are untouched throughout. */}
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
    </Drawer>
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
  const Icon = meta?.Icon ?? (side === "debit" ? ShoppingBag : Landmark);
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
      <View
        className={cn(
          "h-8 w-8 items-center justify-center rounded-card",
          filled ? "border border-salli-accent/20 bg-salli-accent/10" : "bg-foreground/[0.06]",
        )}
      >
        <Icon size={15} color={filled ? colors.accent : "rgba(148,163,184,0.6)"} strokeWidth={2.5} />
      </View>
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
