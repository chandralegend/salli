import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import Svg, { Defs, G, Mask, Path, Rect } from "react-native-svg";

import { BLOUB, BLOUB_VIEWBOX, type BloubMood } from "./bloub-geometry";
import { useThemeColors } from "@/lib/theme";

const AnimatedG = Animated.createAnimatedComponent(G);

/** Where the eyes are punched out — the pale body shows through the holes. */
const EYE_HOLE = "#F9F9F9";

/**
 * Salli's face.
 *
 * Four moods, from the authored SVGs in /bloub. The eyes drift continuously,
 * which is what makes it read as present rather than as a logo, and the mood
 * changes with what the conversation is doing:
 *
 *   neutral    waiting
 *   curious    you are typing
 *   excited    a reply is streaming
 *   surprised  something needs you — an approval, or an error
 *
 * The body also settles on a slow breath, and pops briefly whenever the mood
 * changes so a state transition is felt rather than just seen.
 *
 * Animations run on the JS driver deliberately. react-native-svg's native
 * driver support for `x`/`y` on a G is inconsistent across versions, and this
 * is two interpolated numbers on a three-second loop — the cost is negligible
 * and the correctness is not in question. (Reanimated is not an option: its
 * Babel plugin is disabled project-wide, see babel.config.js.)
 */
export function Bloub({
  mood = "neutral",
  size = 176,
}: {
  mood?: BloubMood;
  size?: number;
}) {
  const colors = useThemeColors();
  const geo = BLOUB[mood];

  const drift = useRef(new Animated.Value(0)).current;
  const breath = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(1)).current;

  // The authored animation: linear, alternating, 2.967s. Reproduced exactly.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: geo.durationMs,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: geo.durationMs,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [drift, geo.durationMs]);

  // Breathing. Faster while a reply is streaming, because that is the one mood
  // where something is actively happening and stillness would read as stalled.
  useEffect(() => {
    const period = mood === "excited" ? 900 : 2600;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: period,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: period,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breath, mood]);

  // A single pop on mood change. Skipped on first mount so the face does not
  // announce itself before the conversation has started.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    pop.setValue(0.94);
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 12 }).start();
  }, [mood, pop]);

  const bodyScale = useMemo(
    () =>
      Animated.multiply(
        pop,
        breath.interpolate({ inputRange: [0, 1], outputRange: [1, mood === "excited" ? 1.035 : 1.018] }),
      ),
    [breath, pop, mood],
  );

  return (
    <Animated.View style={{ transform: [{ scale: bodyScale }] }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} viewBox={BLOUB_VIEWBOX}>
          <Defs>
            <Mask id="bloub-mask" maskUnits="userSpaceOnUse" x={-158} y={-158} width={316} height={316}>
              {/* White keeps, black punches out. */}
              <Path d={geo.bodyMask} fill="#fff" />
              {geo.eyes.map((eye, i) => (
                <AnimatedG
                  key={i}
                  x={drift.interpolate({ inputRange: [0, 1], outputRange: [0, eye.to[0] - eye.from[0]] })}
                  y={drift.interpolate({ inputRange: [0, 1], outputRange: [0, eye.to[1] - eye.from[1]] })}
                >
                  <G
                    transform={`matrix(${eye.linear.join(",")},${eye.from[0]},${eye.from[1]})`}
                  >
                    <Path d={eye.d} fill="#000" />
                  </G>
                </AnimatedG>
              ))}
            </Mask>
          </Defs>
          <Path d={geo.body} fill={EYE_HOLE} />
          <G mask="url(#bloub-mask)">
            {/* The asset ships #e8483f. Using the brand accent instead so the
                app has one warm red rather than two nearly-identical ones —
                one line to revert if the authored colour was deliberate. */}
            <Rect x={-158} y={-158} width={316} height={316} fill={colors.accent} />
          </G>
        </Svg>
      </View>
    </Animated.View>
  );
}
