import { Check, Sparkles } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { Card } from "@/components/ui/card";
import { useAiModels, useSetAiModel } from "@/hooks/useSettings";
import { cn } from "@/lib/utils";
import { useThemeColors } from "@/lib/theme";
import { useToast } from "@/lib/toast";

/**
 * Which model Salli's conversations run on.
 *
 * Every model is available on every plan. The tier decides how many credits you
 * get, not which models you may spend them on — so this card never gates, it
 * only prices. That is what makes offering the choice safe at all: a user on
 * Opus spends five times faster and reaches the same ceiling.
 *
 * Shows the per-conversation cost rather than the raw multiplier, because "50
 * credits a conversation" is a number someone can hold against their balance
 * and "x5" is not.
 */
export function ModelPickerCard() {
  const colors = useThemeColors();
  const models = useAiModels();
  const setModel = useSetAiModel();
  const showToast = useToast();

  const selected = models.data?.selected;

  async function choose(id: string) {
    if (id === selected || setModel.isPending) return;
    try {
      await setModel.mutateAsync(id);
    } catch {
      showToast("Couldn't change the model. Please try again.");
    }
  }

  if (!models.data) return null;

  return (
    <Card className="p-4">
      <View className="mb-1 flex-row items-center gap-2">
        <Sparkles size={18} color={colors.mutedForeground} />
        <Text className="font-sans-semibold text-[17px] text-foreground">AI model</Text>
      </View>
      <Text className="mb-3 text-[15px] leading-[22px] text-muted-foreground">
        Every model is available on every plan — the only difference is how many credits a
        conversation costs. Statement reading always runs on Haiku at the lowest rate, whichever
        model you pick here.
      </Text>

      <View className="gap-2">
        {models.data.models.map((m) => {
          const active = m.id === selected;
          return (
            <Pressable
              key={m.id}
              onPress={() => choose(m.id)}
              disabled={setModel.isPending}
              className={cn(
                "rounded-control border p-3",
                active ? "border-salli-accent bg-salli-accent/10" : "border-foreground/10",
              )}
            >
              <View className="flex-row items-center justify-between">
                <Text className="font-sans-medium text-[16px] text-foreground">{m.name}</Text>
                {active ? <Check size={16} color={colors.accent} /> : null}
              </View>
              <Text className="mt-0.5 text-[14px] leading-[20px] text-muted-foreground">
                {m.blurb}
              </Text>
              <Text className="mt-1.5 text-[14px] text-muted-foreground">
                {m.credits_per_message} credits / conversation
                {m.is_default ? " · default" : ""}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}
