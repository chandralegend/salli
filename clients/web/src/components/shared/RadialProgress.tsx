import type { ReactNode } from "react";

/** Small conic-gradient progress ring — a reusable, dependency-free gauge for
 * a single 0-100 value (e.g. FIRE progress). Defaults match the navy
 * `StatCard emphasis` variant; override for use on a light card. */
export function RadialProgress({
  value,
  size = 64,
  ringWidth = 8,
  fillColor = "white",
  trackColor = "rgba(255,255,255,.15)",
  innerBg = "var(--emphasis)",
  label,
}: {
  value: number;
  size?: number;
  ringWidth?: number;
  fillColor?: string;
  trackColor?: string;
  innerBg?: string;
  label?: ReactNode;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className="flex items-center gap-3">
      <div
        className="relative flex shrink-0 items-center justify-center rounded-full"
        style={{
          width: size,
          height: size,
          background: `conic-gradient(${fillColor} ${clamped * 3.6}deg, ${trackColor} 0deg)`,
        }}
      >
        <div
          className="flex items-center justify-center rounded-full font-mono text-xs font-bold"
          style={{
            width: size - ringWidth * 2,
            height: size - ringWidth * 2,
            background: innerBg,
            color: fillColor,
          }}
        >
          {Math.round(clamped)}%
        </div>
      </div>
      {label}
    </div>
  );
}
