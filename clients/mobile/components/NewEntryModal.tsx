import {
  ChevronDown,
  CreditCard,
  Landmark,
  PiggyBank,
  ShoppingBag,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Modal as RNModal, Platform, Pressable, ScrollView, Text, View } from "react-native";

import { Card } from "@/components/ui/card";
import { PillButton } from "@/components/ui/pill-button";
import { TextField } from "@/components/ui/text-field";
import type { Account } from "@/hooks/useDashboard";
import { useLedgerMutations } from "@/hooks/useLedger";
import { formatLKR } from "@/lib/format";
import { useThemeColors, useThemeVars } from "@/lib/theme";
import { cn } from "@/lib/utils";

type EntryType = "income" | "expense" | "transfer";
type Side = "debit" | "credit";

type NewEntryModalProps = {
  visible: boolean;
  onClose: () => void;
  accounts: Account[];
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
export function NewEntryModal({ visible, onClose, accounts }: NewEntryModalProps) {
  const colors = useThemeColors();
  const themeVars = useThemeVars();
  const { postEntry } = useLedgerMutations();

  const [type, setType] = useState<EntryType>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [debitAccountId, setDebitAccountId] = useState<string | null>(null);
  const [creditAccountId, setCreditAccountId] = useState<string | null>(null);
  const [picker, setPicker] = useState<Side | null>(null);
  const [saving, setSaving] = useState(false);

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
    } finally {
      setSaving(false);
    }
  };

  const pickerCandidates = picker === "debit" ? debitCandidates : creditCandidates;
  const pickerSelectedId = picker === "debit" ? debitAccountId : creditAccountId;

  return (
    <RNModal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <View style={[{ flex: 1, backgroundColor: colors.background }, themeVars]}>
        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View className="flex-row items-center gap-3 px-5 pt-4">
            <Pressable onPress={onClose} className="h-9 w-9 items-center justify-center rounded-full bg-foreground/[0.08]">
              <X size={16} color={colors.foreground} strokeWidth={2} />
            </Pressable>
            <Text className="flex-1 font-sans-bold text-[20px] text-foreground">New Entry</Text>
            <View className="rounded-pill border border-foreground/10 bg-foreground/[0.07] px-3.5 py-1.5">
              <Text className="font-sans-medium text-[12px] text-foreground/45">
                {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
              </Text>
            </View>
          </View>

          <ScrollView className="flex-1 px-4" keyboardShouldPersistTaps="handled">
            <View className="mt-3.5 flex-row rounded-pill border border-foreground/[0.07] bg-card p-1">
              {(["income", "expense", "transfer"] as EntryType[]).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => handleType(t)}
                  className={cn(
                    "h-9 flex-1 items-center justify-center rounded-pill",
                    type === t && "border border-foreground/10 bg-background",
                  )}
                >
                  <Text
                    className={cn(
                      "text-[13px] capitalize",
                      type === t ? "font-sans-semibold text-foreground" : "font-sans-medium text-foreground/30",
                    )}
                  >
                    {t}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Card className="mt-4 border-foreground/[0.08] bg-salli-navy-card px-5 pb-4 pt-5">
              <Text className="mb-2.5 text-[11px] font-sans-medium uppercase tracking-wide text-white/40">Amount</Text>
              <View className="mb-3.5 flex-row items-baseline gap-1.5">
                <Text className="font-sans-semibold text-[22px] text-white/35">Rs.</Text>
                <TextField
                  label=""
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  className="flex-1 border-0 bg-transparent p-0"
                  style={{ fontSize: 44, fontFamily: "Inter_800ExtraBold", letterSpacing: -2, color: "#FFFFFF" }}
                />
                <Text className="mb-1 font-sans-regular text-[14px] text-white/20">.00</Text>
              </View>

              {type === "transfer" ? (
                <View className="self-start rounded-pill border border-white/10 bg-white/[0.07] px-3 py-1">
                  <Text className="font-sans-medium text-[12px] text-white/40">Account transfer</Text>
                </View>
              ) : categoryAccount ? (
                <View className="self-start flex-row items-center gap-1.5 rounded-pill border border-salli-accent/40 bg-salli-accent/25 px-3 py-1">
                  {(() => {
                    const Icon = TYPE_META[categoryAccount.type].Icon;
                    return <Icon size={11} color="#2563EB" strokeWidth={2.5} />;
                  })()}
                  <Text className="font-sans-semibold text-[12px] text-salli-accent">{categoryAccount.name}</Text>
                </View>
              ) : (
                <View className="self-start rounded-pill border border-white/10 bg-white/[0.07] px-3 py-1">
                  <Text className="font-sans-medium text-[12px] text-white/35">
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

            <Text className="mb-1.5 mt-3.5 pl-0.5 text-[11px] font-sans-semibold uppercase tracking-wide text-foreground/30">
              Double-Entry Accounts
            </Text>
            <View>
              <AccountRow
                side="debit"
                account={debitAccount}
                amount={amountNum}
                position="top"
                onPress={() => setPicker("debit")}
              />
              <AccountRow
                side="credit"
                account={creditAccount}
                amount={amountNum}
                position="bottom"
                onPress={() => setPicker("credit")}
              />
            </View>

            <View className="mb-2 mt-3 flex-row items-center gap-2 px-0.5">
              <View className={cn("h-2 w-2 rounded-full", canSubmit ? "bg-salli-accent" : "bg-foreground/20")} />
              <Text className="flex-1 text-[11px] leading-4 text-foreground/30">
                {debitAccount && creditAccount
                  ? `Entry balanced · Dr = Cr = Rs. ${formatLKR(amountNum, 0)} · immutable once posted`
                  : "Pick a debit and credit account to balance this entry."}
              </Text>
            </View>
          </ScrollView>

          <View className="px-4 pb-6 pt-2">
            <PillButton loading={saving} disabled={!canSubmit} onPress={handlePost}>
              Post Entry
            </PillButton>
          </View>
        </KeyboardAvoidingView>

        <AccountPickerSheet
          visible={picker !== null}
          side={picker}
          candidates={pickerCandidates}
          selectedId={pickerSelectedId}
          onSelect={(id) => {
            if (picker === "debit") setDebitAccountId(id);
            else setCreditAccountId(id);
            setPicker(null);
          }}
          onClose={() => setPicker(null)}
        />
      </View>
    </RNModal>
  );
}

function AccountRow({
  side,
  account,
  amount,
  position,
  onPress,
}: {
  side: Side;
  account: Account | undefined;
  amount: number;
  position: "top" | "bottom";
  onPress: () => void;
}) {
  const meta = account ? TYPE_META[account.type] : null;
  const Icon = meta?.Icon ?? (side === "debit" ? ShoppingBag : Landmark);
  const filled = Boolean(account);

  return (
    <Pressable
      onPress={onPress}
      className={cn(
        "flex-row items-center gap-2.5 border border-foreground/[0.08] bg-card px-3.5 py-3",
        position === "top" ? "rounded-t-card border-b-0" : "rounded-b-card",
      )}
    >
      <View
        className={cn(
          "h-8 w-8 items-center justify-center rounded-[9px]",
          filled ? "border border-salli-accent/20 bg-salli-accent/10" : "bg-foreground/[0.06]",
        )}
      >
        <Icon size={13} color={filled ? "#2563EB" : "rgba(148,163,184,0.6)"} strokeWidth={2.5} />
      </View>
      <View className="flex-1">
        <Text className="mb-0.5 text-[10px] font-sans-medium uppercase tracking-wide text-foreground/30">
          {side === "debit" ? "Debit" : "Credit"}
          {meta ? ` · ${meta.label}` : ""}
        </Text>
        <Text className={cn("font-sans-semibold text-[13px]", filled ? "text-foreground" : "text-foreground/35")}>
          {account ? `${account.code} · ${account.name}` : `Select ${side} account`}
        </Text>
      </View>
      <View className="flex-row items-center gap-2">
        <Text
          className={cn(
            "font-sans-semibold text-[13px]",
            side === "debit" ? "text-foreground" : "text-foreground/55",
            !filled && "text-foreground/25",
          )}
        >
          {filled ? `Rs. ${formatLKR(amount, 0)}` : "—"}
        </Text>
        <ChevronDown size={13} color="rgba(148,163,184,0.5)" strokeWidth={2} />
      </View>
    </Pressable>
  );
}

function AccountPickerSheet({
  visible,
  side,
  candidates,
  selectedId,
  onSelect,
  onClose,
}: {
  visible: boolean;
  side: Side | null;
  candidates: Account[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const colors = useThemeColors();
  const themeVars = useThemeVars();

  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/50" onPress={onClose}>
        <Pressable
          style={[{ backgroundColor: colors.background }, themeVars]}
          className="max-h-[70%] rounded-t-[24px] border-t border-foreground/[0.08] px-4 pb-8 pt-3"
          onPress={(e) => e.stopPropagation()}
        >
          <View className="mb-3 items-center">
            <View className="h-1 w-9 rounded-pill bg-foreground/15" />
          </View>
          <Text className="mb-3 px-1 font-sans-bold text-[16px] text-foreground">
            {side === "debit" ? "Debit account" : "Credit account"}
          </Text>
          {candidates.length === 0 ? (
            <Text className="px-1 pb-4 text-[13px] text-foreground/40">No matching accounts for this entry type.</Text>
          ) : (
            <ScrollView>
              <View className="gap-1.5">
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
                          "h-8 w-8 items-center justify-center rounded-[9px]",
                          active ? "border border-salli-accent/20 bg-salli-accent/10" : "bg-foreground/[0.06]",
                        )}
                      >
                        <Icon size={13} color={active ? "#2563EB" : "rgba(148,163,184,0.7)"} strokeWidth={2.5} />
                      </View>
                      <View className="flex-1">
                        <Text
                          className={cn(
                            "font-sans-semibold text-[13px]",
                            active ? "text-salli-accent" : "text-foreground",
                          )}
                        >
                          {a.code} · {a.name}
                        </Text>
                        <Text className="mt-0.5 text-[11px] text-foreground/35">{meta.label}</Text>
                      </View>
                      {a.currency !== "LKR" && (
                        <View className="rounded-[4px] bg-foreground/[0.07] px-1.5 py-px">
                          <Text className="text-[10px] font-sans-medium text-foreground/45">{a.currency}</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </RNModal>
  );
}
