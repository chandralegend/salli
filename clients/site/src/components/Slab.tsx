import type { ReactNode } from "react";

/**
 * A headline line sitting on an extruded orange block.
 *
 * The heavier sibling of `Highlight`, for the one line on the page that has to
 * carry the whole hero. `Highlight` tilts a thin block behind a word; this is a
 * solid object with a side face, sized to the line rather than the word.
 *
 * Ink on orange, as everywhere else: cream on orange is 3.0:1 and this is the
 * largest, most important type on the site.
 */
export function Slab({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-block">
      <span
        aria-hidden="true"
        className="slab absolute inset-x-[-0.14em] inset-y-[0.06em] z-0 bg-red"
        style={{ transform: "rotate(-1deg)" }}
      />
      <span className="relative z-10 px-[0.14em]">{children}</span>
    </span>
  );
}
