"use client";

import { useRef, type ReactNode } from "react";
import { clsx } from "clsx";

/** A card that tilts in 3D toward the cursor with a soft radial glare. */
export function TiltCard({ children, className }: { children: ReactNode; className?: string }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const card = cardRef.current;
    const glare = glareRef.current;
    if (!card) return;
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    const rx = (py - 0.5) * -9;
    const ry = (px - 0.5) * 12;
    card.style.transform = `perspective(1100px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
    if (glare) {
      glare.style.background = `radial-gradient(circle at ${px * 100}% ${py * 100}%, rgba(255,255,255,.4), rgba(255,255,255,0) 46%)`;
      glare.style.opacity = "1";
    }
  }

  function onMouseLeave() {
    if (cardRef.current) cardRef.current.style.transform = "perspective(1100px) rotateX(0) rotateY(0)";
    if (glareRef.current) glareRef.current.style.opacity = "0";
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={clsx("relative cursor-pointer transition-transform duration-200", className)}
    >
      <div ref={glareRef} className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-200" />
      {children}
    </div>
  );
}
