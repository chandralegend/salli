"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  /** Distance (px) the content rises from. */
  y?: number;
  /** Delay before the reveal starts (s). */
  delay?: number;
  /**
   * When set, the direct children are revealed one after another with this
   * gap (s) between them — used for the hero's eyebrow → headline → CTA sequence.
   */
  stagger?: number;
  /** Where in the viewport the reveal fires. */
  start?: string;
};

/**
 * Reveals content as it scrolls into view (rise + fade), once.
 * Honours prefers-reduced-motion: with reduced motion the content renders in
 * place, and if JS never runs the markup is visible by default (we only hide it
 * once GSAP is confirmed running).
 */
export function Reveal({
  children,
  className,
  y = 24,
  delay = 0,
  stagger,
  start = "top 85%",
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const targets = stagger
          ? gsap.utils.toArray<HTMLElement>(ref.current!.children)
          : ref.current;

        gsap.set(targets, { opacity: 0, y });

        let played = false;
        const play = () => {
          if (played) return;
          played = true;
          gsap.to(targets, {
            opacity: 1,
            y: 0,
            duration: 0.7,
            delay,
            ease: "power2.out",
            stagger: stagger ?? 0,
            overwrite: "auto",
          });
        };

        ScrollTrigger.create({
          trigger: ref.current,
          start,
          once: true,
          onEnter: play,
          // Fire immediately for anything already above the start line on load
          // (e.g. the hero), which onEnter alone can miss after a refresh.
          onRefresh: (self) => {
            if (self.progress > 0) play();
          },
        });

        ScrollTrigger.refresh();
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return <div ref={ref} className={className}>{children}</div>;
}
