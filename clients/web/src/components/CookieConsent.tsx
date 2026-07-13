"use client";

import { useEffect, useState } from "react";
import { Cookie, X } from "lucide-react";

const STORAGE_KEY = "salli_cookie_consent";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://salli.leafmonkey.org";

/**
 * Bottom-anchored cookie notice for the app. Shows once until the visitor
 * accepts or rejects; the choice persists to localStorage. Themed with the
 * app's CSS variables so it follows light/dark mode automatically.
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

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-4 bottom-4 z-[100] sm:inset-x-auto sm:left-4 sm:right-auto sm:max-w-sm"
      style={{ animation: "fadeUp 0.3s ease both" }}
      role="region"
      aria-label="Cookie notice"
    >
      <div className="rounded-2xl bg-card border border-border shadow-[0_24px_64px_-24px_rgba(0,0,0,0.25)] p-5 relative">
        <button
          onClick={() => choose("rejected")}
          className="absolute top-3.5 right-3.5 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          <X className="size-3.5" />
        </button>
        <div className="flex items-start gap-3 pr-4">
          <div className="size-8 rounded-xl bg-[#E8FC85] flex items-center justify-center shrink-0">
            <Cookie className="size-4 text-[#010001]" />
          </div>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            We use essential cookies to keep you signed in, plus optional analytics to improve
            Salli. No ad trackers, ever.{" "}
            <a href={`${SITE_URL}/cookies`} className="text-foreground underline underline-offset-2">
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
            className="flex-1 text-[13px] font-semibold h-9 rounded-full bg-muted text-foreground hover:bg-muted/70 transition-all"
          >
            Essential only
          </button>
        </div>
      </div>
    </div>
  );
}
