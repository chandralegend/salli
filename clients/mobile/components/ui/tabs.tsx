import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Text, View, type LayoutChangeEvent } from "react-native";

import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

/**
 * Segmented pill tabs — one shared implementation for the ~9 screens that each
 * re-rolled their own tab header.
 *
 * The active state is a pill that slides between positions rather than an
 * underline that teleports. The inverted-surface fill (`primary` on a recessed
 * track) is deliberately the same idiom as the Appearance selector in Settings,
 * and deliberately *not* the accent orange used by the filter chips below the
 * Ledger tabs — two orange pill rows stacked on one screen would compete, and
 * these are navigation while those are filters.
 */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  className,
}: {
  items: readonly T[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  const colors = useThemeColors();
  const [spans, setSpans] = useState<Record<string, { x: number; w: number }>>({});
  const left = useRef(new Animated.Value(0)).current;
  const width = useRef(new Animated.Value(0)).current;
  const placed = useRef(false);

  const target = spans[value];

  useEffect(() => {
    if (!target) return;
    if (!placed.current) {
      // First measurement lands without animating — otherwise the pill visibly
      // flies in from the left edge every time a tabbed screen mounts.
      left.setValue(target.x);
      width.setValue(target.w);
      placed.current = true;
      return;
    }
    // `left`/`width` are layout props, so this can't use the native driver.
    // It's one small view and matches how drawer.tsx already animates.
    Animated.parallel([
      Animated.timing(left, {
        toValue: target.x,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(width, {
        toValue: target.w,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  }, [target?.x, target?.w, left, width]);

  function measure(item: T) {
    return (e: LayoutChangeEvent) => {
      const { x, width: w } = e.nativeEvent.layout;
      setSpans((prev) =>
        prev[item]?.x === x && prev[item]?.w === w ? prev : { ...prev, [item]: { x, w } },
      );
    };
  }

  return (
    <View className={cn("px-4", className)}>
      <View className="rounded-card border-2 border-foreground bg-card p-1">
        {/* Unpadded inner row so a child's measured `x` and the pill's `left`
            share one origin — with padding on this row the two would disagree. */}
        <View className="flex-row">
          <Animated.View
            style={{
              position: "absolute",
              left,
              width,
              top: 0,
              bottom: 0,
              borderRadius: 8,
              backgroundColor: colors.primary,
            }}
          />
          {items.map((item) => {
            const active = item === value;
            return (
              <AnimatedPressable
                key={item}
                onPress={() => onChange(item)}
                onLayout={measure(item)}
                haptic="selection"
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                className="flex-1 items-center justify-center py-1.5"
              >
                <Text
                  numberOfLines={1}
                  className={cn(
                    "text-[15px]",
                    active
                      ? "font-sans-semibold text-primary-foreground"
                      : "font-sans-medium text-muted-foreground",
                  )}
                >
                  {item}
                </Text>
              </AnimatedPressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
