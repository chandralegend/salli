/**
 * Voice Mode — UI shell only (confirmed scope: no real mic/STT/TTS wiring).
 * Real-integration seam for later: mount useAgentChat({persona:"buddy"}) here,
 * drive thinking->speaking off its real `streaming` flag + token stream instead
 * of useVoiceMockSession's timers, and route any real approval_required event
 * into ApprovalGateCard, pausing the orb — the mock intentionally has no live
 * agent connection today, so there's nothing to gate yet.
 */
import { useRouter } from "expo-router";
import { Mic, MicOff, PhoneOff, Volume2 } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SalliBackground } from "@/components/ui/SalliBackground";
import { VoiceOrb } from "@/components/agent/VoiceOrb";
import { useVoiceMockSession } from "@/hooks/useVoiceMockSession";
import { useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

const STATE_LABEL = { listening: "Listening", thinking: "Thinking", speaking: "Speaking" };

function ControlButton({
  icon: Icon,
  label,
  active,
  danger,
  onPress,
}: {
  icon: typeof Mic;
  label: string;
  active?: boolean;
  danger?: boolean;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  return (
    <Pressable onPress={onPress} className="items-center gap-1.5" accessibilityRole="button" accessibilityLabel={label}>
      <View
        className={cn(
          "h-14 w-14 items-center justify-center rounded-full",
          danger ? "bg-salli-accent" : active ? "bg-foreground/20" : "bg-foreground/10",
        )}
      >
        <Icon size={22} color={danger ? "#FFFFFF" : colors.foreground} strokeWidth={2} />
      </View>
      <Text className="text-[11px] text-foreground/50">{label}</Text>
    </Pressable>
  );
}

export default function VoiceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { state, caption } = useVoiceMockSession();
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <SalliBackground intensity="strong" />

      <View className="items-center pt-2.5">
        <Text className="font-sans-semibold text-[15px] text-foreground">Buddy Mode</Text>
        <Text className="mt-0.5 text-[11px] font-sans-medium text-salli-accent">Voice mode</Text>
      </View>

      <View className="flex-1 items-center justify-center px-8">
        <VoiceOrb state={state} />
        <Text className="mt-8 font-sans-semibold text-[17px] text-foreground">
          {state === "listening" ? "Salli is listening" : `Salli is ${STATE_LABEL[state].toLowerCase()}`}
        </Text>
        {caption ? (
          <Text className="mt-3 text-center text-[13px] leading-5 text-foreground/35">{caption}</Text>
        ) : null}
      </View>

      <View className="flex-row justify-center gap-8 pb-2" style={{ paddingBottom: insets.bottom + 24 }}>
        <ControlButton
          icon={muted ? MicOff : Mic}
          label="Mute"
          active={muted}
          onPress={() => setMuted((m) => !m)}
        />
        <ControlButton icon={PhoneOff} label="End" danger onPress={() => router.back()} />
        <ControlButton
          icon={Volume2}
          label="Speaker"
          active={speakerOn}
          onPress={() => setSpeakerOn((s) => !s)}
        />
      </View>
    </View>
  );
}
