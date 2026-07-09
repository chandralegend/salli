import { cn } from "@/lib/utils";

/**
 * The Salli brand mark — the Sinhala rupee glyph "රු" in lime on an ink badge.
 * Rendered as a flex-centered HTML glyph rather than SVG text: SVG's
 * dominant-baseline centers on the font's em-box, not the glyph's visual
 * bounds, which left this Sinhala conjunct sitting off-center in the square.
 * Sized via container query units (cqw) so any `size-*` className scales the
 * glyph proportionally with no per-instance tuning.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "@container relative shrink-0 select-none overflow-hidden rounded-[26%] bg-[#010001] flex items-center justify-center",
        className,
      )}
      role="img"
      aria-label="Salli"
    >
      <span className="text-[#E8FC85] font-black leading-none text-[48cqw] tracking-[-0.05em]">
        රු
      </span>
    </div>
  );
}
