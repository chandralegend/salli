import { Pressable, Text, View } from "react-native";

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
    <View className={cn("flex-row rounded-pill border border-foreground/[0.07] bg-card p-1", className)}>
      {options.map((opt) => {
        const active = opt === value;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            className={cn(
              "h-9 flex-1 items-center justify-center rounded-pill",
              active && "border border-foreground/10 bg-background",
            )}
          >
            <Text
              className={cn(
                "text-[13px]",
                capitalize && "capitalize",
                active ? "font-sans-semibold text-foreground" : "font-sans-medium text-foreground/30",
              )}
            >
              {opt}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
