import * as Speech from "expo-speech";
import { useCallback, useEffect, useRef, useState } from "react";

import { type AssistantPart, useAgentChat } from "@/hooks/useAgentChat";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { API_URL } from "@/lib/api-client";
import { useSalliStore } from "@/lib/store";

export type VoiceState = "idle" | "listening" | "transcribing" | "thinking" | "speaking";

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

/** Uploads a recorded turn for transcription — bypasses the generated SDK the
 * same way statement/attachment uploads do (its body serializer expects a DOM
 * Blob/File; expo-audio's recording result is a {uri,name,type} object that
 * only React Native's native FormData/fetch handle correctly). */
async function transcribeVoiceMessage(fileUri: string): Promise<string> {
  const token = useSalliStore.getState().token;
  const form = new FormData();
  form.append("file", { uri: fileUri, name: "voice.m4a", type: "audio/m4a" } as unknown as Blob);

  const res = await fetch(`${API_URL}/agent/transcribe`, {
    method: "POST",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: form,
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new Error(typeof detail?.detail === "string" ? detail.detail : `Transcription failed (${res.status})`);
  }
  const data = (await res.json()) as { text: string };
  return data.text;
}

/**
 * Real push-to-talk Voice Mode: hold the orb to record, release to transcribe
 * and send through the same useAgentChat("buddy") pipeline the text Buddy
 * screen uses — identical tool activity, approval gate, and quota handling —
 * then speaks Salli's final reply aloud with on-device TTS.
 */
export function useVoiceSession() {
  const chat = useAgentChat({ persona: "buddy" });
  const recorder = useVoiceRecorder();
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
      setState((s) => (s === "listening" || s === "transcribing" ? s : "thinking"));
      return;
    }
    if (lastAssistant.id === spokenIdRef.current) return;
    spokenIdRef.current = lastAssistant.id;
    if (!liveText.trim()) {
      setState("idle");
      return;
    }
    setState("speaking");
    Speech.speak(liveText, {
      onDone: () => setState("idle"),
      onStopped: () => setState("idle"),
      onError: () => setState("idle"),
    });
  }, [lastAssistant, approval, liveText, chat.streaming]);

  useEffect(() => {
    if (chat.quotaBanner) setState("idle");
  }, [chat.quotaBanner]);

  const startListening = useCallback(async () => {
    if (state !== "idle") return;
    setError(null);
    try {
      await recorder.start();
      setState("listening");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't access the microphone.");
    }
  }, [recorder, state]);

  const stopAndSend = useCallback(async () => {
    if (state !== "listening") return;
    setState("transcribing");
    try {
      const uri = await recorder.stop();
      if (!uri) {
        setState("idle");
        return;
      }
      const text = await transcribeVoiceMessage(uri);
      if (!text.trim()) {
        setError("Didn't catch that — try again.");
        setState("idle");
        return;
      }
      chat.send(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't hear that — try again.");
      setState("idle");
    }
  }, [recorder, chat, state]);

  const stop = useCallback(() => {
    Speech.stop();
    recorder.cancel();
    setState("idle");
  }, [recorder]);

  return {
    state,
    error,
    liveText,
    approval,
    quotaBanner: chat.quotaBanner,
    startListening,
    stopAndSend,
    resolveApproval: chat.resolveApproval,
    stop,
  };
}
