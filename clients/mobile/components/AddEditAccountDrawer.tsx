import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { Drawer } from "@/components/ui/drawer";
import { ChipSelect } from "@/components/ui/filter-chip";
import { ActionButton } from "@/components/ui/action-button";
import { TextField } from "@/components/ui/text-field";
import type { Account } from "@/hooks/useDashboard";
import { useAddAccount, useUpdateAccount } from "@/hooks/useLedger";

const ACCOUNT_TYPES: Account["type"][] = ["asset", "liability", "equity", "income", "expense"];
const CURRENCIES = ["LKR", "USD", "EUR", "GBP", "AUD"] as const;

const FieldLabel = ({ children }: { children: string }) => (
  <Text className="mb-2 pl-0.5 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">{children}</Text>
);

/** Bottom-sheet for creating a new account or editing an existing one. When
 * `account` is passed it opens in edit mode (prefilled); otherwise create mode.
 * `prefill`/`onCreated` are create-mode-only, used by NewEntryModal to offer
 * inline account creation without losing the in-progress entry. */
export function AddEditAccountDrawer({
  visible,
  account,
  prefill,
  onClose,
  onCreated,
}: {
  visible: boolean;
  account?: Account | null;
  prefill?: { name?: string; type?: Account["type"] };
  onClose: () => void;
  onCreated?: (account: Account) => void;
}) {
  const addAccount = useAddAccount();
  const updateAccount = useUpdateAccount();

  const isEdit = Boolean(account);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<Account["type"]>("asset");
  const [currency, setCurrency] = useState<string>("LKR");

  // Prefill (edit), apply a suggested name/type (create, from an AI hint), or
  // reset (plain create) whenever the sheet is opened.
  useEffect(() => {
    if (!visible) return;
    setCode(account?.code ?? "");
    setName(account?.name ?? prefill?.name ?? "");
    setType(account?.type ?? prefill?.type ?? "asset");
    setCurrency(account?.currency ?? "LKR");
  }, [visible, account, prefill]);

  const canSubmit = Boolean(code.trim() && name.trim());
  const saving = addAccount.isPending || updateAccount.isPending;

  const submit = () => {
    if (!canSubmit) return;
    const body = { code: code.trim(), name: name.trim(), type, currency };
    if (isEdit && account) {
      updateAccount.mutate({ accountId: account.id, body }, { onSuccess: onClose });
    } else {
      addAccount.mutate(body, {
        onSuccess: (created) => {
          onCreated?.(created);
          onClose();
        },
      });
    }
  };

  return (
    <Drawer
      visible={visible}
      onClose={onClose}
      title={isEdit ? "Edit Account" : "New Account"}
      footer={
        <ActionButton variant="accent" loading={saving} disabled={!canSubmit} onPress={submit}>
          {isEdit ? "Save Changes" : "Add Account"}
        </ActionButton>
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
