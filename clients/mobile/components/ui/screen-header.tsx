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
          className="h-11 w-11 items-center justify-center rounded-[11px] border-2 border-foreground bg-card"
        >
          <ChevronLeft size={21} color={colors.foreground} strokeWidth={2} />
        </AnimatedPressable>
      ) : null}
      <Text
        // .apphead .title — 27px/800 at -0.03em. `large` keeps a slightly
        // bigger variant for top-level screens.
        style={{ letterSpacing: -0.8 }}
        className={`flex-1 font-sans-extrabold text-foreground ${large ? "text-[29px]" : "text-[27px]"}`}
      >
        {title}
      </Text>
      {trailing}
    </View>
  );
}
