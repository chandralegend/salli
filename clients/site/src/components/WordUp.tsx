import type { ReactNode } from "react";

/** One word of a hero headline, staggered in on a word-by-word "curtain up" reveal. */
export function WordUp({ delay, children }: { delay: number; children: ReactNode }) {
  return (
    <span className="wm">
      <span style={{ animationDelay: `${delay}s` }}>{children}</span>
    </span>
  );
}
