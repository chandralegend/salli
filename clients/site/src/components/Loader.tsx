"use client";

import { useEffect, useRef, useState } from "react";

/** Full-screen intro loader that counts to 100 then slides up and unmounts. */
export function Loader() {
  const barRef = useRef<HTMLDivElement>(null);
  const [num, setNum] = useState("000");
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t0 = performance.now();
    const dur = 1150;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 2);
      if (barRef.current) barRef.current.style.width = `${(e * 100).toFixed(1)}%`;
      setNum(String(Math.round(e * 100)).padStart(3, "0"));
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setLeaving(true);
        setTimeout(() => setGone(true), 750);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (gone) return null;

  return (
    <div
      className="fixed inset-0 z-200 flex flex-col items-center justify-center gap-8.5 bg-ink text-cream transition-transform duration-700 ease-[cubic-bezier(.76,0,.24,1)]"
      style={{ transform: leaving ? "translateY(-101%)" : "translateY(0)" }}
    >
      <div className="font-display text-[clamp(64px,13vw,190px)] font-extrabold leading-[0.9] tracking-[-0.05em]">
        Salli<span className="text-red">.</span>
      </div>
      <div className="h-1 w-[min(320px,64vw)] overflow-hidden rounded-full bg-cream/18">
        <div ref={barRef} className="h-full w-0 rounded-full bg-red" />
      </div>
      <div className="font-mono text-[13px] tracking-[.2em] text-ink-40">{num}</div>
    </div>
  );
}
