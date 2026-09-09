import { clsx } from "clsx";

import { BLOUB_BODY, BLOUB_EYES, BLOUB_VIEWBOX } from "@/components/bloub-path";

/**
 * Salli's face, as a mark.
 *
 * The same silhouette as the app icon and as Bloub inside the app, drawn from
 * one generated path. The eyes look straight out and hold still; the mascot's
 * own eyes drift and glance away, which reads as a face paying attention and
 * reads as a wobble on a 24px logo.
 *
 * The cream outline is what makes it survive on both canvases: the body is
 * orange on cream and orange on ink, and without a stroke it loses its edge
 * against neither, but with an ink stroke it disappears into the dark sections.
 */
export function Mark({ size = 28, className }: { size?: number; className?: string }) {
  // The outline is drawn as a second, larger copy of the same path rather than
  // as a stroke, so the corners stay as round as the body's.
  const grow = (192 + 16) / 192;

  return (
    <svg
      width={size}
      height={size}
      viewBox={BLOUB_VIEWBOX}
      className={clsx("flex-none", className)}
      aria-hidden="true"
      focusable="false"
    >
      <path d={BLOUB_BODY} transform={`scale(${grow})`} className="fill-cream" />
      <path d={BLOUB_BODY} className="fill-red" />
      {BLOUB_EYES.map((e) => (
        <rect
          key={e.cx}
          x={e.cx - e.rx}
          y={e.cy - e.ry}
          width={e.rx * 2}
          height={e.ry * 2}
          rx={e.rx}
          className="fill-ink"
        />
      ))}
    </svg>
  );
}

/**
 * Mark plus wordmark. The lockup that appears in the header and the footer.
 *
 * The wordmark alone was the whole brand everywhere, which meant nothing on
 * the site connected to the icon a reader would be looking for in the App
 * Store afterwards.
 */
export function Wordmark({
  size = 26,
  className,
}: {
  /** Cap height of the wordmark; the mark is sized from it. */
  size?: number;
  className?: string;
}) {
  return (
    <span className={clsx("inline-flex items-center", className)} style={{ gap: size * 0.34 }}>
      <Mark size={size * 1.12} />
      <span
        className="font-display font-extrabold tracking-[-0.04em]"
        style={{ fontSize: size }}
      >
        Salli<span className="text-red">.</span>
      </span>
    </span>
  );
}
