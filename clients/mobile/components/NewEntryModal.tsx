import { Camera, FileText, ShoppingBag, X } from "lucide-react-native";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Modal as RNModal, Platform, Pressable, ScrollView, Text, View } from "react-native";

import { Card } from "@/components/ui/card";
import { PillButton } from "@/components/ui/pill-button";
import { TextField } from "@/components/ui/text-field";
import type { Account } from "@/hooks/useDashboard";
import { useLedgerMutations } from "@/hooks/useLedger";
import { useThemeColors, useThemeVars } from "@/lib/theme";
import { cn } from "@/lib/utils";

type EntryType = "income" | "expense" | "transfer";

type NewEntryModalProps = {
  visible: boolean;
  onClose: () => void;
  accounts: Account[];
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
  const [saving, setSaving] = useState(false);

  const debitCandidates = useMemo(
    () => accounts.filter((a) => (type === "income" ? a.type === "asset" : a.type === "expense" || type === "transfer" && a.type === "asset")),
    [accounts, type],
  );
  const creditCandidates = useMemo(
    () => accounts.filter((a) => (type === "income" ? a.type === "income" : a.type === "asset")),
    [accounts, type],
  );

  const canSubmit = Boolean(amount && description && debitAccountId && creditAccountId);

  const reset = () => {
    setAmount("");
    setDescription("");
    setDebitAccountId(null);
    setCreditAccountId(null);
    setType("expense");
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

  const debitAccount = accounts.find((a) => a.id === debitAccountId);
  const creditAccount = accounts.find((a) => a.id === creditAccountId);

  return (
    <RNModal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <View style={[{ flex: 1, backgroundColor: colors.background }, themeVars]}>
        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View className="flex-row items-center gap-3 px-5 pt-4">
            <Pressable
              onPress={onClose}
              className="h-9 w-9 items-center justify-center rounded-full bg-foreground/[0.08]"
            >
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
                  onPress={() => {
                    setType(t);
                    setDebitAccountId(null);
                    setCreditAccountId(null);
                  }}
                  className={cn("h-9 flex-1 items-center justify-center rounded-pill", type === t && "border border-foreground/10 bg-background")}
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
              <Text className="mb-2.5 text-[11px] font-sans-medium uppercase tracking-wide text-white/40">
                Amount
              </Text>
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
              </View>
              <View className="flex-row flex-wrap gap-1.5">
                <View className="flex-row items-center gap-1.5 rounded-pill border border-salli-accent/40 bg-salli-accent/25 px-3 py-1">
                  <ShoppingBag size={11} color="#2563EB" strokeWidth={2.5} />
                  <Text className="font-sans-semibold text-[12px] text-salli-accent">Food &amp; Groceries</Text>
                </View>
                <View className="rounded-pill border border-white/10 bg-white/[0.07] px-3 py-1">
                  <Text className="font-sans-medium text-[12px] text-white/35">+ Tag</Text>
                </View>
              </View>
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
            <View className="gap-2">
              <View>
                <Text className="mb-1 text-[10px] font-sans-medium uppercase tracking-wide text-foreground/25">
                  Debit
                </Text>
                <View className="flex-row flex-wrap gap-1.5">
                  {debitCandidates.map((a) => (
                    <Pressable
                      key={a.id}
                      onPress={() => setDebitAccountId(a.id)}
                      className={cn(
                        "rounded-pill border px-3 py-1.5",
                        debitAccountId === a.id ? "border-salli-accent bg-salli-accent/10" : "border-foreground/10 bg-card",
                      )}
                    >
                      <Text className={cn("text-[12px]", debitAccountId === a.id ? "font-sans-semibold text-salli-accent" : "text-foreground/50")}>
                        {a.code} · {a.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View>
                <Text className="mb-1 text-[10px] font-sans-medium uppercase tracking-wide text-foreground/25">
                  Credit
                </Text>
                <View className="flex-row flex-wrap gap-1.5">
                  {creditCandidates.map((a) => (
                    <Pressable
                      key={a.id}
                      onPress={() => setCreditAccountId(a.id)}
                      className={cn(
                        "rounded-pill border px-3 py-1.5",
                        creditAccountId === a.id ? "border-salli-accent bg-salli-accent/10" : "border-foreground/10 bg-card",
                      )}
                    >
                      <Text className={cn("text-[12px]", creditAccountId === a.id ? "font-sans-semibold text-salli-accent" : "text-foreground/50")}>
                        {a.code} · {a.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            <Text className="mb-1.5 mt-4 pl-0.5 text-[11px] font-sans-semibold uppercase tracking-wide text-foreground/30">
              Attachments
            </Text>
            <View className="flex-row items-center gap-2">
              <View className="relative h-14 w-14 overflow-hidden rounded-[12px] border border-foreground/10 bg-card">
                <View className="absolute inset-0 items-center justify-center gap-0.5">
                  <FileText size={20} color="rgba(255,255,255,0.25)" strokeWidth={1.5} />
                  <Text className="text-[8px] font-sans-medium text-foreground/20">receipt.jpg</Text>
                </View>
                <View className="absolute right-1 top-1 h-3.5 w-3.5 items-center justify-center rounded-full bg-black/60">
                  <X size={7} color="rgba(255,255,255,0.6)" strokeWidth={3} />
                </View>
              </View>
              <View className="h-14 w-14 items-center justify-center gap-0.5 rounded-[12px] border border-dashed border-foreground/15 bg-card">
                <Camera size={18} color="rgba(255,255,255,0.3)" strokeWidth={2} />
                <Text className="text-[8px] font-sans-medium text-foreground/20">Photo</Text>
              </View>
              <View className="h-14 w-14 items-center justify-center gap-0.5 rounded-[12px] border border-dashed border-foreground/15 bg-card">
                <FileText size={18} color="rgba(255,255,255,0.3)" strokeWidth={2} />
                <Text className="text-[8px] font-sans-medium text-foreground/20">Doc</Text>
              </View>
            </View>

            <View className="mb-2 mt-2.5 flex-row items-center gap-2 px-0.5">
              <View className="h-2 w-2 rounded-full bg-salli-accent" />
              <Text className="flex-1 text-[11px] leading-4 text-foreground/30">
                {debitAccount && creditAccount
                  ? `Entry balanced · Dr = Cr = Rs. ${amount || 0} · immutable once posted`
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
      </View>
    </RNModal>
  );
}
