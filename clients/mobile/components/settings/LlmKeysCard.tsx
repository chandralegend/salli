import { Check, KeyRound, Trash2, TriangleAlert } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

import { Card } from "@/components/ui/card";
import {
  llmKeyErrorMessage,
  useDeleteLlmKey,
  useLlmKeys,
  useSaveLlmKey,
  type LlmProvider,
  type StoredLlmKey,
} from "@/hooks/useLlmKeys";
import { useEntitlements } from "@/hooks/useSettings";
import { useThemeColors } from "@/lib/theme";
import { useToast } from "@/lib/toast";

const PROVIDERS: { id: LlmProvider; label: string; hint: string; placeholder: string }[] = [
  {
    id: "anthropic",
    label: "Anthropic",
    hint: "Powers Salli AI, statement reading, and the wealth advisor.",
    placeholder: "sk-ant-…",
  },
];

/**
 * Bring your own API key. Supplying one means the user pays their provider
 * directly, so Salli stops metering their AI usage.
 *
 * The key is write-only by design: it can be replaced or removed, never read
 * back. Only the last four characters are ever returned, which is enough to
 * recognise which key is stored without being able to reveal it.
 */
export function LlmKeysCard() {
  const colors = useThemeColors();
  const keys = useLlmKeys();
  const save = useSaveLlmKey();
  const remove = useDeleteLlmKey();
  const entitlements = useEntitlements();
  const showToast = useToast();

  const [editing, setEditing] = useState<LlmProvider | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState<LlmProvider | null>(null);

  const stored = (provider: LlmProvider): StoredLlmKey | undefined =>
    keys.data?.keys.find((k) => k.provider === provider);

  async function handleSave(provider: LlmProvider) {
    const key = draft.trim();
    if (!key || busy) return;
    setBusy(provider);
    try {
      await save.mutateAsync({ provider, key });
      setEditing(null);
      setDraft("");
      showToast("Key saved. Your AI usage is now unlimited.", "success");
    } catch (err) {
      // The provider's verdict, surfaced verbatim from the server's own wording:
      // "rejected" and "couldn't reach the provider" need different responses.
      showToast(llmKeyErrorMessage(err), "error");
    } finally {
      setBusy(null);
    }
  }

  async function handleRemove(provider: LlmProvider) {
    setBusy(provider);
    try {
      await remove.mutateAsync(provider);
      showToast("Key removed. Back to your plan's monthly allowance.", "success");
    } catch {
      showToast("Couldn't remove that key. Please try again shortly.", "error");
    } finally {
      setBusy(null);
    }
  }

  // Nothing to offer if the deployment can't store keys — hide rather than
  // showing a control that will fail.
  if (keys.data && !keys.data.available) return null;

  const byok = entitlements.data?.byok ?? false;

  return (
    <Card className="p-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <KeyRound size={17} color={colors.mutedForeground} strokeWidth={2} />
          <Text className="font-sans-semibold text-[16px] text-foreground">Use your own AI key</Text>
        </View>
        {byok ? (
          <View className="flex-row items-center gap-1.5 rounded-pill bg-salli-accent/15 px-2.5 py-1">
            <Check size={11} color={colors.accent} strokeWidth={3} />
            <Text className="text-[14px] font-sans-semibold text-salli-accent">Unlimited</Text>
          </View>
        ) : null}
      </View>

      <Text className="mt-1.5 text-[15px] leading-5 text-muted-foreground">
        Pay your provider directly and Salli stops counting your usage. Your key is encrypted,
        shown once, and removable any time.
      </Text>

      {keys.isLoading ? (
        <View className="items-center py-4">
          <ActivityIndicator size="small" color={colors.mutedForeground} />
        </View>
      ) : (
        <View className="mt-3 gap-2">
          {PROVIDERS.map((p) => {
            const existing = stored(p.id);
            const isEditing = editing === p.id;
            const isBusy = busy === p.id;

            return (
              <View key={p.id} className="rounded-card border border-foreground/10 p-3">
                <View className="flex-row items-center justify-between">
                  <Text className="font-sans-medium text-[15px] text-foreground">{p.label}</Text>
                  {existing && !isEditing ? (
                    <View className="flex-row items-center gap-2.5">
                      <Text className="font-mono text-[15px] text-muted-foreground">
                        ····{existing.last4}
                      </Text>
                      <Pressable onPress={() => handleRemove(p.id)} hitSlop={8} disabled={isBusy}>
                        {isBusy ? (
                          <ActivityIndicator size="small" color={colors.mutedForeground} />
                        ) : (
                          <Trash2 size={16} color="#EF4444" strokeWidth={2} />
                        )}
                      </Pressable>
                    </View>
                  ) : !isEditing ? (
                    <Pressable
                      onPress={() => {
                        setEditing(p.id);
                        setDraft("");
                      }}
                      hitSlop={8}
                    >
                      <Text className="text-[15px] font-sans-semibold text-salli-accent">Add</Text>
                    </Pressable>
                  ) : null}
                </View>

                <Text className="mt-0.5 text-[14px] leading-5 text-muted-foreground">{p.hint}</Text>

                {existing && !existing.readable ? (
                  <View className="mt-2 flex-row items-center gap-2 rounded-card bg-[#FEF3C7] px-3 py-2">
                    <TriangleAlert size={15} color="#B45309" strokeWidth={2} />
                    <Text className="flex-1 text-[14px] text-[#B45309]">
                      This key can no longer be read. Please add it again.
                    </Text>
                  </View>
                ) : null}

                {isEditing ? (
                  <View className="mt-2.5 gap-2">
                    <TextInput
                      value={draft}
                      onChangeText={setDraft}
                      placeholder={p.placeholder}
                      placeholderTextColor="rgba(128,128,128,0.4)"
                      autoCapitalize="none"
                      autoCorrect={false}
                      // The key is a credential: keep it off the screen and out
                      // of the keyboard's learned-word store.
                      secureTextEntry
                      className="rounded-card bg-muted px-3 py-2.5 font-mono text-[15px] text-foreground"
                    />
                    <View className="flex-row gap-2">
                      <Pressable
                        onPress={() => handleSave(p.id)}
                        disabled={!draft.trim() || isBusy}
                        className="h-9 flex-1 flex-row items-center justify-center rounded-card bg-salli-accent"
                        style={{ opacity: !draft.trim() || isBusy ? 0.5 : 1 }}
                      >
                        {isBusy ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text className="text-[15px] font-sans-semibold text-white">
                            Verify & save
                          </Text>
                        )}
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          setEditing(null);
                          setDraft("");
                        }}
                        className="h-9 items-center justify-center rounded-card border border-foreground/10 px-4"
                      >
                        <Text className="text-[15px] font-sans-medium text-foreground/50">
                          Cancel
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}
