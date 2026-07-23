"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { MagneticButton } from "@/components/MagneticButton";
import { APP_LOGIN_URL } from "@/lib/config";

const NAV = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
];

export function Header({ active }: { active?: string }) {
  const progressRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      const p = max > 0 ? h.scrollTop / max : 0;
      if (progressRef.current) progressRef.current.style.width = `${(p * 100).toFixed(2)}%`;
      if (headerRef.current) {
        headerRef.current.style.boxShadow =
          h.scrollTop > 8 ? "0 12px 32px -20px rgba(22,19,15,.4)" : "none";
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-80 border-b border-ink/10 bg-cream/80 backdrop-blur-2xl"
    >
      <div ref={progressRef} className="absolute left-0 top-0 h-[3px] w-0 bg-red" />
      <nav className="mx-auto flex max-w-[1320px] items-center gap-10 px-6 py-4.5 sm:px-10">
        <Link href="/" className="font-display text-[26px] font-extrabold tracking-[-0.04em]">
          Salli<span className="text-red">.</span>
        </Link>
        <div className="ml-2 hidden gap-7 font-mono text-xs font-medium uppercase tracking-[.06em] text-ink-50 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`navlink ${active === item.href ? "text-ink" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className="ml-auto hidden items-center gap-5 md:flex">
          <Link href={APP_LOGIN_URL} className="text-[14.5px] font-semibold">
            Log in
          </Link>
          <MagneticButton
            href="/pricing"
            className="rounded-full bg-ink px-5.5 py-3 text-[14.5px] font-bold text-cream hover:bg-red"
          >
            Get the app
          </MagneticButton>
        </div>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          className="ml-auto flex size-9 items-center justify-center rounded-full md:hidden"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>
      {menuOpen && (
        <div className="border-t border-ink/10 bg-cream px-6 py-6 md:hidden">
          <div className="flex flex-col gap-5 font-mono text-sm font-medium uppercase tracking-[.06em] text-ink-50">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>
                {item.label}
              </Link>
            ))}
          </div>
          <div className="mt-6 flex flex-col gap-3">
            <Link href={APP_LOGIN_URL} onClick={() => setMenuOpen(false)} className="text-[15px] font-semibold">
              Log in
            </Link>
            <Link
              href="/pricing"
              onClick={() => setMenuOpen(false)}
              className="rounded-full bg-ink px-5 py-3 text-center text-[15px] font-bold text-cream"
            >
              Get the app
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
