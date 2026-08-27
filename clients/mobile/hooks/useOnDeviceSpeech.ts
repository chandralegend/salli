import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

import { useAccounts } from "@/hooks/useLedger";
import { useTags } from "@/hooks/useTags";

/**
 * Speech-to-text that runs on the phone.
 *
 * Replaces a record → upload → OpenAI Whisper round trip. That path never
 * worked in production: there is no platform `OPENAI_API_KEY` and no user has a
 * BYOK one, so `/agent/transcribe` returned 503 to everyone. This needs no key,
 * no network, and produces text as you speak rather than after you stop.
 *
 * `en-IN` rather than `en-US` deliberately — it is trained on South Asian
 * phonology, so "rupees", "lakh" and local names fare much better.
 */

/** Recognised words the generic language model is most likely to get wrong. */
const DOMAIN_VOCABULARY = [
  "rupees",
  "LKR",
  "lakh",
  "lakhs",
  "APIT",
  "AIT",
  "VAT",
  "IRD",
  "Salli",
];

export type SpeechStatus = "idle" | "listening";

export function useOnDeviceSpeech() {
  const accounts = useAccounts();
  const categoryTags = useTags("category");

  const [status, setStatus] = useState<SpeechStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  // 0..1 microphone level, for anything that wants to visualise the input.
  const [level, setLevel] = useState(0);

  // The final transcript is read by whoever calls stop(), which happens in the
  // same tick as the last `result` event — state would still be stale there.
  const finalRef = useRef("");
  // Alternatives from the last result, used to spot a digit disagreement before
  // a misheard amount reaches an immutable journal entry.
  const alternativesRef = useRef<string[]>([]);

  useSpeechRecognitionEvent("result", (event) => {
    const results = event.results ?? [];
    const best = results[0]?.transcript ?? "";
    finalRef.current = best;
    alternativesRef.current = results.map((r) => r.transcript);
    setTranscript(best);
  });

  useSpeechRecognitionEvent("error", (event) => {
    // `no-speech` is the user releasing without saying anything — a normal
    // outcome, not something worth showing as a failure.
    if (event.error === "no-speech") {
      setStatus("idle");
      return;
    }
    setError(errorMessage(event.error));
    setStatus("idle");
  });

  // The library reports −2..10, where anything below 0 is inaudible. Map that
  // onto 0..1 so consumers never have to know the native scale.
  useSpeechRecognitionEvent("volumechange", (event) => {
    setLevel(Math.max(0, Math.min(1, event.value / 10)));
  });

  useSpeechRecognitionEvent("end", () => {
    setStatus("idle");
    setLevel(0);
  });

  // Ask for the microphone as soon as Voice Mode opens, not on the first press.
  // The OS dialog needs the user's finger to leave the screen to tap Allow,
  // which would otherwise cut short the very press-and-hold gesture it is
  // blocking. Carried over from the recorder this replaced.
  useEffect(() => {
    ExpoSpeechRecognitionModule.requestMicrophonePermissionsAsync().catch(() => {});
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setTranscript("");
    finalRef.current = "";
    alternativesRef.current = [];

    // Catches the "Recognizer is unavailable" case (open library issue #145 on
    // iOS 26.x) with a message a user can act on, instead of a silent no-op.
    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
      setError("Speech recognition isn't available on this device.");
      return false;
    }

    // Only iOS is reliably on-device. Android's is API 33+ and depends on the
    // OEM's recognizer plus a downloaded model, so asking for it where it is
    // absent fails outright — better to let the platform choose there.
    const onDevice =
      Platform.OS === "ios" && ExpoSpeechRecognitionModule.supportsOnDeviceRecognition();

    // On-device recognition needs only the microphone. Anything else routes
    // audio through the platform's speech service, which additionally requires
    // the speech-recognition grant — asking for just the mic there fails at
    // `start()` with a permission error that looks like a microphone problem
    // and is not one.
    const permission = onDevice
      ? await ExpoSpeechRecognitionModule.requestMicrophonePermissionsAsync()
      : await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      setError(
        onDevice
          ? "Microphone access is off — enable it in Settings to use Voice Mode."
          : "Salli needs microphone and speech recognition access — enable them in Settings.",
      );
      return false;
    }

    ExpoSpeechRecognitionModule.start({
      lang: "en-IN",
      interimResults: true,
      continuous: true,
      // Alternatives are what make the digit-ambiguity check possible.
      maxAlternatives: 5,
      requiresOnDeviceRecognition: onDevice,
      addsPunctuation: true,
      iosTaskHint: "dictation",
      // Drives the orb's listening animation from the real microphone rather
      // than a synthetic loop. 100ms is the platform default and is plenty for
      // a breathing animation.
      volumeChangeEventOptions: { enabled: true, intervalMillis: 100 },
      // The single biggest accuracy lever, and it costs nothing: the user's own
      // account and category names are exactly the words a generic model gets
      // wrong, and the app already has them.
      contextualStrings: [
        ...DOMAIN_VOCABULARY,
        ...(accounts.data ?? []).map((a) => a.name),
        ...(categoryTags.data ?? []).map((t) => t.name),
      ].slice(0, 100),
    });

    setStatus("listening");
    return true;
  }, [accounts.data, categoryTags.data]);

  /** Stops listening and returns what was heard, plus any rival readings. */
  const stop = useCallback(() => {
    ExpoSpeechRecognitionModule.stop();
    setStatus("idle");
    setLevel(0);
    return { text: finalRef.current.trim(), alternatives: alternativesRef.current };
  }, []);

  const cancel = useCallback(() => {
    ExpoSpeechRecognitionModule.abort();
    finalRef.current = "";
    alternativesRef.current = [];
    setTranscript("");
    setLevel(0);
    setStatus("idle");
  }, []);

  return { status, transcript, error, level, start, stop, cancel };
}

/**
 * Whether the alternative readings disagree about the *numbers*.
 *
 * Entries are immutable and corrections need a reversing entry, so a misheard
 * "45,000" for "4,500" is permanent. Wording differences between alternatives
 * are harmless; digits are not.
 */
export function digitsAreAmbiguous(alternatives: string[]): boolean {
  const digitsOf = (s: string) => (s.match(/\d/g) ?? []).join("");
  const readings = new Set(alternatives.map(digitsOf).filter((d) => d.length > 0));
  return readings.size > 1;
}

function errorMessage(code: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access is off — enable it in Settings to use Voice Mode.";
    case "network":
      return "That needed a network connection and couldn't reach it.";
    case "audio-capture":
      return "Couldn't reach the microphone.";
    case "language-not-supported":
      return "This device doesn't have an English speech model available.";
    default:
      return "Couldn't hear that — try again.";
  }
}
