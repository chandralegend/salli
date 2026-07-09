"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Soft animated radial "spotlight" wash, recoloured to the Salli palette
 * (lime + mint, never the stock purple). Purely decorative — sits behind
 * hero content with pointer-events disabled.
 */
export function Spotlight({ className }: { className?: string }) {
  return (
    <motion.div
      aria-hidden
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.4, ease: "easeOut" }}
      className={cn("pointer-events-none absolute inset-0 -z-0 overflow-hidden", className)}
    >
      <motion.div
        className="absolute -top-48 -left-24 h-[560px] w-[680px] rounded-full"
        style={{ background: "radial-gradient(closest-side, rgba(232,252,133,0.20), transparent)" }}
        animate={{ x: [0, 60, 0], y: [0, 30, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -top-10 right-[-60px] h-[500px] w-[600px] rounded-full"
        style={{ background: "radial-gradient(closest-side, rgba(165,255,185,0.16), transparent)" }}
        animate={{ x: [0, -50, 0], y: [0, 40, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[-80px] left-1/3 h-[420px] w-[520px] rounded-full"
        style={{ background: "radial-gradient(closest-side, rgba(213,233,234,0.10), transparent)" }}
        animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.div>
  );
}
