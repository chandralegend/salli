import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * A hand-drawn iPhone-style bezel (Aceternity has no named "phone mockup") —
 * dark frame, notch, side buttons — clipping a screenshot to its rounded screen.
 */
export function PhoneFrame({
  src,
  alt,
  className,
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={cn("relative w-[240px] sm:w-[270px] aspect-[9/19.5]", className)}>
      {/* Side buttons */}
      <span className="absolute -left-[3px] top-[22%] w-[3px] h-8 rounded-l bg-[#0A0B0A]" />
      <span className="absolute -left-[3px] top-[32%] w-[3px] h-14 rounded-l bg-[#0A0B0A]" />
      <span className="absolute -right-[3px] top-[26%] w-[3px] h-16 rounded-r bg-[#0A0B0A]" />

      {/* Bezel */}
      <div className="absolute inset-0 rounded-[2.6rem] bg-[#0A0B0A] ring-1 ring-white/12 shadow-[0_50px_100px_-30px_rgba(0,0,0,0.7)] p-[18px]">
        <div className="relative w-full h-full rounded-[1.6rem] overflow-hidden bg-white">
          <Image src={src} alt={alt} fill priority={priority} className="object-cover object-top scale-[0.94]" sizes="270px" />
        </div>
        {/* Notch */}
        <div className="absolute top-[18px] left-1/2 -translate-x-1/2 w-[36%] h-[20px] rounded-b-2xl bg-[#0A0B0A] z-10" />
      </div>
    </div>
  );
}
