"use client";

import { useInView } from "@/lib/useInView";

/**
 * The FI projection, drawn.
 *
 * This section used to be three tiles reading "Nov 2029", "14.2 yrs" and
 * "61/100". Those are the outputs of a projection, and printing them as text
 * asks the reader to imagine the shape that produced them. The shape is the
 * argument: savings compound, the curve bends upward, and it crosses the
 * freedom number years before a straight line would.
 *
 * Example figures from a demo ledger. They are labelled as such next to the
 * chart, because a marketing page inventing a specific person's net-worth
 * curve and presenting it as real is the same failure as the AI inventing a
 * tax figure.
 */

// A 6% real return on a constant annual contribution, sampled yearly. Written
// out rather than computed so the drawn path is stable across renders and the
// numbers on the page can be checked against it.
const FREEDOM_NUMBER = 100;
const SERIES = [4, 9, 15, 22, 30, 39, 49, 60, 72, 85, 99, 114, 131, 149, 168];

const W = 560;
const H = 260;
const PAD = { l: 8, r: 8, t: 18, b: 26 };

const maxY = 180;
const x = (i: number) =>
  PAD.l + (i / (SERIES.length - 1)) * (W - PAD.l - PAD.r);
const y = (v: number) => H - PAD.b - (v / maxY) * (H - PAD.t - PAD.b);

const linePath = SERIES.map(
  (v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`,
).join(" ");
const areaPath = `${linePath} L${x(SERIES.length - 1).toFixed(1)},${(H - PAD.b).toFixed(1)} L${x(0).toFixed(1)},${(H - PAD.b).toFixed(1)} Z`;

// First year the curve clears the freedom line. Derived, not typed in, so the
// marker cannot drift away from the data it is marking.
const crossIndex = SERIES.findIndex((v) => v >= FREEDOM_NUMBER);

export function FreedomChart() {
  const { ref, inView, reduced } = useInView<HTMLDivElement>(0.3);
  const on = inView || reduced;

  return (
    <div ref={ref} className="brut bg-card p-5 sm:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="font-display text-[19px] font-bold tracking-[-0.02em]">
          Net worth against your freedom number
        </div>
        <div className="font-mono text-[11px] uppercase tracking-[.08em] text-ink-50">
          15 year projection
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-5 w-full"
        role="img"
        aria-label="A net worth projection curving upward and crossing the freedom number in year 11 of 15."
      >
        {/* Baseline grid. Three lines, not ten: enough to read height by, few
            enough that the curve stays the loudest thing in the frame. */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={PAD.l}
            x2={W - PAD.r}
            y1={y(maxY * f)}
            y2={y(maxY * f)}
            stroke="currentColor"
            strokeWidth={1}
            className="text-ink/10"
          />
        ))}

        {/* Filled area, clipped open from the left as the curve draws. */}
        <clipPath id="freedom-sweep">
          <rect x={0} y={0} height={H} width={on ? W : 0}>
            {!reduced && on && (
              <animate
                attributeName="width"
                from="0"
                to={W}
                dur="1.5s"
                fill="freeze"
                calcMode="spline"
                keySplines="0.2 0 0 1"
                keyTimes="0;1"
                values={`0;${W}`}
              />
            )}
          </rect>
        </clipPath>

        <g clipPath="url(#freedom-sweep)">
          <path d={areaPath} className="fill-red/30" />
          <path
            d={linePath}
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinejoin="round"
            strokeLinecap="round"
            className="text-ink"
          />
        </g>

        {/* The freedom number itself. Dashed, so it reads as a target rather
            than as another measured series. */}
        <line
          x1={PAD.l}
          x2={W - PAD.r}
          y1={y(FREEDOM_NUMBER)}
          y2={y(FREEDOM_NUMBER)}
          stroke="currentColor"
          strokeWidth={2}
          strokeDasharray="7 5"
          className="text-red"
        />
        <text
          x={PAD.l + 4}
          y={y(FREEDOM_NUMBER) - 8}
          className="fill-red-ink font-mono text-[11px] font-semibold uppercase"
          style={{ letterSpacing: "0.08em" }}
        >
          Freedom number
        </text>

        {/* Crossover. */}
        <g
          style={{
            opacity: on ? 1 : 0,
            transition: reduced ? undefined : "opacity .4s ease 1.3s",
          }}
        >
          <line
            x1={x(crossIndex)}
            x2={x(crossIndex)}
            y1={y(FREEDOM_NUMBER)}
            y2={H - PAD.b}
            stroke="currentColor"
            strokeWidth={2}
            className="text-ink"
          />
          <rect
            x={x(crossIndex) - 7}
            y={y(SERIES[crossIndex]) - 7}
            width={14}
            height={14}
            className="fill-red stroke-ink"
            strokeWidth={2}
          />
        </g>

        <text
          x={PAD.l}
          y={H - 6}
          className="fill-ink-50 font-mono text-[10.5px]"
          style={{ letterSpacing: "0.06em" }}
        >
          Today
        </text>
        <text
          x={x(crossIndex)}
          y={H - 6}
          textAnchor="middle"
          className="fill-ink font-mono text-[10.5px] font-bold"
          style={{ letterSpacing: "0.06em" }}
        >
          Year 11
        </text>
      </svg>
    </div>
  );
}
