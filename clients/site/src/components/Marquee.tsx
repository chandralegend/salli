"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Infinite horizontal ticker that skews slightly with scroll velocity. */
export function Marquee({ children, seconds = 32 }: { children: ReactNode; seconds?: number }) {
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;
    let lastY = window.scrollY;
    let target = 0;
    let skew = 0;
    let raf = 0;

    const onScroll = () => {
      const v = window.scrollY - lastY;
      lastY = window.scrollY;
      target = Math.max(-16, Math.min(16, v * 0.5));
    };
    const loop = () => {
      skew += (target - skew) * 0.12;
      target *= 0.86;
      inner.style.transform = `skewX(${skew.toFixed(2)}deg)`;
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="overflow-hidden border-y-2 border-ink bg-ink text-cream">
      <div
        ref={innerRef}
        className="flex whitespace-nowrap"
        style={{ animation: `tick ${seconds}s linear infinite` }}
      >
        <MarqueeRow>{children}</MarqueeRow>
        <MarqueeRow>{children}</MarqueeRow>
      </div>
    </div>
  );
}

function MarqueeRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center py-4 font-display text-[22px] font-bold tracking-[-0.01em]">
      {children}
    </div>
  );
}

export function MarqueeItem({ children }: { children: ReactNode }) {
  return (
    <>
      <span className="px-6.5">{children}</span>
      <span className="text-red">◆</span>
    </>
  );
}
