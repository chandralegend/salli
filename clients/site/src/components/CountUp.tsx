"use client";

import { useEffect, useRef, useState } from "react";

/** Animates a number up from 0 once it scrolls into view. */
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
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let started = false;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !started) {
            started = true;
            const t0 = performance.now();
            const dur = 1300;
            const step = (t: number) => {
              let p = Math.min(1, (t - t0) / dur);
              p = 1 - Math.pow(1 - p, 3);
              setValue(target * p);
              if (p < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [target]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}
