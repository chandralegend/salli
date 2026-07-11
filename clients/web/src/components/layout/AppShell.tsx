"use client";

import { useState, useEffect } from "react";
import { AppSidebar } from "./AppSidebar";
import { MobileNav } from "./MobileNav";
import { ScroogePanel } from "./ScroogePanel";
import { PageTransition } from "./PageTransition";
import { useScroogePanel } from "@/lib/store";

interface AppShellProps {
  children: React.ReactNode;
}

type Quote = { content: string; author: string };

const FALLBACK_QUOTES: Quote[] = [
  { content: "The more you learn, the more you earn.", author: "Warren Buffett" },
  { content: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { content: "It's not how much money you make, but how much money you keep.", author: "Robert Kiyosaki" },
  { content: "The stock market is a device for transferring money from the impatient to the patient.", author: "Warren Buffett" },
  { content: "Do not save what is left after spending; instead spend what is left after saving.", author: "Warren Buffett" },
  { content: "Financial freedom is available to those who learn about it and work for it.", author: "Robert Kiyosaki" },
  { content: "Wealth is not about having a lot of money; it's about having a lot of options.", author: "Chris Rock" },
  { content: "Too many people spend money they haven't earned to buy things they don't want to impress people they don't like.", author: "Will Rogers" },
  { content: "Formal education will make you a living; self-education will make you a fortune.", author: "Jim Rohn" },
  { content: "Never spend your money before you have it.", author: "Thomas Jefferson" },
  { content: "Time is more valuable than money. You can get more money, but you cannot get more time.", author: "Jim Rohn" },
  { content: "A penny saved is a penny earned.", author: "Benjamin Franklin" },
];

function randomFallback(): Quote {
  return FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
}

export function AppShell({ children }: AppShellProps) {
  const { isOpen, width } = useScroogePanel();
  const [quote, setQuote] = useState<Quote | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    fetch("https://api.quotable.io/quotes/random?tags=success%7Cbusiness&limit=1")
      .then((r) => {
        if (!r.ok) throw new Error("quota");
        return r.json();
      })
      .then((data) => {
        const q = Array.isArray(data) ? data[0] : data;
        if (q?.content && q?.author) setQuote({ content: q.content, author: q.author });
        else setQuote(randomFallback());
      })
      .catch(() => setQuote(randomFallback()));
  }, [isOpen]);

  return (
    <div className="app-canvas relative flex h-screen overflow-hidden">
      <AppSidebar />
      <main className="flex-1 min-w-0 overflow-hidden">
        <PageTransition>{children}</PageTransition>
      </main>
      <MobileNav />

      {isOpen && (
          <div
            className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center"
            style={{
              backdropFilter: "blur(10px) saturate(0.5) brightness(0.88)",
              WebkitBackdropFilter: "blur(10px) saturate(0.5) brightness(0.88)",
              background: "rgba(30,40,38,0.25)",
              animation: "fadeUp 0.2s ease both",
              paddingRight: `${width + 32}px`,
            }}
          >
            {quote && (
              <div
                className="max-w-[340px] rounded-[24px] px-8 py-7 text-center"
                style={{
                  background: "rgba(255,255,255,0.55)",
                  border: "1px solid rgba(255,255,255,0.8)",
                  boxShadow: "0 2px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
                  animation: "fadeUp 0.35s 0.1s ease both",
                }}
              >
                <span
                  className="block text-[52px] leading-none mb-2 text-[#010001]/10 font-serif select-none"
                  aria-hidden
                >
                  &ldquo;
                </span>
                <p className="text-[14px] font-medium text-[#010001]/65 leading-relaxed tracking-[-0.01em]">
                  {quote.content}
                </p>
                <p className="mt-4 text-[10px] font-bold text-[#010001]/35 uppercase tracking-[0.12em]">
                  — {quote.author}
                </p>
              </div>
            )}
          </div>
        )}

      <ScroogePanel />
    </div>
  );
}
