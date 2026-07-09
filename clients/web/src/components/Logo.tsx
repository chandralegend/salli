import { cn } from "@/lib/utils";

/**
 * The Salli brand mark — the Sinhala rupee glyph "රු" in lime on an ink badge.
 * Rendered as an SVG so it scales cleanly to whatever size the className sets
 * (no raster PNG). Matches the sidebar badge.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("select-none shrink-0", className)}
      role="img"
      aria-label="Salli"
    >
      <rect width="100" height="100" rx="26" fill="#010001" />
      <text
        x="50"
        y="54"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="46"
        fontWeight="900"
        fill="#E8FC85"
        style={{ letterSpacing: "-0.05em", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}
      >
        රු
      </text>
    </svg>
  );
}
