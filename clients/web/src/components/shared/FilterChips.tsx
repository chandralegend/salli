"use client";

import { cn } from "@/lib/utils";

/** Pill filter row matching the mobile FilterChip: active = filled primary,
 * inactive = bordered card. Generic over the option value. */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {options.map((opt) => {
        const active = opt === value;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={cn(
              "rounded-full px-3 py-1 text-[12px] font-medium capitalize transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "border bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
