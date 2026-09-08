import { AppShot } from "@/components/AppShot";

/**
 * The hero's right half: the real app screen, standing on a plinth, with the
 * promise written on notes stuck around it.
 *
 * The screenshot alone was accurate and inert. This keeps the screenshot as the
 * only thing making a claim about the product and puts the pitch on paper
 * around it, so nothing here invents a screen the app does not have. Everything
 * in the sticker layer is decoration and marked `aria-hidden`; the screenshot
 * carries the alt text.
 *
 * Laid out on a fixed stage rather than as flow content with negative offsets.
 * The first version hung the notes off the sides of a `w-fit` wrapper, so their
 * width depended on the phone's width and the outer two were clipped by the
 * section. A stage with known dimensions means every piece has somewhere to be.
 */
const STAGE_W = 566;
const STAGE_H = 592;
const PHONE_W = 248;

export function HeroComposition() {
  return (
    <div className="mx-auto w-full max-w-[566px] select-none">
      <div
        className="relative mx-auto"
        style={{
          width: "100%",
          // Scales the whole arrangement below 520px instead of reflowing it,
          // so the notes never land on top of the phone.
          aspectRatio: `${STAGE_W} / ${STAGE_H}`,
          containerType: "inline-size",
        }}
      >
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{
            width: STAGE_W,
            height: STAGE_H,
            transform: `scale(min(1, 100cqw / ${STAGE_W}px))`,
          }}
        >
          {/* Sticker layer. Hidden below `sm`, where the stage is scaled small
              enough that the handwriting stops being readable. */}
          <div aria-hidden="true" className="pointer-events-none hidden sm:block">
            <div
              className="sticker absolute left-0 top-[96px] w-[150px] bg-ai px-4 py-5"
              style={{ transform: "rotate(-6deg)" }}
            >
              <p className="font-marker text-[25px] leading-[1.02] font-bold uppercase">
                Track
                <br />
                Plan
                <br />
                Grow
                <br />
                Freedom
              </p>
            </div>

            <div
              className="sticker absolute right-0 top-[156px] z-0 w-[176px] bg-yellow px-4 py-5"
              style={{ transform: "rotate(5deg)" }}
            >
              <p className="font-marker text-[25px] leading-[1.05] font-bold uppercase">
                Same money.
                <br />A brighter you.
              </p>
            </div>

            {/* The curve the lavender note is pointing with. Drawn rather than a
                glyph, because no icon set has a hand-drawn arrow. */}
            <svg
              viewBox="0 0 80 60"
              className="absolute left-[30px] top-[286px] z-0 w-[70px] text-ink"
              fill="none"
            >
              <path d="M4 6C10 30 28 48 62 50" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" />
              <path
                d="M48 40L64 50.5L47 57"
                stroke="currentColor"
                strokeWidth={3.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            {/* Impact marks, so the yellow note reads as having just landed. */}
            <svg viewBox="0 0 40 40" className="absolute right-[36px] top-[100px] z-0 w-[36px] text-ink" fill="none">
              {["M6 30L14 16", "M18 26L22 8", "M30 28L36 16"].map((d) => (
                <path key={d} d={d} stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
              ))}
            </svg>

            {/* A circle is the one shape on this site that is not a 12px
                rectangle, which is what makes it read as a stamp. */}
            <div
              className="absolute right-[8px] bottom-[136px] z-20 flex size-[88px] items-center justify-center rounded-full border-[3px] border-ink bg-yellow font-display text-[32px] font-extrabold"
              style={{ boxShadow: "6px 6px 0 0 var(--color-ink)" }}
            >
              Rs
            </div>
          </div>

          {/* The plinth, behind and under the phone so the phone stands on it. */}
          <div
            aria-hidden="true"
            className="slab absolute bottom-0 left-1/2 z-0 flex h-[106px] w-[344px] -translate-x-1/2 items-end bg-red px-6 pb-4"
          >
            <p className="font-mono text-[14px] leading-[1.25] font-bold uppercase tracking-[.06em]">
              Built
              <br />
              for Sri Lanka
            </p>
          </div>

          <div className="absolute bottom-[66px] left-1/2 z-10 -translate-x-1/2">
            <AppShot
              src="/screens/app/01-home.png"
              alt="Salli's home screen: net worth built so far, what is left to spend this month, and the Freedom score"
              width={PHONE_W}
              priority
            />
          </div>
        </div>
      </div>
    </div>
  );
}
