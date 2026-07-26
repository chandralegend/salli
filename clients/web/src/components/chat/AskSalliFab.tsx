"use client";

import { Sparkles } from "lucide-react";
import { useScroogePanel } from "@/lib/store";

/** Floating entry point into the Scrooge chat panel — hidden while the panel
 * itself is open so the two never overlap. */
export function AskSalliFab() {
  const isOpen = useScroogePanel((s) => s.isOpen);
  const toggle = useScroogePanel((s) => s.toggle);

  if (isOpen) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Ask Salli AI"
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:brightness-110"
    >
      <Sparkles className="size-[18px]" />
      Ask Salli AI
    </button>
  );
}
