"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Faint animated grid that drifts diagonally — used inside dark "vault"
 * sections. A lime radial fades the grid out toward the edges so it never
 * competes with content.
 */
export function GridBackground({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      <motion.div
        className="absolute inset-[-100%]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(232,252,133,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(232,252,133,0.07) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse 60% 60% at 50% 40%, black, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 60% 60% at 50% 40%, black, transparent 75%)",
        }}
        animate={reduce ? undefined : { backgroundPosition: ["0px 0px", "44px 44px"] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}
