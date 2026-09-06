import { useEffect, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";

import { Bloub } from "@/components/agent/Bloub";

/**
 * What Salli shows between you pressing send and the first token arriving.
 *
 * That gap was silent. The composer disabled itself and nothing else moved, so
 * a slow first token was indistinguishable from a dropped request, and the
 * honest reading was that the app had hung. Every assistant worth copying fills
 * this gap, and fills it with something that is alive rather than a spinner:
 * motion says "still here", a spinner says "blocked".
 *
 * Two things move, on purpose. Bloub breathes, because he is the character and
 * the empty state has already taught you to read him as present. The word
 * pulses, because a caption that sits still under a moving face looks like it
 * belongs to a different screen.
 *
 * Deliberately vague. It says "Thinking", not "Reading your ledger", because at
 * this point no tool has run and claiming otherwise would be a small lie the
 * next line contradicts. Once tools do run, `ToolActivityBlock` takes over and
 * names them accurately.
 *
 * Core `Animated`, not Reanimated: babel.config.js disables Reanimated
 * project-wide, the same reason ToolActivityRow's spinner is built this way.
 */
export function ThinkingIndicator() {
  const pulse = useRef(new Animated.Value(0)).current;
  const breath = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Sine easing in both directions, so the pulse has no hard turn at either
    // end. A linear loop reads as a blink.
    const fade = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 620,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 620,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    // Slower than the text, and not a multiple of it: when the two cycles line
    // up the pair reads as one blinking object rather than two living ones.
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    fade.start();
    breathe.start();
    return () => {
      fade.stop();
      breathe.stop();
    };
  }, [pulse, breath]);

  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
  // A very small range. Anything larger and he looks like he is bouncing.
  const scale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });

  return (
    <View
      className="flex-row items-center gap-2.5 px-1 py-2"
      accessibilityRole="progressbar"
      // The animation is decorative; screen readers get one honest string
      // rather than a pulsing word they would have to re-read.
      accessibilityLabel="Salli is thinking"
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Bloub mood="attentive" size={22} />
      </Animated.View>
      <Animated.Text style={{ opacity }} className="text-[15px] font-sans-medium text-foreground/70">
        Thinking
      </Animated.Text>
    </View>
  );
}
