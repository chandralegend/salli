"use client";

import { useEffect, useRef } from "react";

type Particle = { x: number; y: number; vx: number; vy: number };

/** Drifting particle network with proximity lines, for the dark "engine" section. */
export function EngineCanvas() {
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
    window.addEventListener("mousemove", onMove);

    let visible = true;
    const io = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
    }, { threshold: 0 });
    io.observe(canvas);

    const N = 54;
    const particles: Particle[] = Array.from({ length: N }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0007,
      vy: (Math.random() - 0.5) * 0.0007,
    }));

    let raf = 0;
    const draw = () => {
      if (visible && width && height) {
        ctx.clearRect(0, 0, width, height);
        for (const p of particles) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > 1) p.vx *= -1;
          if (p.y < 0 || p.y > 1) p.vy *= -1;
        }
        for (let i = 0; i < N; i++) {
          const a = particles[i];
          const ax = a.x * width;
          const ay = a.y * height;
          for (let j = i + 1; j < N; j++) {
            const b = particles[j];
            const bx = b.x * width;
            const by = b.y * height;
            const d = Math.hypot(ax - bx, ay - by);
            if (d < 118) {
              ctx.strokeStyle = `rgba(242,239,230,${0.06 * (1 - d / 118)})`;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(ax, ay);
              ctx.lineTo(bx, by);
              ctx.stroke();
            }
          }
          const acc = Math.hypot(ax - mx, ay - my) < 130;
          ctx.beginPath();
          ctx.arc(ax, ay, acc ? 2.8 : 1.6, 0, 6.283);
          ctx.fillStyle = acc ? "rgba(245,49,15,.85)" : "rgba(242,239,230,.3)";
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-90"
    />
  );
}
