import { Pressable, Text, View } from "react-native";

import { cn } from "@/lib/utils";

/** A single rounded-pill chip — used both in filter bars and in-form option
 * rows. Active = accent fill; inactive = bordered card. */
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
    <Pressable
      onPress={onPress}
      className={cn(
        "rounded-pill px-3.5 py-1.5",
        active ? "bg-salli-accent" : "border border-foreground/10 bg-card",
        className,
      )}
    >
      <Text
        className={cn(
          "text-[12px]",
          capitalize && "capitalize",
          active ? "font-sans-semibold text-white" : "font-sans-medium text-foreground/50",
        )}
      >
        {label}
      </Text>
    </Pressable>
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
