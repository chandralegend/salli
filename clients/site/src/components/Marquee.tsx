import type { ReactNode } from "react";

/**
 * Infinite horizontal ticker.
 *
 * It used to skew with scroll velocity, driven by a scroll listener feeding a
 * requestAnimationFrame loop. That is a per-frame main-thread cost for an
 * effect nobody can name the purpose of, so the skew is gone and this is a
 * pure CSS animation. The one job left is to say who the product is for while
 * the page changes register between the hero and the argument, which is why
 * there is exactly one marquee on the page.
 */
export function Marquee({ children, seconds = 34 }: { children: ReactNode; seconds?: number }) {
  return (
    <div className="overflow-hidden border-y-2 border-ink bg-ink text-cream">
      <div
        data-marquee
        className="flex whitespace-nowrap"
        style={{ animation: `tick ${seconds}s linear infinite` }}
      >
        {/* Duplicated so the translate to -50% lands on an identical frame. */}
        <MarqueeRow>{children}</MarqueeRow>
        <MarqueeRow aria-hidden="true">{children}</MarqueeRow>
      </div>
    </div>
  );
}

function MarqueeRow({ children, ...rest }: { children: ReactNode; "aria-hidden"?: "true" }) {
  return (
    <div
      className="flex items-center py-3.5 font-display text-[20px] font-bold tracking-[-0.01em]"
      {...rest}
    >
      {children}
    </div>
  );
}

export function MarqueeItem({ children }: { children: ReactNode }) {
  return (
    <>
      <span className="px-6">{children}</span>
      <span className="text-red">◆</span>
    </>
  );
}
