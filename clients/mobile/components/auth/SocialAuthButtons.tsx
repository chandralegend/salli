import * as AppleAuthentication from "expo-apple-authentication";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { isAppleAuthAvailable, signInWithApple, signInWithGoogle } from "@/lib/auth";
import { useThemeColors, useThemeMode } from "@/lib/theme";

/** Official 4-color Google "G" mark — Google's brand guidelines for a custom
 * "Sign in with Google" button (there's no first-party RN component) require
 * this exact multi-color logo, not a single-tone approximation. */
function GoogleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48">
      <Path
        fill="#FFC107"
        d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12 c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24 c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
      />
      <Path
        fill="#FF3D00"
        d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039 l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
      />
      <Path
        fill="#4CAF50"
        d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36 c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
      />
      <Path
        fill="#1976D2"
        d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571 c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
      />
    </Svg>
  );
}

/** Google (system-browser OAuth) + Apple (native, iOS-only) sign-in buttons,
 * shared between the login and signup screens.
 *
 * Apple's button is Apple's own native `AppleAuthenticationButton` component,
 * not a custom one — the App Store Guidelines require using it verbatim
 * (fixed text/logo/color options only) rather than a look-alike, and it only
 * renders once `isAppleAuthAvailable()` resolves true (iOS + signed into an
 * Apple ID), so it never shows on Android. It's rendered first, above
 * Google — Guideline 4.8 requires Sign in with Apple to have equal-or-greater
 * prominence than any other third-party login offered, and both buttons are
 * otherwise the same size/weight, so order is what actually differentiates
 * prominence here.
 *
 * Google has no equivalent first-party React Native button, so this follows
 * Google's own branding guidelines for a custom button instead: the exact
 * 4-color "G" mark, "Continue with Google" wording, and a light/outlined
 * button matching Google's documented light-theme spec. */
export function SocialAuthButtons({ onError }: { onError: (message: string) => void }) {
  const colors = useThemeColors();
  const { isDark } = useThemeMode();
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
      {appleAvailable ? (
        <View
          pointerEvents={busyProvider ? "none" : "auto"}
          style={{
            height: 54,
            position: "relative",
            opacity: busyProvider && busyProvider !== "apple" ? 0.5 : 1,
          }}
        >
          {/* Theme-aware, per Apple's own guidance: BLACK on a light
              background, WHITE on a dark one. It used to be hard-coded WHITE,
              which was visible only because the canvas was warm cream — on the
              plain white canvas a white button disappears completely, taking
              the primary sign-in route with it. */}
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={
              isDark
                ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={16}
            style={{ height: 54, width: "100%" }}
            onPress={handleApple}
          />
          {busyProvider === "apple" ? (
            <View
              pointerEvents="none"
              className="absolute inset-0 items-center justify-center rounded-[16px]"
              style={{ backgroundColor: isDark ? "#FFFFFF" : "#000000" }}
            >
              <ActivityIndicator color={isDark ? "#000000" : "#FFFFFF"} />
            </View>
          ) : null}
        </View>
      ) : null}

      <Pressable
        onPress={handleGoogle}
        disabled={busyProvider !== null}
        className="h-[54px] flex-row items-center justify-center gap-2.5 rounded-[10px] border border-foreground/15 bg-foreground/[0.04]"
        style={{ opacity: busyProvider && busyProvider !== "google" ? 0.5 : 1 }}
      >
        {busyProvider === "google" ? (
          <ActivityIndicator color={colors.foreground} />
        ) : (
          <>
            <GoogleIcon />
            <Text className="font-sans-semibold text-[17px] text-foreground">Continue with Google</Text>
          </>
        )}
      </Pressable>

      <View className="my-1 flex-row items-center gap-3">
        <View className="h-px flex-1 bg-foreground/10" />
        <Text className="text-[15px] text-foreground/20">or</Text>
        <View className="h-px flex-1 bg-foreground/10" />
      </View>
    </View>
  );
}
