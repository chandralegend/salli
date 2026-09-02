import { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing } from "react-native";
import Svg, { G, Path } from "react-native-svg";

import { BLOUB, BLOUB_VIEWBOX, type BloubEye, type BloubMood } from "./bloub-geometry";
import { useThemeColors } from "@/lib/theme";

const AnimatedG = Animated.createAnimatedComponent(G);

/** Where the eyes are punched out — the pale body shows through the holes. */
const EYE_HOLE = "#F9F9F9";

/** How long one expression takes to dissolve into the next. */
const MOOD_FADE_MS = 380;

/**
 * Salli's face.
 *
 * Six expressions, from the authored SVGs in /bloub. The eyes drift
 * continuously, which is what makes it read as present rather than as a logo,
 * and the expression follows what the conversation is doing.
 *
 * Animations run on the JS driver where they touch SVG props (the eye drift)
 * and the native driver where they do not (scale, cross-fade opacity).
 * react-native-svg's native-driver support for `x`/`y` on a G is inconsistent
 * across versions, and the drift is two interpolated numbers on a three-second
 * loop. (Reanimated is not an option: its Babel plugin is disabled
 * project-wide, see babel.config.js.)
 */
export function Bloub({
  mood = "neutral",
  size = 176,
  enterFrom,
  amplitude,
}: {
  mood?: BloubMood;
  size?: number;
  /**
   * Scale to enter from, springing to 1 on mount. Used by the header instance
   * so that sending a message reads as the big face shrinking into the header
   * rather than one face vanishing and a different one appearing.
   */
  enterFrom?: number;
  /**
   * Live 0..1 microphone level. Adds a small scale on top of the breath so the
   * face responds to the actual voice rather than to a synthetic loop — the
   * signal Voice Mode already carries from on-device recognition.
   */
  amplitude?: number;
}) {
  const colors = useThemeColors();

  /**
   * Reduce Motion, honoured because the previous voice orb honoured it and
   * dropping that on the way past would be a quiet accessibility regression.
   * With it on, the drift, breath and amplitude all hold still; expressions
   * still change and still cross-fade, since a dissolve is not vestibular
   * motion and the expression is the information.
   */
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => sub.remove();
  }, []);
  const drift = useRef(new Animated.Value(0)).current;
  const breath = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(enterFrom ?? 1)).current;

  // The authored animation: linear, alternating, 2.967s. Reproduced exactly.
  const durationMs = BLOUB[mood].durationMs;
  useEffect(() => {
    const leg = (toValue: number) =>
      Animated.timing(drift, {
        toValue,
        duration: durationMs,
        easing: Easing.linear,
        useNativeDriver: false,
      });
    if (reduceMotion) {
      drift.setValue(0);
      return;
    }
    const loop = Animated.loop(Animated.sequence([leg(1), leg(0)]));
    loop.start();
    return () => loop.stop();
  }, [drift, durationMs, reduceMotion]);

  // Breathing. Faster while a reply is streaming, because that is the one mood
  // where something is actively happening and stillness would read as stalled.
  useEffect(() => {
    const period = mood === "excited" ? 900 : 2600;
    const leg = (toValue: number) =>
      Animated.timing(breath, {
        toValue,
        duration: period,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      });
    if (reduceMotion) {
      breath.setValue(0);
      return;
    }
    const loop = Animated.loop(Animated.sequence([leg(1), leg(0)]));
    loop.start();
    return () => loop.stop();
  }, [breath, mood, reduceMotion]);

  /**
   * The expression being dissolved out of, and how far through that is.
   *
   * Only the eye layer crosses; the body is drawn once and never fades.
   *
   * Two earlier attempts were wrong in instructive ways. Fading the eye paths
   * inside the SVG <Mask> does nothing at all — react-native-svg rasterises
   * mask contents, so an animated opacity there never repaints, and frame
   * captures showed the eyes still swapping in a single frame. Stacking two
   * whole faces and crossing their view opacities did dissolve, but dimmed the
   * body at the midpoint: two copies of one opaque shape at complementary
   * opacities composite to 1 - f(1 - f), which is 75% at f = 0.5, not 100%.
   *
   * So the mask is gone. It only ever existed to punch the eyes out of the
   * accent fill so the pale body showed through — which is the same picture as
   * drawing the accent body and then the pale eyes on top of it. That form has
   * the eyes as ordinary paths, free to cross-fade on their own.
   */
  const [outgoing, setOutgoing] = useState<BloubMood | null>(null);
  const fade = useRef(new Animated.Value(1)).current;
  const shownMood = useRef(mood);

  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      if (enterFrom == null) return;
      Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 9, bounciness: 7 }).start();
      return;
    }
    if (shownMood.current === mood) return;
    setOutgoing(shownMood.current);
    shownMood.current = mood;
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: MOOD_FADE_MS,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setOutgoing(null);
    });
    // Much softer than a punch: with a real dissolve underneath, a hard pop
    // fought the fade instead of supporting it.
    pop.setValue(0.985);
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 10, bounciness: 6 }).start();
  }, [mood, pop, enterFrom, fade]);

  const voice = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduceMotion || amplitude == null) {
      voice.setValue(1);
      return;
    }
    // Eases over slightly longer than the level's ~100ms emit interval, so the
    // face swells with the voice instead of ticking with the sampler.
    Animated.timing(voice, {
      toValue: 1 + Math.max(0, Math.min(1, amplitude)) * 0.09,
      duration: 140,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [amplitude, reduceMotion, voice]);

  const bodyScale = useMemo(
    () =>
      Animated.multiply(
        Animated.multiply(pop, voice),
        breath.interpolate({
          inputRange: [0, 1],
          outputRange: [1, mood === "excited" ? 1.035 : 1.018],
        }),
      ),
    [breath, pop, voice, mood],
  );

  return (
    <Animated.View style={{ width: size, height: size, transform: [{ scale: bodyScale }] }}>
      <Svg width={size} height={size} viewBox={BLOUB_VIEWBOX}>
        <Path d={BLOUB[mood].body} fill={colors.accent} />
        {outgoing ? (
          <AnimatedG opacity={fade.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })}>
            {BLOUB[outgoing].eyes.map((eye, i) => (
              <Eye key={`out-${i}`} eye={eye} drift={drift} />
            ))}
          </AnimatedG>
        ) : null}
        <AnimatedG opacity={outgoing ? fade : 1}>
          {BLOUB[mood].eyes.map((eye, i) => (
            <Eye key={`in-${i}`} eye={eye} drift={drift} />
          ))}
        </AnimatedG>
      </Svg>
    </Animated.View>
  );
}

/**
 * One eye: a static matrix placing it, inside an animated translate carrying
 * the authored drift.
 */
function Eye({ eye, drift }: { eye: BloubEye; drift: Animated.Value }) {
  return (
    <AnimatedG
      x={drift.interpolate({ inputRange: [0, 1], outputRange: [0, eye.to[0] - eye.from[0]] })}
      y={drift.interpolate({ inputRange: [0, 1], outputRange: [0, eye.to[1] - eye.from[1]] })}
    >
      <G transform={`matrix(${eye.linear.join(",")},${eye.from[0]},${eye.from[1]})`}>
        <Path d={eye.d} fill={EYE_HOLE} />
      </G>
    </AnimatedG>
  );
}
