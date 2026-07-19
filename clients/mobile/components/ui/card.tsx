import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";

import { cn } from "../../lib/utils";

type CardProps = ViewProps & {
  children: ReactNode;
  className?: string;
  inset?: boolean; // use the darker "muted" surface (nested stat cells) instead of "card"
};

/** The mockup's recurring #1a1a1a card with a hairline border and 14-20px radius. */
export function Card({ children, className, inset, ...props }: CardProps) {
  return (
    <View
      className={cn(
        "rounded-card border border-foreground/10",
        inset ? "bg-muted" : "bg-card",
        className,
      )}
      {...props}
    >
      {children}
    </View>
  );
}
