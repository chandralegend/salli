import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";

import { useThemeMode } from "../../lib/theme";
import { cn } from "../../lib/utils";

type CardProps = ViewProps & {
  children: ReactNode;
  className?: string;
  inset?: boolean; // use the raised cell surface (nested stat cells) instead of "card"
  /** Opt out of the light-mode lift — for a card nested inside another card,
   *  where a second shadow reads as a rendering artefact rather than depth. */
  flat?: boolean;
};

/**
 * The recurring content container.
 *
 * Light and dark separate a card from the canvas by different means, because
 * the canvas is different. On black, the card carries a raised fill
 * (systemGray6) and needs nothing else — that is how iOS does it. On white,
 * a fill would make the card a tinted panel rather than paper, so it keeps the
 * canvas colour and floats on a very soft shadow instead. Same perceived
 * elevation, opposite mechanism.
 */
export function Card({ children, className, inset, flat, ...props }: CardProps) {
  const { isDark } = useThemeMode();
  const lift =
    isDark || flat || inset
      ? undefined
      : {
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 3,
          elevation: 1,
        };

  return (
    <View
      className={cn(
        "rounded-card border border-foreground/10",
        inset ? "bg-muted" : "bg-card",
        className,
      )}
      style={[lift, props.style]}
      {...props}
    >
      {children}
    </View>
  );
}
