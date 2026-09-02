import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";

import { useHardShadow } from "../../lib/theme";
import { cn } from "../../lib/utils";

type CardProps = ViewProps & {
  children: ReactNode;
  className?: string;
  inset?: boolean; // the recessed cell surface, for cards nested in cards
  /** Opt out of the offset shadow. Use for a card inside another card, where a
   *  second shadow reads as a rendering artefact rather than as depth. */
  flat?: boolean;
};

/**
 * The recurring content container.
 *
 * Neobrutalist: a 2px ink border and a hard offset shadow with no blur, rather
 * than a tinted fill or a soft lift. Both border and shadow are ink, so they
 * invert together — black on the cream canvas, white on the near-black one —
 * which is what keeps the style coherent in dark mode instead of just dimmer.
 */
export function Card({ children, className, inset, flat, ...props }: CardProps) {
  const shadow = useHardShadow();
  return (
    <View
      className={cn(
        "rounded-card border-2 border-foreground",
        inset ? "bg-muted" : "bg-card",
        className,
      )}
      style={[flat || inset ? undefined : shadow, props.style]}
      {...props}
    >
      {children}
    </View>
  );
}
