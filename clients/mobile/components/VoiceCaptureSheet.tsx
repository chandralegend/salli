import { Mic, Sparkles } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { Drawer } from "@/components/ui/drawer";
import { ActionButton } from "@/components/ui/action-button";
import { TextField } from "@/components/ui/text-field";
import { useParseEntry, type EntryDraft } from "@/hooks/useLedger";
import { useThemeColors } from "@/lib/theme";
import { useToast } from "@/lib/toast";

/** Quick-add capture sheet — the user types or dictates (via the keyboard's
 * built-in mic) a plain-language note; AI parses it into a draft entry that
 * pre-fills the New Entry form for review. */
export function VoiceCaptureSheet({
  visible,
  onClose,
  onDraft,
}: {
  visible: boolean;
  onClose: () => void;
  onDraft: (draft: EntryDraft) => void;
}) {
  const colors = useThemeColors();
  const parse = useParseEntry();
  const showToast = useToast();
  const [text, setText] = useState("");

  useEffect(() => {
    if (visible) setText("");
  }, [visible]);

  const submit = () => {
    const value = text.trim();
    if (!value) return;
    parse.mutate(value, {
      onSuccess: (draft) => onDraft(draft),
      onError: () => showToast("Couldn't read that — try rephrasing, or add the entry manually.", "error"),
    });
  };

  return (
    <Drawer
      visible={visible}
      onClose={onClose}
      title="Quick add"
      footer={
        <ActionButton variant="accent" loading={parse.isPending} disabled={!text.trim()} onPress={submit}>
          <Sparkles size={17} color="#FFFFFF" strokeWidth={2} />
          <Text className="font-sans-semibold text-[17px] text-white"> Draft entry</Text>
        </ActionButton>
      }
    >
      <View className="mb-2.5 flex-row items-center gap-2">
        <Mic size={16} color={colors.mutedForeground} strokeWidth={2} />
        <Text className="flex-1 text-[15px] leading-5 text-foreground/40">
          Type it, or tap the mic on your keyboard to speak.
        </Text>
      </View>

      <TextField
        label="Describe your transaction"
        value={text}
        onChangeText={setText}
        placeholder="e.g. Spent 4,500 on groceries at Keells from my Commercial Bank account"
        autoFocus
        multiline
        style={{ minHeight: 96, textAlignVertical: "top" }}
        onSubmitEditing={submit}
      />

      <Text className="mt-2.5 px-0.5 text-[14px] leading-5 text-foreground/30">
        AI fills the entry for you to review — nothing is posted until you confirm.
      </Text>
    </Drawer>
  );
}
