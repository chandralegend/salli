"use client";

import { useRef, type ReactNode } from "react";
import {
  motion, useMotionValue, useSpring, useTransform, useMotionTemplate,
} from "motion/react";
import { cn } from "@/lib/utils";

/**
 * A perspective 3D tilt card (à la Perplexity Comet). The card rotates toward
 * the cursor with a spring, lifts slightly, and a soft glare follows the
 * pointer. `rotateDepth`/`translateDepth` control intensity.
 */
export function CometCard({
  children,
  className,
  rotateDepth = 14,
  translateDepth = 14,
}: {
  children: ReactNode;
  className?: string;
  rotateDepth?: number;
  translateDepth?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // normalised pointer position, -0.5 … 0.5
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  // pixel position for the glare
  const gx = useMotionValue(50);
  const gy = useMotionValue(50);

  const spring = { stiffness: 280, damping: 26, mass: 0.6 };
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [rotateDepth, -rotateDepth]), spring);
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-rotateDepth, rotateDepth]), spring);
  const tX = useSpring(useTransform(px, [-0.5, 0.5], [-translateDepth, translateDepth]), spring);
  const tY = useSpring(useTransform(py, [-0.5, 0.5], [-translateDepth, translateDepth]), spring);

  const glare = useMotionTemplate`radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,0.18), transparent 45%)`;

  function onMove(e: React.MouseEvent) {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const nx = (e.clientX - r.left) / r.width;
    const ny = (e.clientY - r.top) / r.height;
    px.set(nx - 0.5);
    py.set(ny - 0.5);
    gx.set(nx * 100);
    gy.set(ny * 100);
  }
  function onLeave() {
    px.set(0); py.set(0); gx.set(50); gy.set(50);
  }

  return (
    <div className={cn("[perspective:1400px]", className)}>
      <motion.div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{ rotateX, rotateY, x: tX, y: tY, transformStyle: "preserve-3d" }}
        whileHover={{ scale: 1.015 }}
        transition={{ type: "spring", ...spring }}
        className="group relative h-full w-full"
      >
        {children}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[26px] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: glare }}
        />
      </motion.div>
    </div>
  );
}
