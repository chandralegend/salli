/**
 * Categorical colours for charts, shared so two donuts on the same screen
 * cannot disagree.
 *
 * Brand-first, then stepping away from it. Both donuts feed sorted-by-amount
 * data, so the largest slice always lands on the accent rather than wherever a
 * decorative order happened to put it.
 *
 * These replace a warm grey-brown ramp (#16130f / #b7b1a5 / #4b463d …) left
 * over from the old warm-charcoal palette. On the neutral system those read as
 * muddy near-identical browns — seven of them in one donut, none of which
 * matched the accent used everywhere else on the screen.
 */
export const CHART_COLORS = [
  "#F15A32", // brand accent
  "#2E7D6B", // teal — also "needs" in the spending split
  "#3A5FC7", // blue — also "savings"
  "#C77D3A", // amber — also "wants"
  "#7B4B8A", // plum
  "#8A8785", // warm grey
  "#4B463D", // deep olive
] as const;

/** Cycles, so a chart with more series than colours still renders. */
export function chartColor(i: number): string {
  return CHART_COLORS[i % CHART_COLORS.length];
}
