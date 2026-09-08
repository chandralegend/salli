"use client";

import { useInView } from "@/lib/useInView";

/**
 * The 2025/26 rate bands as bars, the way the app draws them.
 *
 * The engine section used to list the bands as four lines of "applied /
 * applied / final / credited", which describes the engine without showing what
 * it does. A progressive rate structure is a shape: five bands, each one taxing
 * only the slice above the last, and the marginal band carrying most of the
 * bill. The bar lengths are that shape.
 *
 * Every row keeps a full-width track. Drawing the bars alone left the 6% band
 * as a seventeen-pixel stub with nothing to measure it against, which is a
 * comparison the reader has to do in their head.
 *
 * Figures are the published LK 2025/26 bands. Amounts use the lakh shorthand
 * the app itself displays, so 10L here and "Rs. 11.7L" in a screenshot on the
 * same page are the same notation.
 */
const BANDS = [
  { rate: 6, range: "0 to 10L" },
  { rate: 18, range: "10L to 15L" },
  { rate: 24, range: "15L to 20L" },
  { rate: 30, range: "20L to 25L" },
  { rate: 36, range: "25L and above", marginal: true },
];

const MAX_RATE = 36;

export function BandBars() {
  const { ref, inView, reduced } = useInView<HTMLDivElement>(0.3);
  const on = inView || reduced;

  return (
    <div ref={ref} className="flex flex-col gap-2">
      {BANDS.map((b, i) => (
        <div key={b.rate} className="flex items-center gap-2.5">
          <span
            className={`brut-flat w-[46px] flex-none py-1 text-center font-mono text-[12px] font-bold ${
              b.marginal ? "bg-red text-ink" : ""
            }`}
          >
            {b.rate}%
          </span>
          {/* Track, then fill. The track is what makes 6% legible as "a sixth
              of the top band" rather than as a small mark. */}
          <div className="brut-flat relative h-7 flex-1 overflow-hidden bg-card">
            <div
              className={`absolute inset-y-0 left-0 ${b.marginal ? "bg-red" : "bg-cream-soft"}`}
              style={{
                width: on ? `${(b.rate / MAX_RATE) * 100}%` : "0%",
                transition: reduced ? undefined : "width .7s cubic-bezier(.2,0,0,1)",
                transitionDelay: reduced ? undefined : `${i * 90}ms`,
              }}
            />
            <span className="absolute inset-y-0 left-3 flex items-center font-mono text-[11.5px] whitespace-nowrap text-ink-70">
              {b.range}
            </span>
          </div>
        </div>
      ))}
      <p className="mt-2 font-mono text-[11px] leading-[1.6] text-ink-50">
        Plus a flat rate on foreign service income, charged outside these bands.
      </p>
    </div>
  );
}
