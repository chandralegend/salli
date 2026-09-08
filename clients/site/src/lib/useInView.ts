"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getReducedMotion() {
  return window.matchMedia(QUERY).matches;
}

/**
 * Fires once when an element first crosses into view, and reports whether the
 * reader has asked for reduced motion.
 *
 * Shared because the alternative is each animated component setting up its own
 * observer with its own threshold, which is how the old site ended up with a
 * scroll listener in the header, a second one in the marquee, and a
 * requestAnimationFrame loop feeding both.
 *
 * `reduced` is returned rather than handled here: an entrance animation should
 * skip to its finished state under reduced motion, not simply not run, and only
 * the component knows what finished looks like.
 */
export function useInView<T extends Element>(threshold = 0.35) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  // `matchMedia` is an external store, so it is read through the API meant for
  // one. Setting state from inside an effect for this causes a second render
  // on every mount, which the lint rule correctly objects to.
  const reduced = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.unobserve(entry.target);
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return { ref, inView, reduced } as const;
}
