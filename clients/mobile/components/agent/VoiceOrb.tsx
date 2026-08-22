import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

import type { VoiceState } from "@/hooks/useVoiceSession";
import { useIsTablet } from "@/lib/responsive";

const SIZE = 220;
const SIZE_TABLET = 300;

/** Listening/thinking/speaking each get a distinct motion character; Reduce
 * Motion swaps all of it for a plain, instant opacity state instead of
 * continuous scale animation. Built with RN core Animated (react-native-svg
 * for the soft radial fill) — NOT react-native-reanimated, which is disabled
 * project-wide in babel.config.js. */
export function VoiceOrb({ state }: { state: VoiceState }) {
  const scale = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  const isTablet = useIsTablet();
  const size = isTablet ? SIZE_TABLET : SIZE;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    scale.stopAnimation();
    if (reduceMotion) {
      scale.setValue(1);
      return;
    }
    let loop: Animated.CompositeAnimation;
    if (state === "idle") {
      // At rest, waiting for a press — the calmest, smallest breathing so the
      // orb still reads as alive without competing with the "hold to talk" cue.
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.015, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      );
    } else if (state === "listening") {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.04, duration: 1250, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 1250, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      );
    } else if (state === "thinking" || state === "transcribing") {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.015, duration: 1750, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 1750, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      );
    } else {
      // Speaking — mock amplitude: no real output audio to follow, so a
      // pseudo-random smoothed sequence gives a plausible "responding" look.
      const steps = Array.from({ length: 6 }, () =>
        Animated.timing(scale, {
          toValue: 1 + Math.random() * 0.12,
          duration: 220,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      );
      loop = Animated.loop(Animated.sequence(steps));
    }
    loop.start();
    return () => loop.stop();
  }, [state, reduceMotion, scale]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <RadialGradient id="orb-outer">
            <Stop offset="0%" stopColor="#F15A32" stopOpacity={0.5} />
            <Stop offset="70%" stopColor="#F15A32" stopOpacity={0.18} />
            <Stop offset="100%" stopColor="#F15A32" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="orb-core">
            <Stop offset="0%" stopColor="#FF784E" stopOpacity={0.95} />
            <Stop offset="60%" stopColor="#F15A32" stopOpacity={0.8} />
            <Stop offset="100%" stopColor="#7B2A20" stopOpacity={0.6} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#orb-outer)" />
        <Circle cx={size / 2} cy={size / 2} r={size / 2.9} fill="url(#orb-core)" />
      </Svg>
    </Animated.View>
  );
}
