"use client";

import { useRef, type ReactNode, type AnchorHTMLAttributes } from "react";
import { clsx } from "clsx";

/** A button/link that leans toward the cursor within a small radius. */
export function MagneticButton({
  children,
  className,
  strength = 0.28,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
} & AnchorHTMLAttributes<HTMLAnchorElement>) {
  const ref = useRef<HTMLAnchorElement>(null);

  function onMouseMove(e: React.MouseEvent<HTMLAnchorElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const mx = e.clientX - r.left - r.width / 2;
    const my = e.clientY - r.top - r.height / 2;
    el.style.transform = `translate(${mx * strength}px, ${my * (strength + 0.06)}px)`;
  }

  function onMouseLeave() {
    if (ref.current) ref.current.style.transform = "translate(0,0)";
  }

  return (
    <a
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={clsx("transition-transform duration-200 ease-out", className)}
      {...rest}
    >
      {children}
    </a>
  );
}
