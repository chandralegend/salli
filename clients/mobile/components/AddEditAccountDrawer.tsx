import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { Drawer } from "@/components/ui/drawer";
import { ChipSelect } from "@/components/ui/filter-chip";
import { PillButton } from "@/components/ui/pill-button";
import { TextField } from "@/components/ui/text-field";
import type { Account } from "@/hooks/useDashboard";
import { useAddAccount, useUpdateAccount } from "@/hooks/useLedger";

const ACCOUNT_TYPES: Account["type"][] = ["asset", "liability", "equity", "income", "expense"];
const CURRENCIES = ["LKR", "USD", "EUR", "GBP", "AUD"] as const;

const FieldLabel = ({ children }: { children: string }) => (
  <Text className="mb-2 pl-0.5 text-[10px] font-sans-medium uppercase tracking-wide text-foreground/40">{children}</Text>
);

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
    const body = { code: code.trim(), name: name.trim(), type, currency };
    if (isEdit && account) {
      updateAccount.mutate({ accountId: account.id, body }, { onSuccess: onClose });
    } else {
      addAccount.mutate(body, { onSuccess: onClose });
    }
  };

  return (
    <Drawer
      visible={visible}
      onClose={onClose}
      title={isEdit ? "Edit Account" : "New Account"}
      footer={
        <PillButton variant="accent" loading={saving} disabled={!canSubmit} onPress={submit}>
          {isEdit ? "Save Changes" : "Add Account"}
        </PillButton>
      }
    >
      <View className="mb-2.5 flex-row gap-2">
        <TextField
          className="w-[120px]"
          label="Code *"
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
          placeholder="1000"
        />
        <TextField className="flex-1" label="Name *" value={name} onChangeText={setName} placeholder="Cash at Bank" />
      </View>

      <FieldLabel>Type *</FieldLabel>
      <ChipSelect className="mb-3" options={ACCOUNT_TYPES} value={type} onChange={setType} capitalize />

      <FieldLabel>Currency</FieldLabel>
      <ChipSelect className="mb-1" options={CURRENCIES as readonly string[]} value={currency} onChange={setCurrency} />
    </Drawer>
  );
}
