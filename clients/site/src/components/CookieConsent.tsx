"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "salli_cookie_consent";

/**
 * Bottom-anchored cookie notice. Shows once until the visitor accepts or
 * rejects; the choice (plus a timestamp) is persisted to localStorage so it
 * doesn't reappear on every visit.
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Reads an external system (localStorage) to decide first-mount visibility -
    // can't be computed as lazy initial state since this also prerenders at
    // build time, where localStorage doesn't exist.
    if (!localStorage.getItem(STORAGE_KEY)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(true);
      requestAnimationFrame(() => setMounted(true));
    }
  }, []);

  function choose(choice: "accepted" | "rejected") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ choice, at: new Date().toISOString() }));
    setMounted(false);
    setTimeout(() => setVisible(false), 300);
  }

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      className="fixed inset-x-4 bottom-4 z-60 transition-all duration-300 ease-out sm:inset-x-auto sm:left-4 sm:right-auto sm:max-w-md"
      style={{
        transform: mounted ? "translateY(0)" : "translateY(100px)",
        opacity: mounted ? 1 : 0,
      }}
    >
      <div className="rounded-card bg-ink p-5 text-cream shadow-hard">
        <p className="font-mono text-[12.5px] leading-relaxed text-cream-60">
          We use essential cookies to keep you signed in, plus optional analytics to improve
          Salli. No ad trackers, ever.{" "}
          <a href="/cookies" className="text-cream underline underline-offset-2 hover:text-red">
            Cookie Policy
          </a>
        </p>
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => choose("accepted")}
            className="h-10 flex-1 rounded-full bg-red text-[13px] font-bold text-ink transition-transform active:scale-[0.98]"
          >
            Accept all
          </button>
          <button
            onClick={() => choose("rejected")}
            className="h-10 flex-1 rounded-full border-2 border-cream text-[13px] font-semibold text-cream transition-colors hover:border-cream/40"
          >
            Essential only
          </button>
        </div>
      </div>
    </div>
  );
}
