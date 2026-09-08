import Image from "next/image";
import { clsx } from "clsx";

/**
 * A real screenshot of the shipped app, in a phone.
 *
 * The captures are the actual ones from the App Store submission, so the page
 * cannot promise a screen the product does not have. The previous site built
 * its product previews out of styled `<div>`s: fake ledger rows, a fake tax
 * card, a fake chat bubble. They drifted from the real app immediately and none
 * of them survived the app's redesign.
 *
 * The frame's proportions are the device's, not a mockup library's default.
 * Apple's `displayCornerRadius` on a 6.9" screen is roughly 14-15% of the
 * screenshot's width, and the physical side bezel is under 3% of device width,
 * both far tighter than the usual CSS phone mockup, which is exactly what makes
 * those read as toys.
 *
 * The bezel is light with a heavy ink outline rather than black. Every capture
 * is a near-black screen, so an ink bezel merged with it into one dark
 * rectangle and the phone stopped reading as a phone at all.
 *
 * No island is drawn. These are real captures and the cutout is already in the
 * pixels; adding one paints a second island under the first.
 */

// Every capture is a 6.9" frame, so the screen ratio is fixed rather than
// per-image. A wrong value here letterboxes the whole gallery at once.
const SCREEN_ASPECT = 1320 / 2868;
const BEZEL_RATIO = 0.036;
const SCREEN_RADIUS_RATIO = 0.15;

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
  /** Outer width of the phone, bezel included. */
  width?: number;
  priority?: boolean;
  className?: string;
  /** Degrees. Used sparingly, and never on a screen the reader has to read. */
  tilt?: number;
}) {
  const bezel = width * BEZEL_RATIO;
  const screenW = width - bezel * 2;
  const screenH = screenW / SCREEN_ASPECT;
  const screenRadius = screenW * SCREEN_RADIUS_RATIO;
  const outerRadius = screenRadius + bezel;
  const height = screenH + bezel * 2;

  return (
    <div
      className={clsx("relative flex-none bg-card", className)}
      style={{
        width,
        height,
        borderRadius: outerRadius,
        padding: bezel,
        // The site's hard shadow, sized to the object rather than inherited, so
        // a 150px phone in a bento tile is not carrying the hero's slab edge.
        border: "3px solid var(--color-ink)",
        boxShadow: `${width > 200 ? 6 : 4}px ${width > 200 ? 6 : 4}px 0 0 var(--brut, var(--color-ink))`,
        transform: tilt ? `rotate(${tilt}deg)` : undefined,
      }}
    >
      {/* Side controls. Drawn just outside the body so they read as hardware
          against the light bezel, and in ink so they survive on both canvases. */}
      <span aria-hidden="true">
        <i className="absolute -left-[5px] top-[21%] h-[3.4%] w-[3px] rounded-l-full bg-ink" />
        <i className="absolute -left-[5px] top-[29%] h-[6.5%] w-[3px] rounded-l-full bg-ink" />
        <i className="absolute -left-[5px] top-[38%] h-[6.5%] w-[3px] rounded-l-full bg-ink" />
        <i className="absolute -right-[5px] top-[31%] h-[9%] w-[3px] rounded-r-full bg-ink" />
      </span>

      <div
        className="relative h-full w-full overflow-hidden bg-black"
        style={{
          borderRadius: screenRadius,
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.16)",
        }}
      >
        <Image
          src={src}
          alt={alt}
          width={660}
          height={1434}
          priority={priority}
          sizes={`${Math.round(width)}px`}
          className="h-full w-full object-cover object-top"
        />
      </div>
    </div>
  );
}
