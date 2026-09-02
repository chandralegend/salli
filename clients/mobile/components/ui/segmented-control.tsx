import { Text, View } from "react-native";

import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { cn } from "@/lib/utils";

/** Enclosed equal-width pill toggle (income/expense/transfer, debt strategy,
 * onboarding). The selected segment gets a raised background. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  capitalize,
  className,
}: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  capitalize?: boolean;
  className?: string;
}) {
  return (
    <View className={cn("flex-row rounded-card border-2 border-foreground bg-card p-1", className)}>
      {options.map((opt) => {
        const active = opt === value;
        return (
          <AnimatedPressable
            key={opt}
            onPress={() => onChange(opt)}
            haptic="selection"
            className={cn(
              "h-9 flex-1 items-center justify-center rounded-[8px]",
              active && "bg-foreground",
            )}
          >
            <Text
              className={cn(
                "text-[15px]",
                capitalize && "capitalize",
                active ? "font-sans-semibold text-primary-foreground" : "font-sans-medium text-foreground/55",
              )}
            >
              {opt}
            </Text>
          </AnimatedPressable>
        );
      })}
    </View>
  );
}
