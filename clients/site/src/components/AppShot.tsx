import Image from "next/image";
import { clsx } from "clsx";

/**
 * A real screenshot of the shipped app, framed in the site's own system.
 *
 * The previous site built its product previews out of styled `<div>`s: fake
 * ledger rows, a fake tax card, a fake chat bubble. They drifted from the real
 * app immediately and none of them survived the app's redesign. These are the
 * actual captures from the App Store submission, so the page cannot promise a
 * screen the product does not have.
 *
 * No phone chrome. The app's own canvas (#0E0E0E) against the site's cream is
 * already the strongest edge on the page; wrapping it in a drawn bezel would
 * add a second, softer frame around a design built on one hard border.
 */

// Every capture is a 6.9" iPhone frame, so the ratio is fixed rather than
// per-image; a wrong aspect here would letterbox the whole gallery at once.
const ASPECT = 1320 / 2868;

export function AppShot({
  src,
  alt,
  width = 260,
  priority,
  className,
  tilt = 0,
}: {
  src: string;
  alt: string;
  width?: number;
  priority?: boolean;
  className?: string;
  /** Degrees. Used sparingly, and never on a screen the reader has to read. */
  tilt?: number;
}) {
  return (
    <div
      className={clsx("brut flex-none overflow-hidden bg-ink", className)}
      style={{
        width,
        // Reserving the box keeps CLS at zero while the image decodes.
        aspectRatio: `${ASPECT}`,
        transform: tilt ? `rotate(${tilt}deg)` : undefined,
      }}
    >
      <Image
        src={src}
        alt={alt}
        width={660}
        height={1434}
        priority={priority}
        sizes={`${width}px`}
        className="h-full w-full object-cover object-top"
      />
    </div>
  );
}
