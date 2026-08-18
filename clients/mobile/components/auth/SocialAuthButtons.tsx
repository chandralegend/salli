import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { isAppleAuthAvailable, signInWithApple, signInWithGoogle } from "@/lib/auth";

function GoogleIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Path
        fill="#FFFFFF"
        d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81"
      />
    </Svg>
  );
}

function AppleIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Path
        fill="#FFFFFF"
        d="M16.365 1.43c0 1.14-.393 2.033-1.18 2.68-.79.646-1.7.998-2.73.912-.13-1.09.36-2.11 1.14-2.79.79-.68 1.83-1.13 2.77-1.28v.478zm3.42 17.44c-.53 1.21-1.14 2.4-2.05 3.53-.9 1.12-1.98 2.25-3.36 2.28-1.35.02-1.78-.79-3.31-.79-1.53 0-2 .77-3.28.81-1.32.05-2.53-1.2-3.45-2.32-1.86-2.3-3.34-6.5-1.4-9.35 1.08-1.6 2.85-2.6 4.7-2.63 1.35-.03 2.62.9 3.44.9.82 0 2.37-1.11 4-.95.68.03 2.6.28 3.83 2.08-3.13 1.72-2.65 6.05.18 6.44z"
      />
    </Svg>
  );
}

/** Google (system-browser OAuth) + Apple (native, iOS-only) sign-in buttons,
 * shared between the login and signup screens. Apple only renders once
 * `isAppleAuthAvailable()` resolves true (iOS + signed into an Apple ID) —
 * Android/simulators-without-an-Apple-ID never show it. */
export function SocialAuthButtons({ onError }: { onError: (message: string) => void }) {
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [busyProvider, setBusyProvider] = useState<"google" | "apple" | null>(null);

  useEffect(() => {
    let cancelled = false;
    isAppleAuthAvailable().then((available) => {
      if (!cancelled) setAppleAvailable(available);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleGoogle() {
    if (busyProvider) return;
    setBusyProvider("google");
    try {
      await signInWithGoogle();
    } catch (e) {
      if (e instanceof Error && e.message !== "Google sign-in was cancelled.") {
        onError(e.message);
      }
    } finally {
      setBusyProvider(null);
    }
  }

  async function handleApple() {
    if (busyProvider) return;
    setBusyProvider("apple");
    try {
      await signInWithApple();
    } catch (e) {
      // ERR_REQUEST_CANCELED fires when the user dismisses Apple's sheet — not a real error.
      const code = (e as { code?: string } | null)?.code;
      if (code !== "ERR_REQUEST_CANCELED") {
        onError(e instanceof Error ? e.message : "Apple sign-in failed.");
      }
    } finally {
      setBusyProvider(null);
    }
  }

  return (
    <View className="gap-2.5">
      <Pressable
        onPress={handleGoogle}
        disabled={busyProvider !== null}
        className="h-[54px] flex-row items-center justify-center gap-2.5 rounded-[16px] border border-white/15 bg-white/[0.04]"
        style={{ opacity: busyProvider && busyProvider !== "google" ? 0.5 : 1 }}
      >
        {busyProvider === "google" ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <GoogleIcon />
            <Text className="font-sans-semibold text-[15px] text-white">Continue with Google</Text>
          </>
        )}
      </Pressable>

      {appleAvailable ? (
        <Pressable
          onPress={handleApple}
          disabled={busyProvider !== null}
          className="h-[54px] flex-row items-center justify-center gap-2.5 rounded-[16px] border border-white/15 bg-white/[0.04]"
          style={{ opacity: busyProvider && busyProvider !== "apple" ? 0.5 : 1 }}
        >
          {busyProvider === "apple" ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <AppleIcon />
              <Text className="font-sans-semibold text-[15px] text-white">Continue with Apple</Text>
            </>
          )}
        </Pressable>
      ) : null}

      <View className="my-1 flex-row items-center gap-3">
        <View className="h-px flex-1 bg-white/10" />
        <Text className="text-[12px] text-white/20">or</Text>
        <View className="h-px flex-1 bg-white/10" />
      </View>
    </View>
  );
}
