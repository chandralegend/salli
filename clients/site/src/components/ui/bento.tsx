"use client";

import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useMotionTemplate } from "motion/react";
import { cn } from "@/lib/utils";

export function BentoGrid({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-3 auto-rows-[minmax(0,1fr)] gap-3 sm:gap-4", className)}>
      {children}
    </div>
  );
}

/**
 * A bento tile with a cursor-following radial glow (Aceternity-style),
 * tuned to the lime accent. `tone` switches the surface between the brand
 * tiles; `glow` toggles the hover spotlight.
 */
export function BentoCard({
  className,
  children,
  tone = "card",
  glow = true,
  spotlightColor = "rgba(232,252,133,0.5)",
}: {
  className?: string;
  children: ReactNode;
  tone?: "card" | "dark" | "lime" | "mint" | "teal";
  glow?: boolean;
  spotlightColor?: string;
}) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const ref = useRef<HTMLDivElement>(null);

  function onMove(e: React.MouseEvent) {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set(e.clientX - r.left);
    my.set(e.clientY - r.top);
  }

  const toneClass = {
    card: "bg-card ring-1 ring-white/10 text-foreground",
    dark: "bg-[#010001] text-[#F2F1EC] ring-1 ring-white/10",
    lime: "bg-[#E8FC85] text-[#010001]",
    mint: "bg-[#A5FFB9] text-[#010001]",
    teal: "bg-[#D5E9EA] text-[#010001]",
  }[tone];

  const overlay = useMotionTemplate`radial-gradient(220px circle at ${mx}px ${my}px, ${spotlightColor}, transparent 70%)`;

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={cn(
        "group relative overflow-hidden rounded-[26px] p-6 sm:p-7",
        toneClass,
        className,
      )}
    >
      {glow && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: overlay }}
        />
      )}
      <div className="relative z-10 h-full">{children}</div>
    </motion.div>
  );
}
