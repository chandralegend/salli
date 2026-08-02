import { ChevronRight, Wallet } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { AffordabilityDrawer } from "@/components/AffordabilityDrawer";
import { Card } from "@/components/ui/card";
import { useThemeColors } from "@/lib/theme";

/** Dashboard entry point for the pre-purchase decision surface — every figure
 * comes from the deterministic engine via /fi/simulate-purchase, nothing here
 * is computed client-side beyond opening the drawer. Styled as the same
 * icon-box + text + chevron row used everywhere else a row opens something
 * (More hub features, Monthly Budget card) so it reads as tappable, not a note. */
export function AffordabilityCard() {
  const colors = useThemeColors();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable onPress={() => setOpen(true)}>
        <Card className="mx-4 mb-3.5 flex-row items-center gap-3 p-3.5">
          <View className="h-9 w-9 items-center justify-center rounded-[10px] bg-salli-accent/15">
            <Wallet size={16} color={colors.accent} strokeWidth={2} />
          </View>
          <View className="flex-1">
            <Text className="text-[10px] font-sans-medium uppercase tracking-wide text-foreground/35">
              Can I afford this?
            </Text>
            <Text className="mt-0.5 text-[12px] text-foreground/50" numberOfLines={1}>
              Price a purchase against your Freedom date
            </Text>
          </View>
          <ChevronRight size={16} color={colors.mutedForeground} strokeWidth={2} />
        </Card>
      </Pressable>

      <AffordabilityDrawer visible={open} onClose={() => setOpen(false)} />
    </>
  );
}
