"use client";

import { useRef, type ReactNode } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Aceternity's "Container Scroll Animation": a 3D-tilted panel that flattens
 * and scales up to full size as the section scrolls into view, revealing
 * `children` inside a browser-chrome frame. `titleComponent` sits above it and
 * translates upward slightly for parallax.
 */
export function ContainerScroll({
  titleComponent,
  children,
  className,
}: {
  titleComponent: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center center"],
  });

  const rotateX = useTransform(scrollYProgress, [0, 1], [20, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.88, 1]);
  const translateY = useTransform(scrollYProgress, [0, 1], [40, 0]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.4], [0.5, 1]);

  return (
    <div ref={ref} className={cn("relative flex flex-col items-center", className)} style={{ perspective: "1200px" }}>
      <motion.div style={{ opacity: titleOpacity }} className="text-center mb-10">
        {titleComponent}
      </motion.div>

      <motion.div
        style={{ rotateX, scale, translateY, transformStyle: "preserve-3d" }}
        className="w-full max-w-5xl rounded-2xl overflow-hidden ring-1 ring-white/12 shadow-[0_60px_140px_-40px_rgba(0,0,0,0.65)] bg-[#101210]"
      >
        {/* Browser chrome */}
        <div className="flex items-center gap-1.5 px-4 py-3 bg-[#171916] border-b border-white/8">
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="size-2.5 rounded-full bg-white/15" />
        </div>
        <div className="bg-white">{children}</div>
      </motion.div>
    </div>
  );
}
