"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const APP = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.salli.lk";

function Logo({ className = "size-8" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src="/salli-logo.png"
      alt="Salli"
      width={256}
      height={256}
      className={`${className} rounded-lg object-cover`}
    />
  );
}

/**
 * Sticky top nav. Past the hero it gains a hairline shadow so it reads as a
 * floating bar rather than part of the page — a small state cue, nothing more.
 */
export function SiteNav() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      ScrollTrigger.create({
        start: "top -64",
        toggleClass: { targets: ref.current!, className: "nav-scrolled" },
      });
    },
    { scope: ref },
  );

  return (
    <header
      ref={ref}
      className="sticky top-0 z-30 backdrop-blur-sm bg-background/80 border-b border-border/60 transition-shadow"
    >
      <nav className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
        <a href="#top" className="flex items-center gap-2.5">
          <Logo className="size-7" />
          <span className="font-semibold tracking-tight">Salli</span>
        </a>
        <div className="hidden sm:flex items-center gap-7 text-[13px] text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`${APP}/login`}
            className="text-[13px] px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign in
          </a>
          <a
            href={`${APP}/signup`}
            className="text-[13px] font-medium px-3.5 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Get started
          </a>
        </div>
      </nav>
    </header>
  );
}
