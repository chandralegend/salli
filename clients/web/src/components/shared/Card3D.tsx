"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Max tilt on each axis, in degrees, at the card's edges. */
const MAX_TILT = 8;
/** Slight lift so the card reads as picked up off the page while hovered. */
const HOVER_SCALE = 1.015;
/** Peak alpha of the specular streak that tracks the pointer. */
const SHINE_ALPHA = 0.14;

/**
 * Credit-card surface with a pointer-driven 3D tilt and a specular sheen that
 * follows the cursor — the aesthetic of a physical card held up to the light.
 *
 * Tilt is mouse-only and opt-out under `prefers-reduced-motion`: on touch it
 * would fight the scroll gesture, and the sheen alone still carries the look.
 * Pointer values are written straight to the DOM inside a rAF rather than held
 * in state, so dragging across the card doesn't re-render the React tree.
 */
export function Card3D({
  id,
  className,
  contentClassName,
  children,
}: {
  id?: string;
  /** Outer wrapper — put grid/layout classes here. */
  className?: string;
  /** Inner padding/layout for the card face. */
  contentClassName?: string;
  children: React.ReactNode;
}) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const tiltRef = React.useRef<HTMLDivElement>(null);
  const shineRef = React.useRef<HTMLDivElement>(null);
  const frameRef = React.useRef<number | null>(null);

  const cancelFrame = () => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  };

  const reset = React.useCallback(() => {
    cancelFrame();
    const tilt = tiltRef.current;
    const shine = shineRef.current;
    if (tilt) tilt.style.transform = "rotateX(0deg) rotateY(0deg) scale(1)";
    if (shine) shine.style.opacity = "0";
  }, []);

  React.useEffect(() => reset, [reset]);

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const root = rootRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    // Pointer position within the card, 0→1 on each axis.
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    // Re-centred to -0.5→0.5 so the card sits flat under the middle.
    const cx = px - 0.5;
    const cy = py - 0.5;

    cancelFrame();
    frameRef.current = requestAnimationFrame(() => {
      const tilt = tiltRef.current;
      const shine = shineRef.current;
      if (tilt) {
        // CSS rotateX(+) brings the bottom edge forward and rotateY(+) pushes the
        // right edge back, so these signs lift the edge nearest the pointer —
        // the card tips up to meet the cursor, as in the reference component.
        tilt.style.transform =
          `rotateX(${(cy * 2 * MAX_TILT).toFixed(2)}deg) ` +
          `rotateY(${(-cx * 2 * MAX_TILT).toFixed(2)}deg) ` +
          `scale(${HOVER_SCALE})`;
      }
      if (shine) {
        // Sweep the highlight's gradient angle around the pointer, and fade it
        // as the pointer drops down the card — same idea as a real card's glare.
        const angle = (Math.atan2(cy, cx) * 180) / Math.PI + 90;
        const alpha = (1 - py) * SHINE_ALPHA + 0.03;
        shine.style.background = `linear-gradient(${angle.toFixed(
          1
        )}deg, rgba(255,255,255,${alpha.toFixed(3)}) 0%, rgba(255,255,255,0) 72%)`;
        shine.style.opacity = "1";
      }
    });
  }

  return (
    <div
      id={id}
      ref={rootRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={reset}
      className={cn("group/card3d [perspective:1100px]", className)}
    >
      <div
        ref={tiltRef}
        style={{ transform: "rotateX(0deg) rotateY(0deg) scale(1)" }}
        className={cn(
          "relative h-full overflow-hidden rounded-2xl border border-white/10",
          "bg-[var(--emphasis)] text-white",
          "shadow-[0_8px_24px_-12px_rgba(0,0,0,0.55)]",
          "transition-[transform,box-shadow] duration-200 ease-out [transform-style:preserve-3d] will-change-transform",
          "group-hover/card3d:shadow-[0_28px_60px_-20px_rgba(0,0,0,0.6)]"
        )}
      >
        {/* Card face: a fixed diagonal gloss plus a warm brand glow bottom-right. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.10)_0%,rgba(255,255,255,0)_44%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-16 -right-10 size-52 rounded-full bg-primary/20 blur-3xl"
        />
        {/* Specular streak — position/angle driven by the pointer. */}
        <div
          ref={shineRef}
          aria-hidden
          style={{ opacity: 0 }}
          className="pointer-events-none absolute inset-0 transition-opacity duration-200 ease-out"
        />
        <div className={cn("relative", contentClassName)}>{children}</div>
      </div>
    </div>
  );
}
