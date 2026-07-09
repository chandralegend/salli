"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Small upward-trending area sparkline that draws itself in on view.
 * Decorative — represents net-worth growth on the hero bento.
 */
export function Sparkline({
  color = "#010001",
  fill = "rgba(1,0,1,0.08)",
  className,
}: {
  color?: string;
  fill?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const line = "M2 54 L26 48 L50 50 L74 36 L98 40 L122 24 L146 26 L170 10";
  const area = `${line} L170 64 L2 64 Z`;
  return (
    <svg viewBox="0 0 172 66" className={className} fill="none" preserveAspectRatio="none">
      <motion.path
        d={area}
        fill={fill}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.4 }}
      />
      <motion.path
        d={line}
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduce ? undefined : { pathLength: 0 }}
        whileInView={reduce ? undefined : { pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: "easeInOut" }}
      />
      <motion.circle
        cx={170} cy={10} r={4} fill={color}
        initial={{ scale: 0 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.3, delay: 1.2, ease: "backOut" }}
      />
    </svg>
  );
}
