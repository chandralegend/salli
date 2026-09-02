import Svg, { Path, Rect } from "react-native-svg";

/**
 * The bottom-navigation glyphs, transcribed from the HTML mockup's own `<defs>`
 * rather than approximated with the nearest lucide equivalent.
 *
 * Lucide got close but not identical, and the differences were the visible
 * kind: its `Sparkles` carries two satellite sparkles where the mockup has a
 * single four-point star, and its `TrendingUp` draws a different arrow head.
 * The route mapping was wrong too — the app used the four-square grid for Home
 * and a table for Ledger, where the mockup has a house for Home and gives the
 * grid to Ledger.
 *
 * Same prop shape as a lucide icon (`size` / `color` / `strokeWidth`) so the
 * tab bar's NavTab needs no changes to consume them.
 */
type IconProps = { size?: number; color?: string; strokeWidth?: number };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none" as const,
});

export function NavHome({ size = 21, color = "#000", strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path
        d="M3 10.5 12 3l9 7.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M5 9.5V20h14V9.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function NavLedger({ size = 21, color = "#000", strokeWidth = 2 }: IconProps) {
  const squares = [
    { x: 3, y: 3 },
    { x: 13.5, y: 3 },
    { x: 3, y: 13.5 },
    { x: 13.5, y: 13.5 },
  ];
  return (
    <Svg {...base(size)}>
      {squares.map((s) => (
        <Rect
          key={`${s.x}-${s.y}`}
          x={s.x}
          y={s.y}
          width={7.5}
          height={7.5}
          rx={1.5}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}

export function NavSalli({ size = 21, color = "#000", strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      {/* One four-point star, deliberately not lucide's Sparkles — the two
          satellite sparkles made it the busiest glyph in the bar. */}
      <Path
        d="M12 2.5 14 9l6.5 2-6.5 2-2 6.5-2-6.5L3.5 11 10 9z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function NavFreedom({ size = 21, color = "#000", strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path
        d="M3 17l6-6 4 4 8-8"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M15 7h6v6"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
