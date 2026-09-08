import type { ReactNode } from "react";

/** A headline word sitting on a tilted orange block.
 *
 * The text is ink, not cream. Cream on orange is 3.0:1, which only clears
 * WCAG at large sizes and only just; ink on orange is 7:1 and is also the rule
 * the buttons follow, so the highlight and the accent CTA agree. */
export function Highlight({ children }: { children: ReactNode }) {
  return (
    <span className="relative whitespace-nowrap">
      <span className="relative z-10 px-[0.08em]">{children}</span>
      <span
        className="absolute inset-x-[-0.04em] top-[10%] bottom-[10%] z-0 rounded-badge border-2 border-ink bg-red"
        style={{ transform: "rotate(-1.4deg)" }}
        aria-hidden="true"
      />
    </span>
  );
}
