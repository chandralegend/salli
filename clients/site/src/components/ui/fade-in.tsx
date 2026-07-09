"use client";

import { type ReactNode } from "react";
import { motion } from "motion/react";

/**
 * Fades + rises content into view once. Use `delay` to stagger siblings.
 * Honours prefers-reduced-motion automatically (motion respects the OS setting
 * for transform/opacity transitions).
 */
export function FadeIn({
  children,
  className,
  delay = 0,
  y = 22,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-12% 0px" }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
