// Plan pricing for the marketing site, in one place.
//
// Must be kept in sync with src/salli/domain/billing/plans.py, and note that
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
    cta: "Get started free",
    features: [
      "Immutable double-entry ledger",
      "Full Sri Lanka tax engine",
      "Debt payoff & FIRE planning",
      "30,000 AI credits / month",
      "Runs on Claude Haiku 4.5, around 150 conversations a month",
      "Full FIRE scenarios, AI rationale & all advisor recommendations",
      "Connect Claude, ChatGPT & other MCP clients",
      "Community support",
    ],
  },
  {
    name: "Pro",
    tagline: "For running your whole financial life through Salli.",
    monthlyPrice: 29,
    annualPrice: 200,
    popular: true,
    dark: true,
    cta: "Choose Pro",
    planKey: "pro",
    features: [
      "Everything in Free",
      "500,000 AI credits / month",
      "Around 2,500 conversations a month",
      "Daily wealth advisor",
      "Priority support",
    ],
  },
];

export function tierByName(name: string): Tier {
  const t = TIERS.find((x) => x.name === name);
  if (!t) throw new Error(`Unknown tier: ${name}`);
  return t;
}

// Derived, not asserted: Pro saves ~43% annually, so the flat "−20%" this page
// used to claim was wrong. Recomputes if a price changes.
export const MAX_ANNUAL_SAVING = Math.max(
  ...TIERS.filter((t) => t.monthlyPrice > 0).map((t) =>
    Math.round((1 - t.annualPrice / (t.monthlyPrice * 12)) * 100),
  ),
);
