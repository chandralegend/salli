import type { Tour } from "nextstepjs";

export const TOUR_NAME = "mainTour";

export const TOUR_STEPS: Tour[] = [
  {
    tour: TOUR_NAME,
    steps: [
      {
        title: "Welcome to Salli",
        content:
          "This is your home base — net worth, tax, and FI status, all computed from your real ledger. Let's take a quick look around.",
        selector: "#tour-nav-dashboard",
        side: "right",
      },
      {
        title: "Add an entry anytime",
        content:
          "Every number in Salli traces back to a posted ledger entry — add one here, or upload a bank statement and let Salli draft it for you.",
        selector: "#tour-new-entry",
        side: "bottom-left",
      },
      {
        title: "Your tax, computed — not guessed",
        content:
          "Salli's deterministic engine applies Sri Lanka's YA rules to your posted ledger — reliefs, bands, and credits included.",
        selector: "#tour-dash-tax-card",
        side: "top",
      },
      {
        title: "Your path to financial independence",
        content:
          "Your FI Score tracks how close you are to your number, built from the same ledger data as everything else. Let's look at the ledger next.",
        selector: "#tour-dash-fi-card",
        side: "top",
        nextRoute: "/ledger",
      },
      {
        title: "Double-entry, done properly",
        content:
          "Chart of accounts, journal entries, and an income statement — the real bookkeeping behind every figure Salli shows you.",
        selector: "#tour-ledger-tabs",
        side: "bottom",
        nextRoute: "/tax",
        prevRoute: "/dashboard",
      },
      {
        title: "Tax, fully broken down",
        content:
          "See the full computation — gross income, reliefs, bands, and credits — recomputed whenever your ledger changes.",
        selector: "#tour-page-title",
        side: "bottom",
        nextRoute: "/financial-independence",
        prevRoute: "/ledger",
      },
      {
        title: "Plan your FIRE strategy",
        content:
          "Set a savings and allocation strategy, track projections, and get AI-mentored recommendations — grounded in your actual numbers.",
        selector: "#tour-page-title",
        side: "bottom",
        prevRoute: "/tax",
      },
      {
        title: "Ask Salli anything",
        content:
          "Tax, projections, spending — answered from your real ledger. Never guessed. Ask a question whenever you're stuck.",
        selector: "#tour-ask-salli-fab",
        side: "top-left",
      },
    ],
  },
];
