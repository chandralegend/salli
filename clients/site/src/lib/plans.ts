// Plan pricing for the marketing site, in one place.
//
// Must be kept in sync with src/salli/domain/billing/plans.py — and note that
// neither is the real authority: Paddle charges the card, using the price IDs in
// PADDLE_PRICE_*. This file only describes what we advertise, so a mismatch here
// means quoting a price we don't charge.
//
// Lives outside PricingTiers.tsx because the pricing page's FAQ (a server
// component, and the source of the indexed FAQ JSON-LD) states the annual
// amounts too. Two hardcoded copies is exactly how the previous drift happened.

export type Tier = {
  name: string;
  tagline: string;
  monthlyPrice: number;
  // The real annual charge, not a discount applied to monthlyPrice. The two are
  // priced independently in Paddle, so the saving differs per plan (see
  // MAX_ANNUAL_SAVING); deriving one from the other is what made this site
  // advertise amounts we don't actually charge.
  annualPrice: number;
  popular?: boolean;
  dark?: boolean;
  cta: string;
  // Plan key passed to the app as ?upgrade=<key>; absent on Free, which just
  // signs in. The full href is built per-render so the annual toggle rides along.
  planKey?: string;
  features: string[];
};

export const TIERS: Tier[] = [
  {
    name: "Free",
    tagline: "The honest ledger, forever free.",
    monthlyPrice: 0,
    annualPrice: 0,
    cta: "Start free",
    features: ["Immutable double-entry ledger", "Full Sri Lanka tax engine", "Debt payoff & FIRE planning", "150 AI messages / month", "10 statement uploads / month", "10 wealth-advisor runs / month", "Full FIRE scenarios, AI rationale & all advisor recommendations", "Community support"],
  },
  {
    name: "Plus",
    tagline: "More AI, and connect your favorite assistant.",
    monthlyPrice: 9,
    annualPrice: 100,
    popular: true,
    dark: true,
    cta: "Choose Plus",
    planKey: "plus",
    features: ["Everything in Free", "500 AI messages / month", "50 statement uploads / month", "Daily wealth advisor (45 runs / month)", "Connect Claude, ChatGPT & other MCP clients", "Full FIRE scenarios, AI rationale & all advisor recommendations"],
  },
  {
    name: "Pro",
    tagline: "Full power, priority help.",
    monthlyPrice: 29,
    annualPrice: 200,
    cta: "Choose Pro",
    planKey: "pro",
    features: ["Everything in Plus", "5,000 AI messages / month", "500 statement uploads / month", "150 wealth-advisor runs / month", "Priority support"],
  },
];

export function tierByName(name: string): Tier {
  const t = TIERS.find((x) => x.name === name);
  if (!t) throw new Error(`Unknown tier: ${name}`);
  return t;
}

// Derived, not asserted: Plus saves ~7% annually and Pro ~43%, so the flat "−20%"
// this page used to claim was true of neither. Recomputes if a price changes.
export const MAX_ANNUAL_SAVING = Math.max(
  ...TIERS.filter((t) => t.monthlyPrice > 0).map((t) =>
    Math.round((1 - t.annualPrice / (t.monthlyPrice * 12)) * 100),
  ),
);
