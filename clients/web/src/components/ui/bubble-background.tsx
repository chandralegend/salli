"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";
import { useMotionValue, useSpring, motion } from "motion/react";

type BubbleColors = {
  first?: string;
  second?: string;
  third?: string;
  fourth?: string;
  fifth?: string;
  sixth?: string;
};

type SpringOptions = {
  stiffness?: number;
  damping?: number;
};

interface BubbleBackgroundProps extends React.ComponentProps<"div"> {
  interactive?: boolean;
  transition?: SpringOptions;
  colors?: BubbleColors;
}

const DEFAULTS: Required<BubbleColors> = {
  first:  "18,113,255",
  second: "221,74,255",
  third:  "0,220,255",
  fourth: "200,50,50",
  fifth:  "180,180,50",
  sixth:  "140,100,255",
};

export function BubbleBackground({
  interactive = false,
  transition = { stiffness: 100, damping: 20 },
  colors,
  className,
  children,
  style,
  ...props
}: BubbleBackgroundProps) {
  const c = { ...DEFAULTS, ...colors };
  const containerRef = useRef<HTMLDivElement>(null);

  const curX = useMotionValue(0);
  const curY = useMotionValue(0);
  const tgX = useSpring(curX, transition);
  const tgY = useSpring(curY, transition);

  useEffect(() => {
    if (!interactive) return;
    const el = containerRef.current;
    if (!el) return;
    function onMove(e: MouseEvent) {
      const r = el!.getBoundingClientRect();
      curX.set(e.clientX - r.left - r.width / 2);
      curY.set(e.clientY - r.top - r.height / 2);
    }
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, [interactive, curX, curY]);

  const blob = (
    color: string,
    animation: string,
    size = "80%",
    origin = "center center",
  ) => ({
    position: "absolute" as const,
    background: `radial-gradient(circle at center, rgba(${color},0.8) 0%, rgba(${color},0) 50%) no-repeat center center`,
    mixBlendMode: "hard-light" as const,
    width: size,
    height: size,
    top: `calc(50% - ${parseInt(size) / 2}%)`,
    left: `calc(50% - ${parseInt(size) / 2}%)`,
    animation,
    transformOrigin: origin,
  });

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden", className)}
      style={style}
      {...props}
    >
      {/* Blurred blobs layer — z-index 0, no pointer events */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          filter: "blur(40px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <div style={blob(c.first,  "bubble-move-vertical   30s ease infinite")} />
        <div style={blob(c.second, "bubble-move-circle     20s reverse infinite", "60%", "calc(50% - 400px)")} />
        <div style={blob(c.third,  "bubble-move-circle     40s linear  infinite", "80%", "calc(50% + 400px)")} />
        <div style={blob(c.fourth, "bubble-move-horizontal 40s ease    infinite", "80%", "calc(50% - 200px)")} />
        <div style={blob(c.fifth,  "bubble-move-circle     20s ease    infinite", "60%", "calc(50% - 800px)")} />
        <div style={blob(c.sixth,  "bubble-move-vertical   25s ease    infinite", "80%", "calc(50% + 200px)")} />

        {/* Interactive blob that follows the mouse */}
        {interactive && (
          <motion.div
            style={{
              ...blob(c.first, "none", "80%"),
              x: tgX,
              y: tgY,
            }}
          />
        )}
      </div>

      {children}
    </div>
  );
}
