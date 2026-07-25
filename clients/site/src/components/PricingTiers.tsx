"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { MagneticButton } from "@/components/MagneticButton";
import { Reveal } from "@/components/Reveal";
import { APP_LOGIN_URL } from "@/lib/config";

type Tier = {
  name: string;
  tagline: string;
  monthlyPrice: number;
  popular?: boolean;
  dark?: boolean;
  cta: string;
  href: string;
  features: string[];
};

// Prices must be kept in sync with src/salli/domain/billing/plans.py (the
// backend, via Paddle, is the source of truth for what's actually charged).
const TIERS: Tier[] = [
  {
    name: "Free",
    tagline: "The honest ledger, forever free.",
    monthlyPrice: 0,
    cta: "Start free",
    href: APP_LOGIN_URL,
    features: ["Immutable double-entry ledger", "Manual transactions & budgets", "Net-worth overview", "One connected account", "Community support"],
  },
  {
    name: "Plus",
    tagline: "Tax clarity and planning, done for you.",
    monthlyPrice: 9,
    popular: true,
    dark: true,
    cta: "Choose Plus",
    href: `${APP_LOGIN_URL}?next=${encodeURIComponent("/settings?upgrade=plus")}`,
    features: ["Everything in Free", "2025/26 tax engine & payable", "AI quick-add & explanations", "Debt payoff & FIRE planning", "Unlimited accounts & exports", "Connect Claude, ChatGPT & other MCP clients"],
  },
  {
    name: "Pro",
    tagline: "Full power, guided returns, priority help.",
    monthlyPrice: 29,
    cta: "Choose Pro",
    href: `${APP_LOGIN_URL}?next=${encodeURIComponent("/settings?upgrade=pro")}`,
    features: ["Everything in Plus", "Guided return preparation", "Human-review checkpoint", "Portfolio & insurance tracking", "Priority support"],
  },
];

const COMPARE = [
  { label: "Immutable double-entry ledger", free: "✓", plus: "✓", pro: "✓" },
  { label: "Connected accounts", free: "1", plus: "Unlimited", pro: "Unlimited" },
  { label: "2025/26 tax engine & payable", free: "✕", plus: "✓", pro: "✓" },
  { label: "AI quick-add & explanations", free: "✕", plus: "✓", pro: "✓" },
  { label: "Debt payoff & FIRE planning", free: "✕", plus: "✓", pro: "✓" },
  { label: "Connect Claude, ChatGPT & other MCP clients", free: "✕", plus: "✓", pro: "✓" },
  { label: "Guided return + human review", free: "✕", plus: "✕", pro: "✓" },
  { label: "Support", free: "Community", plus: "Email", pro: "Priority" },
];

function priceFor(monthly: number, annual: boolean) {
  if (monthly === 0) return "0";
  return (annual ? Math.round(monthly * 0.8) : monthly).toLocaleString("en-US");
}

export function PricingTiers() {
  const [annual, setAnnual] = useState(false);

  return (
    <>
      <div className="mt-8.5 inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white p-1.5">
        <button
          type="button"
          onClick={() => setAnnual(false)}
          className={clsx(
            "rounded-full px-5.5 py-2.5 text-sm font-bold transition-colors",
            !annual ? "bg-ink text-cream" : "text-ink-60",
          )}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => setAnnual(true)}
          className={clsx(
            "flex items-center gap-2 rounded-full px-5.5 py-2.5 text-sm font-bold transition-colors",
            annual ? "bg-ink text-cream" : "text-ink-60",
          )}
        >
          Annual <span className="rounded-full bg-green px-1.75 py-0.5 font-mono text-[11px] text-cream">−20%</span>
        </button>
      </div>

      <section className="relative z-2 mx-auto max-w-[1320px] px-6 pt-11 pb-10 sm:px-10">
        <div className="grid items-stretch gap-5.5 md:grid-cols-3">
          {TIERS.map((t) => (
            <Reveal key={t.name} className="relative">
              {t.popular && (
                <div className="absolute -top-3.25 left-1/2 z-1 -translate-x-1/2 rounded-full bg-red px-3.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[.08em] text-cream">
                  Most popular
                </div>
              )}
              <div
                className={clsx(
                  "flex h-full flex-col rounded-[28px] border-2 p-9",
                  t.dark
                    ? "border-red bg-ink text-cream shadow-[0_34px_70px_-30px_rgba(22,19,15,.6)]"
                    : "border-ink/8 bg-white text-ink shadow-[0_20px_50px_-34px_rgba(22,19,15,.3)]",
                )}
              >
                <div className="font-display text-[22px] font-extrabold tracking-[-0.02em]">{t.name}</div>
                <p className={clsx("mt-2 min-h-10.5 text-sm leading-[1.5]", t.dark ? "text-cream-60" : "text-ink-50")}>
                  {t.tagline}
                </p>
                <div className="mt-5.5 flex items-baseline gap-1.5">
                  <span className="font-mono text-base font-semibold opacity-70">$</span>
                  <span className="font-mono font-display text-[52px] font-extrabold tracking-[-0.03em]">
                    {priceFor(t.monthlyPrice, annual)}
                  </span>
                  {t.monthlyPrice > 0 && <span className="font-mono text-sm opacity-60">/mo</span>}
                </div>
                <div className={clsx("mt-1.5 min-h-4.5 font-mono text-xs", t.dark ? "text-cream-60" : "text-ink-50")}>
                  {t.monthlyPrice === 0
                    ? "No card required"
                    : annual
                      ? `$${(Math.round(t.monthlyPrice * 0.8) * 12).toLocaleString("en-US")} billed annually`
                      : "Billed monthly"}
                </div>
                <MagneticButton
                  href={t.href}
                  className={clsx(
                    "mt-6.5 rounded-full py-3.75 text-center text-[15px] font-bold",
                    t.dark ? "bg-red text-cream" : "bg-ink text-cream",
                  )}
                >
                  {t.cta}
                </MagneticButton>
                <div className={clsx("my-6.5 h-px", t.dark ? "bg-cream/16" : "bg-ink/10")} />
                <div className="flex flex-col gap-3">
                  {t.features.map((f) => (
                    <div key={f} className="flex items-start gap-2.5 text-sm">
                      <span className={clsx("flex-none font-mono font-bold", t.dark ? "text-red" : "text-green")}>✓</span>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-6.5 text-center font-mono text-xs text-ink-40">
          All plans include the immutable ledger and the 2025/26 CA-reviewed tax pack. Prices in
          USD, billed via Paddle. Your bank or Paddle applies the exchange rate and any local
          taxes at checkout.
        </p>
      </section>

      <section className="relative z-2 mx-auto max-w-[1100px] px-6 pt-20 pb-10 sm:px-10">
        <h2 className="mb-9 font-display text-[clamp(30px,4vw,52px)] font-extrabold leading-[1.0] tracking-[-0.04em]">
          Compare plans.
        </h2>
        <div className="border-t-2 border-ink">
          {COMPARE.map((row) => (
            <div key={row.label} className="grid grid-cols-[1.6fr_1fr_1fr_1fr] items-center gap-4 border-b border-ink/12 py-4.5">
              <div className="text-[15px] font-semibold">{row.label}</div>
              <div className="text-center font-mono text-sm text-ink-60">{row.free}</div>
              <div className="text-center font-mono text-sm text-ink-60">{row.plus}</div>
              <div className="text-center font-mono text-sm font-semibold text-red">{row.pro}</div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
