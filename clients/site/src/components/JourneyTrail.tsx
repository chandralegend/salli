"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, MotionPathPlugin, useGSAP);

// Base camp (bottom-left) → summit. Shared by the drawn line, the dotted map
// underlay, and the hiker's motion path.
const TRAIL =
  "M 84 668 C 236 648, 250 566, 384 548 C 516 530, 516 452, 604 422 " +
  "C 694 392, 704 322, 792 282 C 842 258, 852 206, 858 168";

const MILESTONES = [
  { x: 384, y: 548, at: 0.22, label: "Emergency fund", sub: "3–6 months of runway", flip: false },
  { x: 604, y: 422, at: 0.47, label: "Clear costly debt", sub: "Kill high-interest balances", flip: true },
  { x: 792, y: 282, at: 0.72, label: "Invest the surplus", sub: "Put every spare rupee to work", flip: false },
];

// The unDraw "Hiking" character (Katerina Limpitsouni), recoloured to the brand
// palette — the same hiker from the hero, now climbing the trail. Drawn around
// its own origin so the wrapping group can place its feet on the path.
function Hiker() {
  return (
    <g id="hiker" style={{ opacity: 0 }}>
      <g transform="scale(0.34)">
        <g transform="scale(-1,1)">
          <g transform="translate(-70,-275)">
            <path d="M149.748,201.692l-30.623,2.978a12.544,12.544,0,0,0-11.146,9.781c-.661,3.186.061,6.1,4.574,6.605,0,0-12.825,3.943-7.723,12.688l-5.493,31.39a20.607,20.607,0,0,0,18.452,24.1q.246.022.493.039c7.885.565,21.629-5.936,23.191-13.686l1.67-40.769,6.606-33.128Z" transform="translate(-97.673 -159.317)" fill="#2a2620" />
            <path d="M106.564,240.506h0a5.577,5.577,0,0,0-6.719,3.477c-1.8,4.967-3.8,12.506-1.055,16.1,0,0,3.009,1.618,4.427-3s3.347-16.574,3.347-16.574Z" transform="translate(-97.44 -165.003)" fill="#2a2620" />
            <path d="M134.712,243.092c-8.523-5.041-28.655-3.548-28.855-3.533l-.061-.776c.837-.067,20.581-1.525,29.313,3.638Z" transform="translate(-98.671 -164.744)" fill="#e2d9c6" />
            <path d="M215.755,303.192l-20.329-31.174,12.271-3.151,15.588,29.685a9.284,9.284,0,0,1,5.758,4.285c2.478,4.02,1.789,8.942-1.538,10.992s-8.033.453-10.51-3.567a9.285,9.285,0,0,1-1.24-7.07Z" transform="translate(-111.869 -169.209)" fill="#d8a36b" />
            <path d="M124.8,296.293l-1.793-37.174,12.182,3.481-1.546,33.493a9.284,9.284,0,0,1,2.8,6.607c.107,4.721-2.974,8.62-6.881,8.708s-7.161-3.667-7.268-8.388a9.285,9.285,0,0,1,2.5-6.727Z" transform="translate(-101.101 -167.773)" fill="#d8a36b" />
            <rect width="11.745" height="15.48" transform="translate(92.713 267.553) rotate(180)" fill="#dcab77" />
            <path d="M183.574,497.243a3.841,3.841,0,0,1-1.612-2.7,4.917,4.917,0,0,1,1.663-3.567c.028-.359.394-4.809,1.208-5.606a3.864,3.864,0,0,1,.2-2.843,1.977,1.977,0,0,1,1.535-.837l.03,0,.015.027c.02.035,2,3.477,4.983,3.78,1.709.173,3.42-.706,5.086-2.614.06-.141.531-2.465.834-4l.012-.062,16.243,8.538,9.495,2.627a2.764,2.764,0,0,1,.46,5.155l-4.6,2.212a14.4,14.4,0,0,1-6.2,1.413H187.957A6.972,6.972,0,0,1,183.574,497.243Z" transform="translate(-104.985 -220.525)" fill="#c16b37" />
            <rect width="11.2" height="14.762" transform="translate(43.878 254.959) rotate(-157.505)" fill="#dcab77" />
            <path d="M120.241,472.471a3.663,3.663,0,0,1-.435-2.966,4.689,4.689,0,0,1,2.767-2.536c.156-.306,2.1-4.094,3.11-4.5a3.685,3.685,0,0,1,1.211-2.433,1.885,1.885,0,0,1,1.658-.177l.028.008,0,.029c0,.038.495,3.794,3.011,5.148,1.443.776,3.271.626,5.435-.448.1-.1,1.367-1.978,2.2-3.223l.033-.05,11.2,13.449,7.407,5.779a2.636,2.636,0,0,1-1.475,4.71l-4.862.27a13.731,13.731,0,0,1-5.979-1.018l-22-9.109a6.649,6.649,0,0,1-3.308-2.936Z" transform="translate(-92.151 -214.59)" fill="#c16b37" />
            <path d="M194.426,429.865l-17.353-.49L168.35,388.69l-.952-4.438s-3.8-15.008-10.241-33.1c-2.3-6.5-4.949-13.384-7.883-20.118-11.095-25.509.273-44.472.273-44.472l27.223-2.4,6.5-.574,5,65.486Z" transform="translate(-100.1 -172.23)" fill="#c16b37" />
            <path d="M186.251,349.077,166.336,388.69l-15.939,31.7-14.609-9.38,14.994-43.645s1.946-6.433,4.361-16.205a364.445,364.445,0,0,0,7.56-38.731,54.511,54.511,0,0,1,12.054-28.259l6.5-.574Z" transform="translate(-98.087 -172.23)" fill="#c16b37" />
            <path d="M179.918,201.149l-17.1-1.655-18.4,38.6,5.712,36.424,37.514-3.31s1.9-16.865,5.837-27.249a15.243,15.243,0,0,0-.237-11.341l-13.322-31.469Z" transform="translate(-104.357 -158.994)" fill="#c7baa0" />
            <path d="M161.582,203.624l-2.758-4.137s-7.817-1.262-12.991,9.413-28.538,41.047-28.538,41.047L139.1,266.3l22.482-62.677Z" transform="translate(-100.364 -158.986)" fill="#c7baa0" />
            <path d="M184.108,202.534l1.655-1.1s6.322-.426,7.723,2.383,20.092,51.873,20.092,51.873l-24.921,12.461-4.549-65.614Z" transform="translate(-110.202 -159.275)" fill="#c7baa0" />
            <path d="M162.321,170.64A15.681,15.681,0,1,1,182.7,185.6l-3.031,20.034L164.215,192.76a38.93,38.93,0,0,0,5.129-9.047,15.664,15.664,0,0,1-7.023-13.073Z" transform="translate(-106.994 -152.436)" fill="#d8a36b" />
            <path d="M156.386,190.808s.732,5.556,7.517,5.737l13.762.368s-11.634-28.312-6.85-25.122,17.54-10.182,17.54-10.182l3.764,7.059s8.992-3.256-.973-11.23c0,0-11.891-9.193-24.514-3.673s-10.245,37.043-10.245,37.043Z" transform="translate(-106.094 -152)" fill="#c16b37" />
            <path d="M150.735,203.521s23.439,15.933-4.673,55.294L148.3,276.7s34.231-52.381,11-77.853l-8.567,4.673Z" transform="translate(-104.6 -158.898)" fill="#2a2620" />
          </g>
        </g>
      </g>
    </g>
  );
}

