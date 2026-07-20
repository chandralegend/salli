import { Pressable, Text, View } from "react-native";

import { cn } from "@/lib/utils";

/** Underline segmented tabs — one shared implementation for the ~9 screens that
 * each re-rolled their own tab header. Active tab shows an accent underline. */
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
  return (
    <View className={cn("flex-row border-b border-foreground/[0.08] px-4", className)}>
      {items.map((item) => {
        const active = item === value;
        return (
          <Pressable key={item} onPress={() => onChange(item)} className="px-3.5 py-2">
            <Text
              className={cn(
                "text-[13px]",
                active ? "font-sans-semibold text-foreground" : "font-sans-medium text-foreground/35",
              )}
            >
              {item}
            </Text>
            {active ? <View className="mt-2 h-0.5 rounded-pill bg-salli-accent" /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}
