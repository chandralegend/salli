import { Check, ChevronRight, LayoutGrid, MessageCircle } from "lucide-react-native";
import type { ComponentType } from "react";
import { Pressable, Text, View } from "react-native";

import { ActionButton } from "@/components/ui/action-button";
import type { AppMode } from "@/lib/store";
import { useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

const MODE_OPTIONS: {
  value: AppMode;
  icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  title: string;
  detail: string;
}[] = [
  {
    value: "buddy",
    icon: MessageCircle,
    title: "Buddy Mode",
    detail: "A friendly chat that walks you through your money — just talk it through.",
  },
  {
    value: "pro",
    icon: LayoutGrid,
    title: "Pro Mode",
    detail: "The full toolkit — ledger, tax, budget, and more, all in one dashboard.",
  },
];

/** Shared between the onboarding wizard's final step and the standalone
 * one-time prompt shown to users who onboarded before Buddy Mode shipped.
 * Purely presentational — the caller owns `value`/`onChange` state and what
 * `onContinue` does (finish onboarding vs. just persist + redirect). */
export function ModeChoiceStep({
  value,
  onChange,
  onContinue,
  loading,
  continueLabel = "Continue",
}: {
  value: AppMode;
  onChange: (mode: AppMode) => void;
  onContinue: () => void;
  loading?: boolean;
  continueLabel?: string;
}) {
  const colors = useThemeColors();
  return (
    <View className="gap-2">
      {MODE_OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            className={cn(
              "flex-row items-center gap-3 rounded-card border p-4",
              active ? "border-salli-accent bg-card" : "border-foreground/[0.08] bg-card",
            )}
          >
            <View
              className={cn(
                "h-10 w-10 items-center justify-center rounded-card",
                active ? "bg-salli-accent" : "bg-foreground/[0.08]",
              )}
            >
              <opt.icon size={20} color={active ? "#FFFFFF" : colors.mutedForeground} strokeWidth={2} />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="font-sans-semibold text-[16px] text-foreground">{opt.title}</Text>
              <Text className="text-[14px] leading-5 text-foreground/35">{opt.detail}</Text>
            </View>
            <View
              className={cn(
                "h-[18px] w-[18px] items-center justify-center rounded-full border-2",
                active ? "border-salli-accent bg-salli-accent" : "border-foreground/20",
              )}
            >
              {active ? <Check size={11} color="#FFFFFF" strokeWidth={3} /> : null}
            </View>
          </Pressable>
        );
      })}

      <Text className="px-0.5 pt-1 text-[14px] leading-5 text-foreground/25">
        You can switch anytime — just swipe from either mode to jump to the other.
      </Text>

      <ActionButton className="mt-1" loading={loading} onPress={onContinue}>
        <Text className="font-sans-bold text-[17px] text-primary-foreground">{continueLabel}</Text>
        <ChevronRight size={15} color={colors.primaryForeground} strokeWidth={2.5} />
      </ActionButton>
    </View>
  );
}
