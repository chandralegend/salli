"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const SCORE = 62;
const SAVINGS_RATE = 51;

/**
 * The FI-score mock card. When it scrolls into view the score counts up from 0,
 * the progress bar fills, and the savings-rate figure ticks up — the one
 * "this is computed, live" moment on the page. Bar fill uses scaleX (transform)
 * rather than width so it stays on the compositor thread.
 */
export function FiScoreCard() {
  const ref = useRef<HTMLDivElement>(null);
  const scoreRef = useRef<HTMLParagraphElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const srRef = useRef<HTMLParagraphElement>(null);

  useGSAP(
    () => {
      const setFinal = () => {
        if (scoreRef.current) scoreRef.current.textContent = String(SCORE);
        if (srRef.current) srRef.current.textContent = `${SAVINGS_RATE}%`;
        if (barRef.current) barRef.current.style.transform = "scaleX(1)";
      };

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const score = { v: 0 };
        const sr = { v: 0 };
        const tl = gsap.timeline({
          scrollTrigger: { trigger: ref.current, start: "top 75%", once: true },
        });
        tl.from(ref.current, { opacity: 0, y: 28, duration: 0.6, ease: "power2.out" })
          .to(
            score,
            {
              v: SCORE,
              duration: 1.1,
              ease: "power1.out",
              onUpdate: () => {
                if (scoreRef.current) scoreRef.current.textContent = String(Math.round(score.v));
              },
            },
            "<0.1",
          )
          .fromTo(
            barRef.current,
            { scaleX: 0 },
            { scaleX: 1, duration: 1.1, ease: "power1.out" },
            "<",
          )
          .to(
            sr,
            {
              v: SAVINGS_RATE,
              duration: 0.9,
              ease: "power1.out",
              onUpdate: () => {
                if (srRef.current) srRef.current.textContent = `${Math.round(sr.v)}%`;
              },
            },
            "<0.2",
          );
      });

      mm.add("(prefers-reduced-motion: reduce)", setFinal);

      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className="rounded-2xl bg-white/[0.04] ring-1 ring-white/10 p-8 text-center">
      <p className="text-secondary-label text-ink-foreground/40">Your FI score</p>
      <p ref={scoreRef} className="font-ledger text-[72px] leading-none mt-3 text-primary tabular-nums">
        0
      </p>
      <p className="text-[13px] text-ink-foreground/60 mt-1">On track</p>
      <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden mt-5">
        <div
          ref={barRef}
          className="h-full origin-left rounded-full bg-primary"
          style={{ width: `${SCORE}%`, transform: "scaleX(0)" }}
        />
      </div>
      <div className="grid grid-cols-2 gap-4 mt-6 text-left">
        <div>
          <p className="text-secondary-label text-ink-foreground/40">Savings rate</p>
          <p ref={srRef} className="font-ledger text-[18px] mt-1 tabular-nums">0%</p>
        </div>
        <div>
          <p className="text-secondary-label text-ink-foreground/40">Projected FI</p>
          <p className="font-ledger text-[18px] mt-1">2041</p>
        </div>
      </div>
    </div>
  );
}
