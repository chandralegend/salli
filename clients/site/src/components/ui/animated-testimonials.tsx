"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, ArrowRight } from "lucide-react";

export type Testimonial = {
  quote: string;
  name: string;
  designation: string;
  initials: string;
  gradient: string; // CSS gradient for the avatar tile
};

/**
 * Rotating testimonials with a 3D-ish avatar stack on the left and a
 * word-by-word animated quote on the right. Autoplays; arrows step through.
 * Deterministic per-card rotation (no Math.random) so SSR and client agree.
 */
export function AnimatedTestimonials({
  testimonials,
  autoplay = true,
}: {
  testimonials: Testimonial[];
  autoplay?: boolean;
}) {
  const [active, setActive] = useState(0);
  const n = testimonials.length;

  const next = () => setActive((p) => (p + 1) % n);
  const prev = () => setActive((p) => (p - 1 + n) % n);

  useEffect(() => {
    if (!autoplay) return;
    const id = setInterval(next, 5200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoplay, n]);

  const tilt = [-8, 6, -4, 9, -6]; // fixed rotations per stack position

  return (
    <div className="grid md:grid-cols-2 gap-10 md:gap-14 items-center">
      {/* Avatar stack */}
      <div className="relative h-72 w-full max-w-sm mx-auto md:mx-0">
        <AnimatePresence>
          {testimonials.map((t, i) => {
            const isActive = i === active;
            return (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, scale: 0.9, y: 16, rotate: tilt[i % tilt.length] }}
                animate={{
                  opacity: isActive ? 1 : 0.45,
                  scale: isActive ? 1 : 0.92,
                  y: isActive ? 0 : 8,
                  rotate: isActive ? 0 : tilt[i % tilt.length],
                  zIndex: isActive ? 30 : 10 - Math.abs(active - i),
                }}
                transition={{ type: "spring", stiffness: 180, damping: 22 }}
                className="absolute inset-0 origin-bottom"
              >
                <div
                  className="h-full w-full rounded-[28px] ring-1 ring-white/15 overflow-hidden flex flex-col justify-end p-6"
                  style={{ background: t.gradient }}
                >
                  <span className="font-ledger text-[64px] leading-none text-[#010001]/85">{t.initials}</span>
                  <span className="mt-2 text-[13px] font-bold text-[#010001]/70">{t.name}</span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Quote */}
      <div className="flex flex-col">
        <AnimatePresence mode="wait">
          <motion.blockquote
            key={active}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.35 }}
            className="text-[20px] sm:text-[24px] font-medium tracking-[-0.02em] leading-snug text-foreground"
          >
            {testimonials[active].quote.split(" ").map((w, i) => (
              <motion.span
                key={`${active}-${i}`}
                initial={{ opacity: 0, filter: "blur(6px)", y: 6 }}
                animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                transition={{ duration: 0.3, delay: 0.02 * i, ease: "easeOut" }}
                className="inline-block mr-[0.25em]"
              >
                {w}
              </motion.span>
            ))}
          </motion.blockquote>
        </AnimatePresence>

        <div className="mt-6">
          <p className="text-[15px] font-bold text-foreground">{testimonials[active].name}</p>
          <p className="text-[13px] text-muted-foreground">{testimonials[active].designation}</p>
        </div>

        <div className="flex items-center gap-2 mt-8">
          <button onClick={prev} aria-label="Previous" className="size-10 rounded-full bg-white/5 ring-1 ring-white/12 flex items-center justify-center text-foreground hover:bg-white/10 hover:-translate-y-0.5 transition-all">
            <ArrowLeft className="size-4" />
          </button>
          <button onClick={next} aria-label="Next" className="size-10 rounded-full bg-white/5 ring-1 ring-white/12 flex items-center justify-center text-foreground hover:bg-white/10 hover:-translate-y-0.5 transition-all">
            <ArrowRight className="size-4" />
          </button>
          <div className="flex items-center gap-1.5 ml-3">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                aria-label={`Go to testimonial ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${i === active ? "w-6 bg-[#E8FC85]" : "w-1.5 bg-white/20 hover:bg-white/40"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
