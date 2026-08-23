import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from "expo-audio";
import { useCallback, useEffect, useRef } from "react";

/** Mono, not HIGH_QUALITY's default stereo — speech doesn't need 2 channels
 * and it halves the upload size. Some iOS Simulators only expose a single
 * input channel and reject a stereo request outright, though testing showed
 * this alone doesn't explain every "Failed to prepare recorder" seen on the
 * Simulator — that likely also needs the host Mac to grant Simulator.app
 * microphone access at the macOS level, a separate permission from the
 * in-app prompt. Still a correct, harmless change either way. */
const VOICE_RECORDING_OPTIONS = { ...RecordingPresets.HIGH_QUALITY, numberOfChannels: 1 };

/**
 * Push-to-talk recording for Voice Mode: hold to record, release to get a
 * local file URI ready to upload for transcription. Wraps expo-audio, which
 * ships in Expo Go — no custom dev client needed for this feature.
 */
export function useVoiceRecorder() {
  const recorder = useAudioRecorder(VOICE_RECORDING_OPTIONS);
  const recordingRef = useRef(false);

  // Ask for mic permission as soon as Voice Mode opens, not on the first
  // press — the OS permission dialog needs the user's finger to leave the
  // screen to tap Allow, which would otherwise cut short the very
  // press-and-hold gesture it's blocking.
  useEffect(() => {
    AudioModule.requestRecordingPermissionsAsync().catch(() => {});
  }, []);

  const start = useCallback(async () => {
    const { granted } = await AudioModule.requestRecordingPermissionsAsync();
    if (!granted) {
      throw new Error("Microphone access is off — enable it in Settings to use Voice Mode.");
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    recordingRef.current = true;
  }, [recorder]);

  /** Stops the recording and returns its local file URI, or null if nothing was recording. */
  const stop = useCallback(async (): Promise<string | null> => {
    if (!recordingRef.current) return null;
    recordingRef.current = false;
    await recorder.stop();
    return recorder.uri;
  }, [recorder]);

  /** Discards an in-progress recording without returning a URI (e.g. on End/cancel). */
  const cancel = useCallback(() => {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    recorder.stop().catch(() => {});
  }, [recorder]);

  return { start, stop, cancel };
}
