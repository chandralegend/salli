import * as Speech from "expo-speech";
import { useCallback, useEffect, useRef, useState } from "react";

import { type AssistantPart, useAgentChat } from "@/hooks/useAgentChat";
import { digitsAreAmbiguous, useOnDeviceSpeech } from "@/hooks/useOnDeviceSpeech";
import { speakable } from "@/lib/speakable";

// `transcribing` is gone: recognition happens on the phone as you speak, so
// there is no upload to wait on and no round trip to show a state for.
export type VoiceState = "idle" | "listening" | "thinking" | "speaking";

type ApprovalPart = Extract<AssistantPart, { kind: "approval" }>;

function assistantText(parts: AssistantPart[]): string {
  return parts
    .filter((p): p is Extract<AssistantPart, { kind: "text" }> => p.kind === "text")
    .map((p) => p.content)
    .join("");
}

function pendingApproval(parts: AssistantPart[]): ApprovalPart | undefined {
  return parts.find((p): p is ApprovalPart => p.kind === "approval" && !p.resolved);
}

/**
 * Push-to-talk Voice Mode, entirely on the device.
 *
 * Hold the orb to speak — recognition runs locally and streams a live
 * transcript — release to send it through the same `useAgentChat("buddy")`
 * pipeline the text Buddy screen uses, so tool activity, the approval gate and
 * quota handling are identical. Salli's reply is spoken back with on-device
 * TTS. No API key and no network are involved in either direction.
 */
export function useVoiceSession() {
  const chat = useAgentChat({ persona: "buddy" });
  const speech = useOnDeviceSpeech();
  const [state, setState] = useState<VoiceState>("idle");
  const [error, setError] = useState<string | null>(null);
  const spokenIdRef = useRef<string | null>(null);

  const lastMessage = chat.messages[chat.messages.length - 1];
  const lastAssistant = lastMessage?.role === "assistant" ? lastMessage : null;
  const approval = lastAssistant ? pendingApproval(lastAssistant.parts) : undefined;
  const liveText = lastAssistant ? assistantText(lastAssistant.parts) : "";

  // Drive thinking -> speaking off the real chat stream, not a timer: once a
  // turn finishes with no pending approval, speak the final reply exactly
  // once per message. A pending approval holds here — voice never talks over
  // an unconfirmed write; the ApprovalGateCard is what the user acts on.
  useEffect(() => {
    if (!lastAssistant || approval) return;
    if (chat.streaming) {
      setState((s) => (s === "listening" ? s : "thinking"));
      return;
    }
    if (lastAssistant.id === spokenIdRef.current) return;
    spokenIdRef.current = lastAssistant.id;
    if (!liveText.trim()) {
      setState("idle");
      return;
    }
    setState("speaking");
    // `speak` queues rather than interrupts, so anything still playing would be
    // followed by this rather than replaced.
    Speech.stop();
    Speech.speak(speakable(liveText), {
      // en-IN matches the recognition locale and reads Sri Lankan names and
      // "rupees" far more naturally than the US default.
      language: "en-IN",
      // The platform default is brisk for financial figures.
      rate: 0.95,
      onDone: () => setState("idle"),
      onStopped: () => setState("idle"),
      onError: () => setState("idle"),
    });
  }, [lastAssistant, approval, liveText, chat.streaming]);

  useEffect(() => {
    if (chat.quotaBanner) setState("idle");
  }, [chat.quotaBanner]);

  // Recognition failures (no model, permission revoked) surface through the
  // same caption as everything else.
  useEffect(() => {
    if (speech.error) {
      setError(speech.error);
      setState("idle");
    }
  }, [speech.error]);

  const startListening = useCallback(async () => {
    if (state !== "idle") return;
    setError(null);
    // Speaking and listening at once would feed Salli's own voice back into the
    // recognizer.
    Speech.stop();
    const started = await speech.start();
    if (started) setState("listening");
  }, [speech, state]);

  const stopAndSend = useCallback(() => {
    if (state !== "listening") return;
    const { text, alternatives } = speech.stop();

    if (!text) {
      setError("Didn't catch that — try again.");
      setState("idle");
      return;
    }

    // Entries are immutable and corrections need a reversing entry, so a
    // misheard amount is permanent. When the rival readings disagree on the
    // digits, say so rather than sending the first guess — the user can repeat
    // it in a second and that is far cheaper than reversing a wrong entry.
    if (digitsAreAmbiguous(alternatives)) {
      setError("Didn't catch the amount clearly — say that once more?");
      setState("idle");
      return;
    }

    chat.send(text);
  }, [speech, chat, state]);

  const stop = useCallback(() => {
    Speech.stop();
    speech.cancel();
    setState("idle");
  }, [speech]);

  return {
    state,
    error,
    /** What Salli is saying — drives the caption while speaking. */
    liveText,
    /** What the user is saying, live, while the orb is held. */
    heardText: speech.transcript,
    /** Real 0..1 microphone level while listening — drives the orb. */
    level: speech.level,
    approval,
    quotaBanner: chat.quotaBanner,
    startListening,
    stopAndSend,
    resolveApproval: chat.resolveApproval,
    stop,
  };
}
