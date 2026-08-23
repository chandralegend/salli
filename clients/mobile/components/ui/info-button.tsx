import { Info } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Drawer } from "@/components/ui/drawer";
import { useThemeColors } from "@/lib/theme";

/**
 * A tappable "what is this?" affordance that explains one metric.
 *
 * These used to be bare `<Info>` icons — they looked like buttons and did
 * nothing, which is worse than not having them: it reads as a broken control
 * rather than a decoration. Anything shaped like a button now behaves like one.
 *
 * `onDark` is for the always-dark hero cards (the Freedom Number panel), where
 * the themed muted-foreground would nearly vanish against the navy.
 */
export function InfoButton({
  title,
  description,
  size = 13,
  onDark = false,
}: {
  title: string;
  description: string;
  size?: number;
  onDark?: boolean;
}) {
  const colors = useThemeColors();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        // Generous hitSlop: the icon itself is 11-18px, well under the ~44px
        // minimum comfortable touch target.
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={`What is ${title}?`}
      >
        <Info
          size={size}
          color={onDark ? "rgba(255,255,255,0.45)" : colors.mutedForeground}
          strokeWidth={2}
        />
      </Pressable>

      <Drawer visible={open} onClose={() => setOpen(false)} title={title} keyboardAvoiding={false}>
        <View className="pb-2">
          <Text className="text-[14px] leading-[22px] text-foreground/70">{description}</Text>
        </View>
      </Drawer>
    </>
  );
}
