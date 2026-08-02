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
  style?: StyleProp<ViewStyle>;
  className?: string;
};

/**
 * Shared tap-feedback wrapper — scales down + dims slightly on press, springs
 * back on release. Built on core RN `Animated` (not react-native-reanimated's
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
  style,
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  ...props
}: AnimatedPressableProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  return (
    <AnimatedTouchable
      disabled={disabled}
      onPressIn={(e) => {
        if (!disabled) {
          Animated.timing(scale, { toValue: scaleTo, duration: 80, useNativeDriver: true }).start();
          Animated.timing(opacity, { toValue: 0.85, duration: 80, useNativeDriver: true }).start();
        }
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        if (!disabled) {
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 8 }).start();
          Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }).start();
        }
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (!disabled && haptic !== "none") HAPTIC_FNS[haptic]();
        onPress?.(e);
      }}
      style={[{ transform: [{ scale }], opacity }, style]}
      {...props}
    />
  );
}
