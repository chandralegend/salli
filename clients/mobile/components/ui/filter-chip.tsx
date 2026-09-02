import { Text, View } from "react-native";

import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { cn } from "@/lib/utils";

/** A single pill chip — filter bars and in-form option rows. Every chip keeps
 *  the 2px ink outline; active fills it with ink rather than accent, so a row
 *  of chips reads as one control and orange stays reserved for state. */
export function FilterChip({
  label,
  active,
  onPress,
  capitalize,
  className,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  capitalize?: boolean;
  className?: string;
}) {
  return (
    <AnimatedPressable
      onPress={onPress}
      className={cn(
        "rounded-pill border-2 border-foreground px-3.5 py-1.5",
        active ? "bg-foreground" : "bg-card",
        className,
      )}
    >
      <Text
        className={cn(
          "text-[15px]",
          capitalize && "capitalize",
          active ? "font-sans-semibold text-primary-foreground" : "font-sans-medium text-foreground/65",
        )}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

/** Convenience wrapper: a wrap-flow row of single-select chips. */
export function ChipSelect<T extends string>({
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
    <View className={cn("flex-row flex-wrap gap-1.5", className)}>
      {options.map((opt) => (
        <FilterChip key={opt} label={opt} active={opt === value} capitalize={capitalize} onPress={() => onChange(opt)} />
      ))}
    </View>
  );
}
