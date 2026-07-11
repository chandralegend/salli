"use client";

import { AnimatePresence, motion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useEffect, useCallback } from "react";

const NAV_ORDER = ["/dashboard", "/ledger", "/tax", "/financial-independence"];

function navIndex(path: string) {
  return NAV_ORDER.indexOf(path);
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const prevPathRef = useRef(pathname);
  const dirRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const wheelAccumRef = useRef(0);
  const lockedRef = useRef(false);

  // Compute slide direction synchronously during render
  if (prevPathRef.current !== pathname) {
    const prev = navIndex(prevPathRef.current);
    const next = navIndex(pathname);
    dirRef.current = prev !== -1 && next !== -1 ? (next > prev ? 1 : -1) : 0;
    prevPathRef.current = pathname;
  }

  const navigate = useCallback((delta: number) => {
    const idx = navIndex(pathname);
    if (idx === -1) return;
    const next = idx + delta;
    if (next < 0 || next >= NAV_ORDER.length) return;
    lockedRef.current = true;
    wheelAccumRef.current = 0;
    router.push(NAV_ORDER[next]);
    // Unlock after the animation completes
    setTimeout(() => { lockedRef.current = false; }, 600);
  }, [pathname, router]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Only activate scroll-detection for the 4 main nav pages
    if (navIndex(pathname) === -1) return;

    const THRESHOLD = 120; // px of accumulated over-scroll needed

    function onWheel(e: WheelEvent) {
      if (lockedRef.current) { e.preventDefault(); return; }

      const atBottom = el!.scrollTop + el!.clientHeight >= el!.scrollHeight - 4;
      const atTop = el!.scrollTop <= 4;

      if (e.deltaY > 0 && atBottom) {
        e.preventDefault();
        wheelAccumRef.current += e.deltaY;
        if (wheelAccumRef.current >= THRESHOLD) navigate(1);
      } else if (e.deltaY < 0 && atTop) {
        e.preventDefault();
        wheelAccumRef.current += e.deltaY;
        if (wheelAccumRef.current <= -THRESHOLD) navigate(-1);
      } else {
        wheelAccumRef.current = 0;
      }
    }

    // Touch support
    let touchStartY = 0;
    function onTouchStart(e: TouchEvent) {
      touchStartY = e.touches[0].clientY;
    }
    function onTouchEnd(e: TouchEvent) {
      if (lockedRef.current) return;
      const delta = touchStartY - e.changedTouches[0].clientY;
      const atBottom = el!.scrollTop + el!.clientHeight >= el!.scrollHeight - 4;
      const atTop = el!.scrollTop <= 4;
      if (delta > 60 && atBottom) navigate(1);
      if (delta < -60 && atTop) navigate(-1);
    }

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [pathname, navigate]);

  const dir = dirRef.current;

  return (
    <div style={{ position: "relative", height: "100%", overflow: "hidden" }}>
      <AnimatePresence mode="sync" custom={dir} initial={false}>
        <motion.div
          key={pathname}
          custom={dir}
          variants={{
            enter: (d: number) => ({ y: d ? `${d * 100}%` : 0, opacity: d ? 1 : 0 }),
            center: { y: 0, opacity: 1 },
            exit: (d: number) => ({ y: d ? `${d * -100}%` : 0, opacity: d ? 1 : 0 }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.42, ease: [0.32, 0.72, 0, 1] }}
          ref={scrollRef}
          className="pb-[100px] md:pb-0"
          style={{ position: "absolute", inset: 0, overflowY: "auto" }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