export function JourneyTrail() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set(".trail-line", { drawSVG: "0%" });
        gsap.set(".milestone, #summit-group", { opacity: 0, scale: 0.6, transformOrigin: "50% 50%" });
        gsap.set("#hiker", { opacity: 1 });

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
            motionPath: { path: "#trail", align: "#trail", alignOrigin: [0.5, 0.96], autoRotate: false },
            duration: 1,
          },
          0,
        );

        MILESTONES.forEach((m, i) => {
          tl.to(`#m${i}`, { opacity: 1, scale: 1, ease: "back.out(1.7)", duration: 0.06 }, m.at);
        });
        tl.to("#summit-group", { opacity: 1, scale: 1, ease: "back.out(1.7)", duration: 0.08 }, 0.95);

        gsap.to(".cloud", { x: "+=36", duration: 16, repeat: -1, yoyo: true, ease: "sine.inOut", stagger: 4 });
        gsap.to("#flag", {
          skewX: 10,
          duration: 1.5,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          transformOrigin: "left center",
        });
        gsap.to("#sun", { scale: 1.04, opacity: 0.9, duration: 4, repeat: -1, yoyo: true, ease: "sine.inOut", transformOrigin: "50% 50%" });

        ScrollTrigger.refresh();
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(".trail-line", { drawSVG: "100%" });
        gsap.set(".milestone, #summit-group", { opacity: 1, scale: 1 });
        gsap.set("#hiker", {
          opacity: 1,
          motionPath: { path: "#trail", align: "#trail", alignOrigin: [0.5, 0.96], end: 1 },
        });
      });

      return () => mm.revert();
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} className="journey-sky relative h-[320vh] border-y border-border/60">
      <div className="sticky top-0 h-[100dvh] overflow-hidden flex flex-col">
        <div className="max-w-6xl mx-auto w-full px-5 pt-20 sm:pt-24 text-center shrink-0">
          <p className="text-secondary-label">The climb to freedom</p>
          <h2 className="text-[28px] sm:text-[38px] font-semibold mt-3 text-foreground">
            Every financial goal is one stretch of the same trail.
          </h2>
          <p className="text-[14px] sm:text-[15px] text-muted-foreground mt-3 max-w-xl mx-auto leading-relaxed">
            Salli plots your route, marks each milestone, and shows you exactly where
            you stand on the way up. Keep scrolling to walk it.
          </p>
        </div>

        <div className="relative flex-1 min-h-0">
          <svg viewBox="0 0 1024 720" preserveAspectRatio="xMidYMax meet" className="absolute inset-0 w-full h-full" aria-hidden="true">
            <defs>
              <radialGradient id="sun-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.45" />
                <stop offset="55%" stopColor="var(--primary)" stopOpacity="0.12" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
              </radialGradient>
              {/* unDraw cloud silhouette, normalised to its own origin */}
              <g id="cloud-shape">
                <path
                  d="M957.686,76.271c-26.974-3.646-57.769,10.933-64.76,37.239a23.568,23.568,0,0,0-44.846,2.3l3.088,2.212a406.267,406.267,0,0,0,175.329-.793C1007.735,97.512,984.66,79.917,957.686,76.271Z"
                  transform="translate(-845 -74)"
                />
              </g>
            </defs>

            {/* sun rising behind the summit */}
            <circle cx="840" cy="180" r="190" fill="url(#sun-glow)" />
            <circle id="sun" cx="840" cy="180" r="62" fill="var(--primary)" fillOpacity="0.85" />

            {/* clouds */}
            <use href="#cloud-shape" className="cloud" transform="translate(170 150) scale(0.5)" fill="#efe7d6" />
            <use href="#cloud-shape" className="cloud" transform="translate(560 110) scale(0.62)" fill="#f3ecdd" />
            <use href="#cloud-shape" className="cloud" transform="translate(360 220) scale(0.4)" fill="#efe7d6" />

            {/* far ridge */}
            <path d="M -20 540 C 160 488, 300 516, 440 444 C 560 384, 660 372, 760 408 C 880 450, 960 386, 1044 420 L 1044 740 L -20 740 Z" fill="#e3dac8" />
            {/* mid ridge */}
            <path d="M -20 612 C 180 566, 320 596, 470 506 C 610 424, 700 444, 820 488 C 920 524, 990 470, 1044 498 L 1044 740 L -20 740 Z" fill="#d3c6ac" />
            {/* near ridge with the summit peak */}
            <path d="M -20 720 L 240 612 L 470 540 L 660 410 L 858 150 L 980 388 L 1044 470 L 1044 740 Z" fill="#bfb091" />
            {/* summit snow cap */}
            <path d="M 812 232 L 858 150 L 906 232 L 874 216 L 858 236 L 838 216 Z" fill="#f3ecdd" />

            {/* dotted map route under the drawn trail */}
            <path d={TRAIL} fill="none" stroke="#8a7c63" strokeOpacity="0.35" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="1 12" />
            {/* amber trail, drawn on scroll */}
            <path id="trail" className="trail-line" d={TRAIL} fill="none" stroke="var(--primary)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />

            {/* base camp */}
            <g>
              <circle cx="84" cy="668" r="6" fill="var(--background)" stroke="var(--primary)" strokeWidth="3" />
              <text x="84" y="700" textAnchor="middle" className="font-ledger" fill="var(--foreground)" fillOpacity="0.65" fontSize="15">
                Start where you are
              </text>
            </g>

            {/* milestones */}
            {MILESTONES.map((m, i) => (
              <g id={`m${i}`} key={m.label} className="milestone">
                <circle cx={m.x} cy={m.y} r="7" fill="var(--background)" stroke="var(--primary)" strokeWidth="3" />
                <circle cx={m.x} cy={m.y} r="2.5" fill="var(--primary)" />
                <text x={m.x} y={m.flip ? m.y + 30 : m.y - 26} textAnchor="middle" fill="var(--foreground)" fontSize="17" fontWeight="600">
                  {m.label}
                </text>
                <text x={m.x} y={m.flip ? m.y + 49 : m.y - 8} textAnchor="middle" fill="var(--muted-foreground)" fontSize="13">
                  {m.sub}
                </text>
              </g>
            ))}

            {/* summit flag + label */}
            <g id="summit-group">
              <line x1="858" y1="150" x2="858" y2="108" stroke="var(--foreground)" strokeWidth="3" strokeLinecap="round" />
              <path id="flag" d="M 858 111 L 896 121 L 858 133 Z" fill="var(--primary)" />
              <text x="858" y="86" textAnchor="middle" className="font-ledger" fill="var(--primary)" fontSize="20" fontWeight="600">
                Financial freedom
              </text>
            </g>

            <Hiker />
          </svg>
        </div>
      </div>
    </section>
  );
}
