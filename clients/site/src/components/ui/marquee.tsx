"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Infinite horizontal marquee. Children are duplicated once so the loop is
 * seamless; pauses on hover. Pure CSS animation (defined in globals.css).
 */
export function Marquee({
  children,
  className,
  speed = 32,
}: {
  children: ReactNode;
  className?: string;
  speed?: number;
}) {
  return (
    <div className={cn("group relative flex overflow-hidden", className)}>
      <div
        className="flex shrink-0 items-center gap-8 pr-8 marquee-track"
        style={{ animationDuration: `${speed}s` }}
      >
        {children}
      </div>
      <div
        className="flex shrink-0 items-center gap-8 pr-8 marquee-track"
        style={{ animationDuration: `${speed}s` }}
        aria-hidden
      >
        {children}
      </div>
    </div>
  );
}
