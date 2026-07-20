import { X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal as RNModal, Platform, Pressable, ScrollView, Text, View } from "react-native";

import { PillButton } from "@/components/ui/pill-button";
import { TextField } from "@/components/ui/text-field";
import type { Account } from "@/hooks/useDashboard";
import { useAddAccount, useUpdateAccount } from "@/hooks/useLedger";
import { cn } from "@/lib/utils";
import { useThemeColors, useThemeVars } from "@/lib/theme";

const ACCOUNT_TYPES: Account["type"][] = ["asset", "liability", "equity", "income", "expense"];
const CURRENCIES = ["LKR", "USD", "EUR", "GBP", "AUD"] as const;

/** Bottom-sheet for creating a new account or editing an existing one. When
 * `account` is passed it opens in edit mode (prefilled); otherwise create mode. */
export function AddEditAccountDrawer({
  visible,
  account,
  onClose,
}: {
  visible: boolean;
  account?: Account | null;
  onClose: () => void;
}) {
  const colors = useThemeColors();
  const themeVars = useThemeVars();
  const addAccount = useAddAccount();
  const updateAccount = useUpdateAccount();

  const isEdit = Boolean(account);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<Account["type"]>("asset");
  const [currency, setCurrency] = useState<string>("LKR");

  // Prefill (edit) or reset (create) whenever the sheet is opened.
  useEffect(() => {
    if (!visible) return;
    setCode(account?.code ?? "");
    setName(account?.name ?? "");
    setType(account?.type ?? "asset");
    setCurrency(account?.currency ?? "LKR");
  }, [visible, account]);

  const canSubmit = Boolean(code.trim() && name.trim());
  const saving = addAccount.isPending || updateAccount.isPending;

  const submit = () => {
    if (!canSubmit) return;
    if (isEdit && account) {
      updateAccount.mutate(
        { accountId: account.id, body: { code: code.trim(), name: name.trim(), type, currency } },
        { onSuccess: onClose },
      );
    } else {
      addAccount.mutate({ code: code.trim(), name: name.trim(), type, currency }, { onSuccess: onClose });
    }
  };

  return (
    <RNModal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Pressable
            onPress={() => {}}
            style={themeVars}
            className="max-h-[88%] rounded-t-[28px] border-t border-foreground/10 bg-background px-4 pb-8 pt-2.5"
          >
            <View className="items-center pb-1">
              <View className="h-1 w-10 rounded-full bg-foreground/20" />
            </View>
            <View className="flex-row items-center px-0.5 pb-3.5 pt-1.5">
              <Text className="flex-1 font-sans-bold text-[18px] text-foreground">
                {isEdit ? "Edit Account" : "New Account"}
              </Text>
              <Pressable
                onPress={onClose}
                className="h-[30px] w-[30px] items-center justify-center rounded-full bg-foreground/[0.08]"
              >
                <X size={14} color={colors.mutedForeground} strokeWidth={2} />
              </Pressable>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              {/* code + name */}
              <View className="mb-2.5 flex-row gap-2">
                <TextField
                  className="w-[120px]"
                  label="Code *"
                  value={code}
                  onChangeText={setCode}
                  autoCapitalize="characters"
                  placeholder="1000"
                />
                <TextField
                  className="flex-1"
                  label="Name *"
                  value={name}
                  onChangeText={setName}
                  placeholder="Cash at Bank"
                />
              </View>

              {/* type chips */}
              <Text className="mb-2 pl-0.5 text-[10px] font-sans-medium uppercase tracking-wide text-foreground/40">
                Type *
              </Text>
              <View className="mb-3 flex-row flex-wrap gap-1.5">
                {ACCOUNT_TYPES.map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setType(t)}
                    className={cn(
                      "rounded-pill px-3.5 py-1.5",
                      type === t ? "bg-salli-accent" : "border border-foreground/10 bg-card",
                    )}
                  >
                    <Text
                      className={cn(
                        "text-[12px] capitalize",
                        type === t ? "font-sans-semibold text-white" : "font-sans-medium text-foreground/50",
                      )}
                    >
                      {t}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* currency chips */}
              <Text className="mb-2 pl-0.5 text-[10px] font-sans-medium uppercase tracking-wide text-foreground/40">
                Currency
              </Text>
              <View className="mb-4 flex-row flex-wrap gap-1.5">
                {CURRENCIES.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setCurrency(c)}
                    className={cn(
                      "rounded-pill px-3.5 py-1.5",
                      currency === c ? "bg-salli-accent" : "border border-foreground/10 bg-card",
                    )}
                  >
                    <Text
                      className={cn(
                        "text-[12px]",
                        currency === c ? "font-sans-semibold text-white" : "font-sans-medium text-foreground/50",
                      )}
                    >
                      {c}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <PillButton variant="accent" loading={saving} disabled={!canSubmit} onPress={submit}>
                {isEdit ? "Save Changes" : "Add Account"}
              </PillButton>
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </RNModal>
  );
}
