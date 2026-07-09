"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Cookie } from "lucide-react";

const STORAGE_KEY = "salli_cookie_consent";

/**
 * Bottom-anchored cookie notice. Shows once until the visitor accepts or
 * rejects; the choice (plus a timestamp) is persisted to localStorage so it
 * doesn't reappear on every visit.
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  function choose(choice: "accepted" | "rejected") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ choice, at: new Date().toISOString() }));
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 28 }}
          className="fixed inset-x-4 bottom-4 z-[60] sm:inset-x-auto sm:left-4 sm:right-auto sm:max-w-md"
          role="region"
          aria-label="Cookie notice"
        >
          <div className="rounded-2xl bg-[#101210]/95 backdrop-blur-xl ring-1 ring-white/10 shadow-[0_24px_64px_-24px_rgba(0,0,0,0.7)] p-5">
            <div className="flex items-start gap-3">
              <div className="size-8 rounded-xl bg-[#E8FC85] flex items-center justify-center shrink-0">
                <Cookie className="size-4 text-[#010001]" />
              </div>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                We use essential cookies to keep you signed in, plus optional analytics to improve
                Salli. No ad trackers, ever.{" "}
                <a href="/cookies" className="text-foreground underline underline-offset-2">
                  Cookie Policy
                </a>
              </p>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={() => choose("accepted")}
                className="flex-1 text-[13px] font-bold h-9 rounded-full bg-[#E8FC85] text-[#010001] hover:brightness-95 transition-all"
              >
                Accept all
              </button>
              <button
                onClick={() => choose("rejected")}
                className="flex-1 text-[13px] font-semibold h-9 rounded-full bg-white/5 text-foreground ring-1 ring-white/12 hover:ring-white/25 transition-all"
              >
                Essential only
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
