"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, MotionPathPlugin, useGSAP);

// The route, bottom-left base camp → summit. Shared by the drawn line, the
// faint "map" underlay, and the hiker's motion path.
const TRAIL =
  "M 70 668 C 230 648, 232 566, 372 548 C 512 530, 512 452, 596 432 " +
  "C 700 407, 700 330, 800 300 C 884 274, 902 206, 948 132";

const MILESTONES = [
  { x: 372, y: 548, at: 0.2, label: "Emergency fund", sub: "3–6 months of runway", flip: false },
  { x: 596, y: 432, at: 0.45, label: "Clear costly debt", sub: "Kill high-interest balances", flip: true },
  { x: 800, y: 300, at: 0.7, label: "Invest the surplus", sub: "Put every spare rupee to work", flip: false },
];

export function JourneyTrail() {
  const sectionRef = useRef<HTMLElement>(null);
  const sceneRef = useRef<SVGSVGElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      const finalState = () => {
        gsap.set(".trail-line", { drawSVG: "100%" });
        gsap.set(".milestone, #summit-group", { opacity: 1, scale: 1 });
        gsap.set("#hiker", {
          opacity: 1,
          motionPath: { path: "#trail", align: "#trail", alignOrigin: [0.5, 0.92], end: 1 },
        });
      };

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set(".trail-line", { drawSVG: "0%" });
        gsap.set(".milestone, #summit-group", { opacity: 0, scale: 0.6, transformOrigin: "50% 50%" });
        gsap.set("#hiker", { opacity: 1, transformOrigin: "50% 50%" });

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: "bottom bottom",
            scrub: 1,
          },
        });

        tl.to(".trail-line", { drawSVG: "100%", duration: 1 }, 0).to(
          "#hiker",
          {
            motionPath: { path: "#trail", align: "#trail", alignOrigin: [0.5, 0.92], autoRotate: false },
            duration: 1,
          },
          0,
        );

        MILESTONES.forEach((m, i) => {
          tl.to(`#m${i}`, { opacity: 1, scale: 1, ease: "back.out(1.7)", duration: 0.06 }, m.at);
        });
        tl.to("#summit-group", { opacity: 1, scale: 1, ease: "back.out(1.7)", duration: 0.08 }, 0.94);

        // Ambient drift, independent of scroll.
        gsap.to(".cloud", {
          x: "+=34",
          duration: 14,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          stagger: 3,
        });
        gsap.to("#flag", {
          skewX: 10,
          duration: 1.4,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          transformOrigin: "left center",
        });

        ScrollTrigger.refresh();
      });

      mm.add("(prefers-reduced-motion: reduce)", finalState);

      return () => mm.revert();
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} className="ledger-cover relative h-[320vh]">
      <div className="sticky top-0 h-[100dvh] overflow-hidden flex flex-col">
        {/* heading */}
        <div className="max-w-6xl mx-auto w-full px-5 pt-20 sm:pt-24 text-center shrink-0">
          <p className="text-secondary-label text-ink-foreground/50">The climb to freedom</p>
          <h2 className="text-[28px] sm:text-[38px] font-semibold mt-3 text-ink-foreground">
            Every financial goal is one stretch of the same trail.
          </h2>
          <p className="text-[14px] sm:text-[15px] text-ink-foreground/60 mt-3 max-w-xl mx-auto leading-relaxed">
            Salli plots your route, marks each milestone, and shows you exactly where
            you stand on the way up. Keep scrolling to walk it.
          </p>
        </div>

        {/* the map */}
        <div className="relative flex-1 min-h-0">
          <svg
            ref={sceneRef}
            viewBox="0 0 1024 720"
            preserveAspectRatio="xMidYMax meet"
            className="absolute inset-0 w-full h-full"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="ridge-back" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--ink-foreground)" stopOpacity="0.10" />
                <stop offset="1" stopColor="var(--ink-foreground)" stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id="ridge-front" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--ink-foreground)" stopOpacity="0.18" />
                <stop offset="1" stopColor="var(--ink-foreground)" stopOpacity="0.04" />
              </linearGradient>
            </defs>

            {/* faint topographic contour lines */}
            <g stroke="var(--ink-foreground)" strokeOpacity="0.06" fill="none" strokeWidth="1.5">
              <path d="M 60 470 C 260 430, 520 460, 760 360 S 980 250, 1010 220" />
              <path d="M 80 540 C 280 500, 540 525, 780 430 S 1000 320, 1024 300" />
              <path d="M 120 610 C 320 575, 560 595, 800 505 S 1010 400, 1024 380" />
            </g>

            {/* clouds */}
            <g fill="var(--ink-foreground)" fillOpacity="0.08">
              <g className="cloud">
                <ellipse cx="250" cy="180" rx="58" ry="20" />
                <ellipse cx="300" cy="168" rx="42" ry="22" />
              </g>
              <g className="cloud">
                <ellipse cx="720" cy="120" rx="64" ry="20" />
                <ellipse cx="770" cy="110" rx="40" ry="20" />
              </g>
            </g>

            {/* mountains */}
            <path d="M -20 720 L 280 300 L 470 520 L 720 230 L 1044 720 Z" fill="url(#ridge-back)" />
            <path
              d="M -20 720 L 360 380 L 600 540 L 948 132 L 1044 720 Z"
              fill="url(#ridge-front)"
              stroke="var(--ink-foreground)"
              strokeOpacity="0.18"
              strokeWidth="1.5"
            />
            {/* summit snow cap */}
            <path d="M 900 200 L 948 132 L 996 200 L 966 188 L 948 205 L 928 188 Z" fill="var(--ink-foreground)" fillOpacity="0.4" />

            {/* faint dotted "map" route under the drawn trail */}
            <path
              d={TRAIL}
              fill="none"
              stroke="var(--ink-foreground)"
              strokeOpacity="0.2"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="1 12"
            />
            {/* the amber trail that draws on scroll */}
            <path
              id="trail"
              className="trail-line"
              d={TRAIL}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* base camp marker */}
            <g>
              <circle cx="70" cy="668" r="6" fill="var(--ink)" stroke="var(--primary)" strokeWidth="3" />
              <text x="70" y="700" textAnchor="middle" className="font-ledger" fill="var(--ink-foreground)" fillOpacity="0.7" fontSize="15">
                Start where you are
              </text>
            </g>

            {/* milestones */}
            {MILESTONES.map((m, i) => (
              <g id={`m${i}`} key={m.label} className="milestone">
                <circle cx={m.x} cy={m.y} r="7" fill="var(--ink)" stroke="var(--primary)" strokeWidth="3" />
                <circle cx={m.x} cy={m.y} r="2.5" fill="var(--primary)" />
                <text
                  x={m.x}
                  y={m.flip ? m.y + 30 : m.y - 26}
                  textAnchor="middle"
                  fill="var(--ink-foreground)"
                  fontSize="17"
                  fontWeight="600"
                >
                  {m.label}
                </text>
                <text
                  x={m.x}
                  y={m.flip ? m.y + 49 : m.y - 8}
                  textAnchor="middle"
                  fill="var(--ink-foreground)"
                  fillOpacity="0.55"
                  fontSize="13"
                >
                  {m.sub}
                </text>
              </g>
            ))}

            {/* summit: flag + label */}
            <g id="summit-group">
              <line x1="948" y1="132" x2="948" y2="92" stroke="var(--ink-foreground)" strokeWidth="3" strokeLinecap="round" />
              <path id="flag" d="M 948 95 L 984 104 L 948 116 Z" fill="var(--primary)" />
              <text x="948" y="70" textAnchor="middle" className="font-ledger" fill="var(--primary)" fontSize="20" fontWeight="600">
                Financial freedom
              </text>
            </g>

            {/* the hiker */}
            <g id="hiker" stroke="var(--ink-foreground)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
              <path d="M -3 -16 q -9 1 -8 9" strokeWidth="6" strokeOpacity="0.9" />
              <circle cx="0" cy="-22" r="4.5" fill="var(--ink-foreground)" stroke="none" />
              <path d="M 0 -17 L 0 -5" />
              <path d="M 0 -13 L 9 -9 L 12 2" />
              <path d="M 0 -13 L -7 -8" />
              <path d="M 0 -5 L -6 5" />
              <path d="M 0 -5 L 7 4" />
            </g>
          </svg>
        </div>
      </div>
    </section>
  );
}
