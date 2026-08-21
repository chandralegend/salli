import { useEffect, useRef, useState } from "react";

export type VoiceState = "listening" | "thinking" | "speaking";

const LISTENING_CAPTIONS = [
  "You mentioned you want more control over your spending...",
  "Tell me what's on your mind whenever you're ready.",
];
const SPEAKING_CAPTIONS = [
  "Let's take a look at that together.",
  "Here's what I'm seeing in your accounts.",
];

const DURATIONS: Record<VoiceState, number> = { listening: 4000, thinking: 1800, speaking: 3200 };
const NEXT: Record<VoiceState, VoiceState> = { listening: "thinking", thinking: "speaking", speaking: "listening" };

/**
 * Local idle->listening->thinking->speaking->listening state machine for the
 * Voice Mode UI shell — no real mic/STT/TTS, just setTimeout chains and a few
 * canned captions cycled per state. Real-integration seam: once wired up, this
 * hook's timers get replaced by useAgentChat's real `streaming` flag and token
 * stream (see app/(buddy)/voice.tsx's header comment).
 */
export function useVoiceMockSession() {
  const [state, setState] = useState<VoiceState>("listening");
  const [caption, setCaption] = useState(LISTENING_CAPTIONS[0]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timer.current = setTimeout(() => {
      const next = NEXT[state];
      setState(next);
      if (next === "listening") {
        setCaption(LISTENING_CAPTIONS[Math.floor(Math.random() * LISTENING_CAPTIONS.length)]);
      } else if (next === "speaking") {
        setCaption(SPEAKING_CAPTIONS[Math.floor(Math.random() * SPEAKING_CAPTIONS.length)]);
      } else {
        setCaption("");
      }
    }, DURATIONS[state]);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [state]);

  return { state, caption };
}
