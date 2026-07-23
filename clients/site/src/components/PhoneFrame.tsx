import Image from "next/image";
import { clsx } from "clsx";

// Proportions modelled on the real iPhone 15/16/17 display: Apple's
// displayCornerRadius is ~55-62pt (≈14-16% of a 1179px-wide screenshot), and
// the physical side bezel is only ~2.5-3% of device width — both far
// smaller than typical CSS phone-mockup defaults, which is what reads as
// "too rounded" at a glance.
export function PhoneFrame({
  src,
  alt,
  width = 220,
  className,
}: {
  src: string;
  alt: string;
  width?: number;
  className?: string;
}) {
  const bezel = width * 0.028;
  const screenWidth = width - bezel * 2;
  const innerRadius = screenWidth * 0.15;
  const outerRadius = innerRadius + bezel;

  return (
    <div
      className={clsx("relative flex-none bg-ink shadow-[0_40px_80px_-28px_rgba(22,19,15,.55)]", className)}
      style={{ width, borderRadius: outerRadius, padding: bezel }}
    >
      {/* Side controls */}
      <div className="absolute -left-px top-[23%] h-5.5 w-px rounded-l bg-ink-soft" />
      <div className="absolute -left-px top-[31%] h-9 w-px rounded-l bg-ink-soft" />
      <div className="absolute -left-px top-[42%] h-9 w-px rounded-l bg-ink-soft" />
      <div className="absolute -right-px top-[34%] h-12 w-px rounded-r bg-ink-soft" />

      <div
        className="relative aspect-[1179/2556] w-full overflow-hidden bg-black ring-1 ring-cream/8"
        style={{ borderRadius: innerRadius }}
      >
        <Image src={src} alt={alt} fill className="object-cover" />
        {/* Dynamic island */}
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-full bg-black"
          style={{ top: "1.8%", width: "24%", height: "4.2%" }}
        />
      </div>
    </div>
  );
}
