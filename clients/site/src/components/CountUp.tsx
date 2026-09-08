"use client";

import { useEffect, useState } from "react";

import { useInView } from "@/lib/useInView";

/** Animates a number up from zero the first time it scrolls into view. */
export function CountUp({
  target,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
}: {
  target: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const { ref, inView, reduced } = useInView<HTMLSpanElement>(0.5);
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView || reduced) return;
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / 1300);
      setValue(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduced, target]);

  // The figure is the point, not the counting. Under reduced motion the final
  // value is derived during render rather than pushed through the animation,
  // so the number is never left sitting at zero.
  const shown = reduced ? target : value;

  return (
    <span ref={ref} className={className}>
      {prefix}
      {shown.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}
