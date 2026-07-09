"use client";

import { useState } from "react";
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from "motion/react";
import { Menu, X } from "lucide-react";

const APP = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.salli.lk";

function Logo({ className = "size-7" }: { className?: string }) {
  // Sinhala rupee glyph "රු" — lime badge (pops on the dark site).
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label="Salli">
      <rect width="100" height="100" rx="26" fill="#E8FC85" />
      <text x="50" y="54" textAnchor="middle" dominantBaseline="central" fontSize="46" fontWeight="900" fill="#010001" style={{ letterSpacing: "-0.05em" }}>රු</text>
    </svg>
  );
}

const LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#features" },
  { label: "Pricing", href: "#pricing" },
];

/**
 * Floating navbar that contracts on scroll: full-width and transparent at the
 * top, then collapses into a solid, blurred, rounded pill as you scroll down.
 */
export function Navbar() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 40));

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex justify-center px-4">
      <motion.nav
        initial={false}
        animate={{
          width: scrolled ? "min(46rem, 100%)" : "min(72rem, 100%)",
          marginTop: scrolled ? 12 : 0,
          borderRadius: scrolled ? 999 : 0,
        }}
        transition={{ type: "spring", stiffness: 240, damping: 28 }}
        className={[
          "relative flex items-center justify-between gap-4 px-4 sm:px-5 h-14",
          scrolled
            ? "bg-[#101210]/80 backdrop-blur-xl ring-1 ring-white/10 shadow-[0_12px_40px_-20px_rgba(0,0,0,0.9)]"
            : "bg-transparent",
        ].join(" ")}
      >
        <a href="#top" className="flex items-center gap-2.5 shrink-0">
          <Logo className="size-7" />
          <span className="font-bold tracking-tight text-foreground">Salli</span>
        </a>

        <div className="hidden md:flex items-center gap-1 text-[13px]">
          {LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="px-3 py-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2 shrink-0">
          <a href={`${APP}/login`} className="text-[13px] px-3.5 py-2 rounded-full text-muted-foreground hover:text-foreground transition-colors">
            Sign in
          </a>
          <a href={`${APP}/signup`} className="text-[13px] font-bold px-4 py-2 rounded-full bg-[#E8FC85] text-[#010001] hover:brightness-95 transition-all">
            Get started
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen((o) => !o)}
          className="md:hidden p-2 -mr-1 rounded-full text-foreground hover:bg-white/5 transition-colors"
          aria-label="Menu"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>

        {/* Mobile sheet */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="md:hidden absolute top-[calc(100%+8px)] inset-x-0 rounded-2xl bg-[#101210]/95 backdrop-blur-xl ring-1 ring-white/10 p-3 shadow-2xl"
            >
              {LINKS.map((l) => (
                <a key={l.label} href={l.href} onClick={() => setOpen(false)} className="block px-3 py-2.5 rounded-xl text-[14px] text-foreground hover:bg-white/5">
                  {l.label}
                </a>
              ))}
              <div className="h-px bg-white/10 my-2" />
              <a href={`${APP}/login`} onClick={() => setOpen(false)} className="block px-3 py-2.5 rounded-xl text-[14px] text-muted-foreground hover:bg-white/5">Sign in</a>
              <a href={`${APP}/signup`} className="mt-1 block text-center text-[14px] font-bold px-3 py-2.5 rounded-full bg-[#E8FC85] text-[#010001]">Get started free</a>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </div>
  );
}
