import { useRef } from "react";
import * as Haptics from "expo-haptics";
import { Animated, Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";

const AnimatedTouchable = Animated.createAnimatedComponent(Pressable);

const HAPTIC_FNS: Record<"light" | "medium" | "selection", () => void> = {
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  selection: () => Haptics.selectionAsync(),
};

type AnimatedPressableProps = Omit<PressableProps, "style"> & {
  scaleTo?: number;
  haptic?: "light" | "medium" | "selection" | "none";
  /**
   * How the press reads.
   *
   * "scale" (default) shrinks and dims — the existing behaviour, kept as the
   * default because 79 call sites rely on it and most are list rows with no
   * shadow to sink into.
   *
   * "sink" slides the element down-right by exactly the hard shadow's offset,
   * so it lands on top of its own shadow and the gap closes. Transform-only,
   * which matters: shadowOffset cannot be animated on the native driver, so
   * animating the shadow itself would move this to the JS thread. Moving the
   * element over a static shadow is visually identical and stays native.
   */
  press?: "scale" | "sink";
  style?: StyleProp<ViewStyle>;
  className?: string;
};

/** Must match the offset in `useHardShadow` — the element has to travel exactly
 *  the shadow's distance for the gap to close, and no further. */
const SINK_DISTANCE = 4;

/**
 * Shared tap-feedback wrapper. Two press styles: "scale" shrinks and dims,
 * "sink" slides the element onto its own hard shadow (see the `press` prop). Built on core RN `Animated` (not react-native-reanimated's
 * worklet hooks: babel.config.js deliberately disables the reanimated/worklets
 * Babel plugin project-wide after it crashed real devices by misinstrumenting
 * unrelated object property access as a missed worklet — useAnimatedStyle /
 * withTiming / withSpring are off-limits here even though the package is
 * installed). Haptic fires on `onPress`, not `onPressIn`, so a touch a parent
 * ScrollView later steals never buzzes for an incomplete tap.
 */
export function AnimatedPressable({
  scaleTo = 0.965,
  haptic = "none",
  press = "scale",
  style,
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  ...props
}: AnimatedPressableProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const sink = useRef(new Animated.Value(0)).current;
  const sinking = press === "sink";

  return (
    <AnimatedTouchable
      disabled={disabled}
      onPressIn={(e) => {
        if (!disabled) {
          if (sinking) {
            Animated.timing(sink, {
              toValue: SINK_DISTANCE,
              duration: 60,
              useNativeDriver: true,
            }).start();
          } else {
            Animated.timing(scale, { toValue: scaleTo, duration: 80, useNativeDriver: true }).start();
            Animated.timing(opacity, { toValue: 0.85, duration: 80, useNativeDriver: true }).start();
          }
        }
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        if (!disabled) {
          if (sinking) {
            // No bounce on the way back: overshooting would lift the element
            // past its shadow and show a gap on the wrong side.
            Animated.timing(sink, { toValue: 0, duration: 90, useNativeDriver: true }).start();
          } else {
            Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 8 }).start();
            Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }).start();
          }
        }
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (!disabled && haptic !== "none") HAPTIC_FNS[haptic]();
        onPress?.(e);
      }}
      style={[
        sinking
          ? { transform: [{ translateX: sink }, { translateY: sink }] }
          : { transform: [{ scale }], opacity },
        style,
      ]}
      {...props}
    />
  );
}
