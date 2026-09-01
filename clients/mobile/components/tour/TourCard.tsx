import { X } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PillButton } from "@/components/ui/pill-button";
import type { TourStep } from "@/lib/tour/steps";
import { useThemeColors } from "@/lib/theme";

/**
 * Step card — deliberately not anchored right next to the target, since web's
 * own tour build found anchored cards needed a pinned-edge fallback on small
 * screens anyway. Pinned to whichever edge (top/bottom) the overlay says is
 * clear of the spotlight, so the card never sits on top of — or behind — the
 * very thing it's pointing at (the tab-bar targets near the bottom being the
 * obvious case: a bottom-pinned card would otherwise cover them entirely).
 */
export function TourCard({
  step,
  index,
  total,
  placement,
  onNext,
  onPrev,
  onSkip,
}: {
  step: TourStep;
  index: number;
  total: number;
  placement: "top" | "bottom";
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="absolute inset-x-3 rounded-[14px] border border-foreground/10 bg-card p-4"
      style={placement === "top" ? { top: insets.top + 12 } : { bottom: insets.bottom + 12 }}
    >
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-[13px] font-sans-medium uppercase tracking-wide text-foreground/30">
          {index + 1} of {total}
        </Text>
        <Pressable onPress={onSkip} hitSlop={8} className="h-[26px] w-[26px] items-center justify-center rounded-full bg-foreground/[0.08]">
          <X size={15} color={colors.mutedForeground} strokeWidth={2} />
        </Pressable>
      </View>

      <Text className="font-sans-bold text-[18px] text-foreground">{step.title}</Text>
      <Text className="mt-1.5 text-[15px] leading-5 text-foreground/50">{step.body}</Text>

      <View className="mt-3.5 flex-row gap-2">
        {index > 0 ? (
          <PillButton variant="secondary" className="h-[42px] flex-1" onPress={onPrev}>
            <Text className="font-sans-semibold text-[16px] text-foreground">Back</Text>
          </PillButton>
        ) : null}
        <PillButton variant="accent" className="h-[42px] flex-1" onPress={onNext}>
          <Text className="font-sans-semibold text-[16px] text-white">{index === total - 1 ? "Done" : "Next"}</Text>
        </PillButton>
      </View>
    </View>
  );
}
