import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { cn } from "../../lib/utils";

type StatTileProps = {
  label: string;
  value: ReactNode;
  hint?: string;
  valueClassName?: string;
  labelClassName?: string;
  hintClassName?: string;
  className?: string;
  onDark?: boolean; // sitting over the hero gradient (Dashboard) — always translucent-white
};

/** The mockup's small grid stat cell: uppercase label, bold value, faint hint —
 * used in Dashboard's 4-tile row, Tax's 3-col grid, Budget Setup's 3-col grid. */
export function StatTile({
  label,
  value,
  hint,
  valueClassName,
  labelClassName,
  hintClassName,
  className,
  onDark,
}: StatTileProps) {
  return (
    <View
      className={cn(
        "rounded-control border px-2.5 py-2.5",
        onDark ? "border-white/10 bg-white/[0.09]" : "border-foreground/10 bg-muted",
        className,
      )}
    >
      <Text
        className={cn(
          "mb-1 text-[12px] font-sans-medium uppercase tracking-wide",
          onDark ? "text-white/40" : "text-foreground/40",
          labelClassName,
        )}
      >
        {label}
      </Text>
      {typeof value === "string" || typeof value === "number" ? (
        <Text
          className={cn(
            "text-[16px] font-sans-bold tracking-tight",
            onDark ? "text-white" : "text-foreground",
            valueClassName,
          )}
        >
          {value}
        </Text>
      ) : (
        value
      )}
      {hint ? (
        <Text
          className={cn(
            "mt-0.5 text-[12px] font-sans",
            onDark ? "text-white/20" : "text-foreground/20",
            hintClassName,
          )}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
