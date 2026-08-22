import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Logo } from "@/components/Logo";
import { ModeChoiceStep } from "@/components/onboarding/ModeChoiceStep";
import { useIsTablet } from "@/lib/responsive";
import { useSalliStore } from "@/lib/store";

const TABLET_MAX_WIDTH = 480;

/** One-time prompt for users who onboarded before Buddy Mode shipped — the
 * fresh-signup version of this same question lives in the onboarding wizard's
 * final step (see app/onboarding.tsx). Framed as a starting point, not a
 * permanent choice, since the swipe always lets them change their mind. */
export default function ModeChoiceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const mode = useSalliStore((s) => s.mode);
  const setMode = useSalliStore((s) => s.setMode);
  const setModeChosen = useSalliStore((s) => s.setModeChosen);
  const [chosenMode, setChosenMode] = useState(mode);

  const handleContinue = () => {
    setMode(chosenMode);
    setModeChosen();
    router.replace("/");
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: Math.max(insets.top, 24) }}>
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{
          paddingBottom: insets.bottom + 24,
          width: "100%",
          maxWidth: isTablet ? TABLET_MAX_WIDTH : undefined,
          alignSelf: "center",
        }}
      >
        <View className="mb-6 items-center pt-4">
          <Logo size={32} className="text-foreground" />
          <Text className="mb-1.5 mt-3 text-center font-sans-bold text-[24px] tracking-tight text-foreground">
            Pick your starting point
          </Text>
          <Text className="text-center text-[13px] leading-5 text-foreground/40">
            We&apos;ve added a new way to use Salli.{"\n"}You can switch anytime.
          </Text>
        </View>

        <ModeChoiceStep
          value={chosenMode}
          onChange={setChosenMode}
          onContinue={handleContinue}
          continueLabel="Let's go"
        />
      </ScrollView>
    </View>
  );
}
