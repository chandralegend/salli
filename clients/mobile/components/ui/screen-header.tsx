import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { AnimatedPressable } from "./animated-pressable";
import { useThemeColors } from "../../lib/theme";

type ScreenHeaderProps = {
  title: string;
  back?: boolean;
  trailing?: ReactNode;
  large?: boolean; // 22px "Ledger"/"Statements" title vs 20px sub-page title with back button
};

/** The mockup's recurring header row: optional circular back button, title,
 * optional trailing action(s) — used on Tax, New Entry, Ledger, Statements, etc. */
export function ScreenHeader({ title, back, trailing, large }: ScreenHeaderProps) {
  const router = useRouter();
  const colors = useThemeColors();

  return (
    <View className="flex-row items-center gap-3 px-5 pt-2.5">
      {back ? (
        <AnimatedPressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          className="h-9 w-9 items-center justify-center rounded-full bg-foreground/[0.08]"
        >
          <ChevronLeft size={16} color={colors.foreground} strokeWidth={2} />
        </AnimatedPressable>
      ) : null}
      <Text
        className={`flex-1 font-sans-bold text-foreground ${large ? "text-[22px]" : "text-[20px]"}`}
      >
        {title}
      </Text>
      {trailing}
    </View>
  );
}
