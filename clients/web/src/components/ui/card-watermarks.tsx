import { Landmark } from "lucide-react";

// ── Card chrome — contextual icon badges + decorative watermarks (§6, §8) ──────
// Shared across Dashboard, Tax, and Financial Independence so the same metric
// (Net Worth, Savings Rate, Tax Payable, ...) always gets the same treatment
// wherever it appears.

export function IconBadge({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
      {children}
    </div>
  );
}

export function SparklineWatermark() {
  // Anchored flush to the bottom edge with a fading area fill underneath, so
  // it reads as a rooted chart rather than a line floating mid-card.
  const linePath = "M0,52 C20,48 30,38 45,40 C60,42 65,28 80,24 C95,20 105,32 120,26 C135,20 145,4 160,2 C175,0 185,8 200,0";
  const areaPath = `${linePath} L200,64 L0,64 Z`;
  return (
    <svg viewBox="0 0 200 64" preserveAspectRatio="none" className="absolute left-0 right-0 bottom-0 w-full h-20">
      <defs>
        <linearGradient id="sparkline-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.28" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparkline-fade)" stroke="none" />
      <path d={linePath} fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
    </svg>
  );
}

export function BarsWatermark() {
  const heights = [26, 34, 30, 42, 38, 50, 46];
  return (
    <div className="absolute left-0 right-0 bottom-0 h-20 flex items-end gap-[3px] opacity-20">
      {heights.map((h, i) => (
        <div key={i} className="flex-1 rounded-t-[3px] bg-white" style={{ height: h }} />
      ))}
    </div>
  );
}

export function RingWatermark() {
  // Fully inset (no negative offsets) so the ring never gets clipped or
  // distorted by the card's rounded-corner overflow mask.
  const r = 42;
  const circumference = 2 * Math.PI * r;
  const progress = 0.62;
  return (
    <svg viewBox="0 0 120 120" className="absolute right-4 bottom-4 w-28 h-28 opacity-25">
      <circle
        cx="60" cy="60" r={r} fill="none" stroke="white" strokeWidth="10"
        strokeDasharray={`${circumference * progress} ${circumference}`}
        strokeLinecap="round"
        transform="rotate(-90 60 60)"
      />
    </svg>
  );
}

export function LandmarkWatermark() {
  // A single large, low-opacity glyph rather than a chart — the
  // "institutional" mark used on every Tax Payable card.
  return (
    <div className="absolute -right-4 -bottom-4 opacity-[0.14]">
      <Landmark size={128} strokeWidth={1.25} color="#171208" />
    </div>
  );
}
