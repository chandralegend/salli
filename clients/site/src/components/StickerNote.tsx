import type { ReactNode } from "react";
import { clsx } from "clsx";

/**
 * A handwritten note pinned to a section.
 *
 * The hero puts the pitch on paper around the product; this is the same device
 * at section scale, for the one aside per section that is worth saying but is
 * not part of the argument. Decoration by intent, so it is `aria-hidden` and
 * never carries information that is not already in the section's own copy.
 *
 * Kept rare on purpose. A note on every section is wallpaper, and the marker
 * face stops meaning "someone wrote this by hand" the third time it appears.
 */
export function StickerNote({
  children,
  tone = "yellow",
  tilt = -4,
  className,
}: {
  children: ReactNode;
  tone?: "yellow" | "ai" | "red";
  tilt?: number;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={clsx(
        "sticker w-fit max-w-[220px] px-5 py-4 font-marker text-[24px] leading-[1.05] font-bold uppercase",
        tone === "yellow" && "bg-yellow",
        tone === "ai" && "bg-ai",
        tone === "red" && "bg-red",
        className,
      )}
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      {children}
    </div>
  );
}
