"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Btn } from "@/components/Btn";
import { APP_LOGIN_URL } from "@/lib/config";

const NAV = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
];

export function Header({ active }: { active?: string }) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // A one-pixel sentinel above the header, watched by IntersectionObserver.
  // The previous version ran a scroll listener on every frame to compute both
  // this and the progress bar; the progress bar is now a CSS scroll-driven
  // animation and this is the only JS left, firing twice per page rather than
  // per frame.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setStuck(!entry.isIntersecting), {
      threshold: 0,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinelRef} aria-hidden="true" className="absolute top-0 h-px w-full" />
      <header
        data-stuck={stuck}
        // Opaque, not translucent. A blurred glass bar is the soft language
        // this redesign replaced, and it puts an ambiguous edge between the
        // header and a hard-bordered block scrolling under it.
        className="sticky top-0 z-80 border-b-2 border-ink bg-cream"
      >
        {/* Reading progress. Scales rather than animating width so it stays on
            the compositor. */}
        <div className="scrollbar-progress absolute inset-x-0 bottom-[-3px] h-[3px] bg-red" />

        <nav className="mx-auto flex h-[68px] max-w-[1320px] items-center gap-8 px-5 sm:px-8">
          <Link href="/" className="font-display text-[26px] font-extrabold tracking-[-0.04em]">
            Salli<span className="text-red">.</span>
          </Link>

          <div className="ml-1 hidden gap-7 font-mono text-[12px] font-medium uppercase tracking-[.06em] text-ink-50 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                data-active={active === item.href}
                className={`navlink ${active === item.href ? "text-ink" : ""}`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="ml-auto hidden items-center gap-5 md:flex">
            <Link href={APP_LOGIN_URL} className="text-[14.5px] font-semibold hover:text-red-ink">
              Log in
            </Link>
            <Btn href={APP_LOGIN_URL} size="sm">
              Get started free
            </Btn>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="brut press ml-auto flex size-10 items-center justify-center bg-card md:hidden"
          >
            {menuOpen ? <X size={19} strokeWidth={2.5} /> : <Menu size={19} strokeWidth={2.5} />}
          </button>
        </nav>
      </header>

      {menuOpen && (
        <div className="sticky top-[68px] z-79 border-b-2 border-ink bg-cream px-5 py-6 md:hidden">
          <div className="flex flex-col gap-5 font-mono text-sm font-medium uppercase tracking-[.06em] text-ink-50">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>
                {item.label}
              </Link>
            ))}
          </div>
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href={APP_LOGIN_URL}
              onClick={() => setMenuOpen(false)}
              className="text-[15px] font-semibold"
            >
              Log in
            </Link>
            <Btn href={APP_LOGIN_URL} onClick={() => setMenuOpen(false)} className="w-full">
              Get started free
            </Btn>
          </div>
        </div>
      )}
    </>
  );
}
