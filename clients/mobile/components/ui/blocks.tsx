import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { cn } from "@/lib/utils";

/**
 * The mockup's four recurring text/rule/meter blocks.
 *
 * These were being retyped at every call site — the 29px hero appears on Home
 * and Freedom, the mono section label in five screens, the hairline rule in
 * four, the 11px meter in six — and every copy is a chance for one of them to
 * drift a pixel. The class strings here are the mockup's `.hero`, `.said`,
 * `.lbl`, `.rule` and `.bar` rules, translated once.
 *
 * Screens written before this file still inline the same values; they are
 * equivalent, not different, and can migrate as they are next touched.
 */

/** `.hero` — 29px/1.16 at -0.025em, regular weight so `<Strong>` can carry the
 *  emphasis. The screen's opening sentence, one per screen. */
export function Hero({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Text
      className={cn("font-sans text-[29px] leading-[34px] tracking-tight text-foreground", className)}
    >
      {children}
    </Text>
  );
}

/** `.said` — 20px/1.32. A full sentence that is not the screen's opening line:
 *  a summary under a rule, or a navigational statement. */
export function Said({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Text
      className={cn("font-sans text-[20px] leading-[26px] tracking-tight text-foreground", className)}
    >
      {children}
    </Text>
  );
}

/** The bold span inside a `Hero` or `Said` — almost always a figure. Nested
 *  `Text` inherits size and colour, so this sets weight and nothing else. */
export function Strong({ children, className }: { children: ReactNode; className?: string }) {
  return <Text className={cn("font-sans-extrabold", className)}>{children}</Text>;
}

/** `.lbl` — the mono, wide-tracked, uppercase section label. */
export function SectionLabel({
  children,
  className,
  trailing,
}: {
  children: ReactNode;
  className?: string;
  trailing?: ReactNode;
}) {
  const label = (
    <Text className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
      {children}
    </Text>
  );
  if (!trailing) return <View className={cn("px-5", className)}>{label}</View>;
  return (
    <View className={cn("flex-row items-center justify-between px-5", className)}>
      {label}
      {trailing}
    </View>
  );
}

/** `.rule` — the hairline that separates blocks. It is what replaced the
 *  card-per-widget stacking, so it carries the screen's rhythm. */
export function Rule({ tight }: { tight?: boolean }) {
  return <View className={cn("mx-5 h-px bg-foreground/15", tight ? "my-3.5" : "my-5")} />;
}

/**
 * `.bar` — the 11px pill meter.
 *
 * `value` is a fraction, clamped here rather than at each call site: spending
 * genuinely exceeds its limit, and an unclamped 1.4 renders as a bar wider
 * than its own track. Pass `over` to colour it as a breach — the fill stays
 * full width, since a bar cannot show "more than full" and the number beside
 * it is what states the overage.
 */
export function Meter({
  value,
  over,
  className,
  tone,
}: {
  value: number;
  over?: boolean;
  className?: string;
  /** Overrides the fill colour. For charts that colour by series rather than
   *  by state — pass a resolved colour, not a class. */
  tone?: string;
}) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0)) * 100;
  return (
    <View className={cn("h-[11px] overflow-hidden rounded-pill bg-foreground/20", className)}>
      <View
        className={cn("h-full rounded-pill", tone ? undefined : over ? "bg-destructive" : "bg-salli-accent")}
        // Only set backgroundColor when there IS a tone. NativeWind compiles
        // className into the style prop, and an explicit `backgroundColor:
        // undefined` sitting in the winning position blanks the fill the class
        // just supplied — every meter renders as an empty track.
        style={tone ? { width: `${pct}%`, backgroundColor: tone } : { width: `${pct}%` }}
      />
    </View>
  );
}
