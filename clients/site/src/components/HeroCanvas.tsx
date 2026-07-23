"use client";

import { useEffect, useRef } from "react";

/** Mouse-reactive dot grid, drawn behind the hero section. */
export function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      width = r.width;
      height = r.height;
      canvas.width = Math.max(1, width * dpr);
      canvas.height = Math.max(1, height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    let mx = -999;
    let my = -999;
    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mx = e.clientX - r.left;
      my = e.clientY - r.top;
    };
    const onLeave = () => {
      mx = -999;
      my = -999;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);

    const gap = 40;
    const radius = 150;
    let raf = 0;
    const draw = (t: number) => {
      ctx.clearRect(0, 0, width, height);
      for (let y = gap / 2; y < height; y += gap) {
        for (let x = gap / 2; x < width; x += gap) {
          const dx = x - mx;
          const dy = y - my;
          const d = Math.hypot(dx, dy);
          const drift = Math.sin(t / 1400 + x * 0.02 + y * 0.02) * 1.4;
          let ox = 0;
          let oy = 0;
          let rad = 1.5;
          let a = 0.12;
          let accent = false;
          if (d < radius) {
            const f = 1 - d / radius;
            ox = (dx / (d || 1)) * f * 16;
            oy = (dy / (d || 1)) * f * 16;
            rad = 1.5 + f * 3;
            a = 0.12 + f * 0.5;
            accent = f > 0.35;
          }
          ctx.beginPath();
          ctx.arc(x + ox, y + oy + drift, rad, 0, 6.283);
          ctx.fillStyle = accent ? `rgba(245,49,15,${a})` : `rgba(22,19,15,${a})`;
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full"
    />
  );
}
