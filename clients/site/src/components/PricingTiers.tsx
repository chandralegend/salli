"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { MagneticButton } from "@/components/MagneticButton";
import { Reveal } from "@/components/Reveal";
import { APP_LOGIN_URL } from "@/lib/config";
import { MAX_ANNUAL_SAVING, TIERS, type Tier } from "@/lib/plans";

const COMPARE = [
  { label: "Immutable double-entry ledger", free: "✓", plus: "✓", pro: "✓" },
  { label: "Sri Lanka tax engine & payable", free: "✓", plus: "✓", pro: "✓" },
  { label: "Debt payoff & FIRE planning", free: "✓", plus: "✓", pro: "✓" },
  { label: "AI messages / month (chat, quick-add, FIRE strategy)", free: "150", plus: "500", pro: "5,000" },
  { label: "Statement uploads / month", free: "10", plus: "50", pro: "500" },
  { label: "Wealth advisor runs / month", free: "10", plus: "45", pro: "150" },
  { label: "Portfolio growth scenarios", free: "3 (Conservative/Base/Growth)", plus: "3 (Conservative/Base/Growth)", pro: "3 (Conservative/Base/Growth)" },
  { label: "AI strategy rationale & theories", free: "Full", plus: "Full", pro: "Full" },
  { label: "Wealth advisor recommendations", free: "All", plus: "All", pro: "All" },
  { label: "Web search & document management", free: "✕", plus: "✓", pro: "✓" },
  { label: "Connect Claude, ChatGPT & other MCP clients", free: "✕", plus: "✓", pro: "✓" },
  { label: "Support", free: "Community", plus: "Email", pro: "Priority" },
];

// Headline figure is always a per-month number so the two cycles compare directly;
// the annual row underneath states the amount actually charged.
function priceFor(t: Tier, annual: boolean) {
  if (t.monthlyPrice === 0) return "0";
  const value = annual ? t.annualPrice / 12 : t.monthlyPrice;
  return value.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

function hrefFor(t: Tier, annual: boolean) {
  if (!t.planKey) return APP_LOGIN_URL;
  // The app reads ?upgrade= and ?cycle= off /settings; without the cycle an
  // annual selection here silently opens monthly checkout there.
  const next = `/settings?upgrade=${t.planKey}${annual ? "&cycle=year" : ""}`;
  return `${APP_LOGIN_URL}?next=${encodeURIComponent(next)}`;
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
          Annual{" "}
          <span className="rounded-full bg-green px-1.75 py-0.5 font-mono text-[11px] text-cream">
            Save up to {MAX_ANNUAL_SAVING}%
          </span>
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
                <div className="mt-5.5 flex items-baseline justify-center gap-1.5">
                  <span className="font-mono text-base font-semibold opacity-70">$</span>
                  <span className="font-mono font-display text-[52px] font-extrabold tracking-[-0.03em]">
                    {priceFor(t, annual)}
                  </span>
                  {t.monthlyPrice > 0 && <span className="font-mono text-sm opacity-60">/mo</span>}
                </div>
                <div className={clsx("mt-1.5 min-h-4.5 text-center font-mono text-xs", t.dark ? "text-cream-60" : "text-ink-50")}>
                  {t.monthlyPrice === 0
                    ? "No card required"
                    : annual
                      ? `$${t.annualPrice.toLocaleString("en-US")} billed annually`
                      : "Billed monthly"}
                </div>
                <MagneticButton
                  href={hrefFor(t, annual)}
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
          All plans include the immutable ledger and the versioned 2025/26 IRD tax pack. Prices in
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
