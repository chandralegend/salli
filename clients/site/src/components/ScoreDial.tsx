"use client";

import { useInView } from "@/lib/useInView";

/**
 * The Freedom score as a segmented gauge.
 *
 * A smooth arc would be the obvious choice and the wrong one here: every other
 * surface on this site is a flat block with a hard edge, and a gradient sweep
 * would be the single soft thing on the page. Twenty discrete segments say the
 * same thing in the site's own vocabulary, and a segment count is easier to
 * read off than an arc length anyway.
 */
const SEGMENTS = 20;
const SIZE = 200;
const R_OUTER = 92;
const R_INNER = 62;
const START = -215; // degrees, opening at the bottom
const SWEEP = 250;

function segmentPath(index: number) {
  const gap = 2.2;
  const a0 = ((START + (index / SEGMENTS) * SWEEP + gap) * Math.PI) / 180;
  const a1 = ((START + ((index + 1) / SEGMENTS) * SWEEP - gap) * Math.PI) / 180;
  const c = SIZE / 2;
  const p = (r: number, a: number) =>
    `${(c + r * Math.cos(a)).toFixed(2)},${(c + r * Math.sin(a)).toFixed(2)}`;
  return [
    `M${p(R_OUTER, a0)}`,
    `A${R_OUTER} ${R_OUTER} 0 0 1 ${p(R_OUTER, a1)}`,
    `L${p(R_INNER, a1)}`,
    `A${R_INNER} ${R_INNER} 0 0 0 ${p(R_INNER, a0)}`,
    "Z",
  ].join(" ");
}

export function ScoreDial({
  score = 61,
  label = "Freedom score",
}: {
  score?: number;
  label?: string;
}) {
  const { ref, inView, reduced } = useInView<HTMLDivElement>(0.4);
  const on = inView || reduced;
  const lit = Math.round((score / 100) * SEGMENTS);

  return (
    <div ref={ref} className="flex flex-col items-center">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full max-w-[210px]"
        role="img"
        aria-label={`${label}: ${score} out of 100.`}
      >
        {Array.from({ length: SEGMENTS }, (_, i) => {
          const isLit = on && i < lit;
          return (
            <path
              key={i}
              d={segmentPath(i)}
              className={
                isLit ? "fill-red stroke-ink" : "fill-cream-soft stroke-ink"
              }
              strokeWidth={2}
              strokeLinejoin="round"
              style={{
                // Segments light in sequence rather than all at once, so the
                // gauge reads as filling up to a value rather than as a static
                // picture that happened to appear.
                transition: reduced ? undefined : "fill .22s ease",
                transitionDelay: reduced ? undefined : `${i * 45}ms`,
              }}
            />
          );
        })}
        <text
          x={SIZE / 2}
          y={SIZE / 2 + 6}
          textAnchor="middle"
          className="fill-ink font-display text-[42px] font-extrabold"
          style={{ letterSpacing: "-0.03em" }}
        >
          {score}
        </text>
        <text
          x={SIZE / 2}
          y={SIZE / 2 + 26}
          textAnchor="middle"
          className="fill-ink-50 font-mono text-[11px]"
          style={{ letterSpacing: "0.1em" }}
        >
          / 100
        </text>
      </svg>
      <div className="mt-1 font-mono text-[11px] font-semibold uppercase tracking-[.08em] text-ink-60">
        {label}
      </div>
    </div>
  );
}
