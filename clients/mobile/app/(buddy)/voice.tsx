import { useRouter } from "expo-router";
import { setAudioModeAsync } from "expo-audio";
import { Mic, MicOff, PhoneOff, Volume2 } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ApprovalGateCard } from "@/components/agent/ApprovalGateCard";
import { SalliBackground } from "@/components/ui/SalliBackground";
import { VoiceOrb } from "@/components/agent/VoiceOrb";
import { useVoiceSession } from "@/hooks/useVoiceSession";
import { useIsTablet } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

const STATE_LABEL: Record<string, string> = {
  idle: "Hold to talk",
  listening: "Listening…",
  transcribing: "Transcribing…",
  thinking: "Salli is thinking",
  speaking: "Salli is speaking",
};

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
  const isTablet = useIsTablet();
  const {
    state,
    error,
    liveText,
    approval,
    quotaBanner,
    startListening,
    stopAndSend,
    resolveApproval,
    stop,
  } = useVoiceSession();
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldRouteThroughEarpiece: !speakerOn }).catch(() => {});
  }, [speakerOn]);

  const handlePressIn = () => {
    if (muted || approval) return;
    startListening();
  };

  const handleEnd = () => {
    stop();
    router.back();
  };

  const caption = error ?? quotaBanner ?? (state === "thinking" || state === "speaking" ? liveText : "");

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <SalliBackground intensity="strong" />

      <View className="items-center pt-2.5">
        <Text className="font-sans-semibold text-[15px] text-foreground">Buddy Mode</Text>
        <Text className="mt-0.5 text-[11px] font-sans-medium text-salli-accent">Voice mode</Text>
      </View>

      <View className="flex-1 items-center justify-center px-8">
        {approval ? (
          <View style={{ width: "100%", maxWidth: isTablet ? 480 : undefined }}>
            <ApprovalGateCard action={approval.action} resolved={approval.resolved} onResolve={resolveApproval} />
          </View>
        ) : (
          <>
            <Pressable
              onPressIn={handlePressIn}
              onPressOut={stopAndSend}
              disabled={state !== "idle" && state !== "listening"}
              accessibilityRole="button"
              accessibilityLabel="Hold to talk to Salli"
            >
              <VoiceOrb state={state} />
            </Pressable>
            <Text className="mt-8 font-sans-semibold text-[17px] text-foreground">
              {muted && state === "idle" ? "Mic is muted" : STATE_LABEL[state]}
            </Text>
            {caption ? (
              <Text
                className={cn(
                  "mt-3 text-center text-[13px] leading-5",
                  error || quotaBanner ? "text-destructive" : "text-foreground/35",
                )}
                style={{ maxWidth: isTablet ? 420 : undefined }}
              >
                {caption}
              </Text>
            ) : null}
          </>
        )}
      </View>

      <View className="flex-row justify-center gap-8 pb-2" style={{ paddingBottom: insets.bottom + 24 }}>
        <ControlButton
          icon={muted ? MicOff : Mic}
          label="Mute"
          active={muted}
          onPress={() => setMuted((m) => !m)}
        />
        <ControlButton icon={PhoneOff} label="End" danger onPress={handleEnd} />
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
