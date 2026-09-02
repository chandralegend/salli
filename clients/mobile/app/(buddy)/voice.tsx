import { useRouter } from "expo-router";
import { setAudioModeAsync } from "expo-audio";
import { Mic, MicOff, PhoneOff, Volume2 } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ApprovalGateCard } from "@/components/agent/ApprovalGateCard";
import { Bloub } from "@/components/agent/Bloub";
import type { BloubMood } from "@/components/agent/bloub-geometry";
import { useVoiceSession } from "@/hooks/useVoiceSession";
import { useIsTablet } from "@/lib/responsive";
import { useHardShadow, useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

// No "Transcribing…" any more — recognition happens on the phone while you
// speak, so there is nothing to wait for after releasing.
const STATE_LABEL: Record<string, string> = {
  idle: "Hold to talk",
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
};

/**
 * The same face as the chat, reading the voice session instead of the
 * conversation. Voice has its own four states and they map cleanly:
 * attentive while it is hearing you, curious while it works out an answer,
 * excited while it talks back.
 */
const STATE_MOOD: Record<string, BloubMood> = {
  idle: "neutral",
  listening: "attentive",
  thinking: "curious",
  speaking: "excited",
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
  const shadow = useHardShadow();
  return (
    <Pressable onPress={onPress} className="items-center gap-2" accessibilityRole="button" accessibilityLabel={label}>
      <View
        className={cn(
          "h-[60px] w-[60px] items-center justify-center rounded-full border-2 border-foreground",
          danger ? "bg-salli-accent" : active ? "bg-muted" : "bg-card",
        )}
        style={shadow}
      >
        <Icon size={24} color={danger ? "#FFFFFF" : colors.foreground} strokeWidth={2} />
      </View>
      <Text className="text-[13.5px] text-muted-foreground">{label}</Text>
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
    heardText,
    approval,
    quotaBanner,
    startListening,
    stopAndSend,
    resolveApproval,
    stop,
    level,
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

  // While listening, show what the phone is actually hearing. On-device
  // recognition streams a transcript as you speak, which the old upload-then-
  // transcribe flow could never do — and seeing a wrong word land is what lets
  // someone stop and repeat before it reaches an entry.
  const caption =
    error ??
    quotaBanner ??
    (state === "listening"
      ? heardText
      : state === "thinking" || state === "speaking"
        ? liveText
        : "");

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>


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
              {/* The same face as the chat, not a separate orb. Two different
                  abstract shapes for one assistant was one too many, and the
                  face already has a vocabulary for exactly these states. The
                  live mic level drives its scale, so it swells with your voice
                  rather than on a synthetic loop. */}
              <Bloub
                mood={error || quotaBanner ? "surprised" : STATE_MOOD[state]}
                size={isTablet ? 232 : 196}
                amplitude={state === "listening" ? level : undefined}
              />
            </Pressable>
            <Text className="mt-8 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
              {muted && state === "idle" ? "Mic is muted" : STATE_LABEL[state]}
            </Text>
            {caption ? (
              <Text
                className={cn(
                  "mt-3.5 text-center text-[19px] leading-[26px]",
                  error || quotaBanner ? "text-destructive" : "text-foreground",
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
