import type { Tour } from "nextstepjs";

export const TOUR_NAME = "mainTour";

/** Where the caret sits on the card's edge (and therefore which way it points).
 * `none` hides it entirely. */
export type TourArrowPosition =
  | "left-top"
  | "left-center"
  | "left-bottom"
  | "right-top"
  | "right-center"
  | "right-bottom"
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"
  | "none";

export interface TourCardLayout {
  /** Nudge the card horizontally from the library's computed position, in px. */
  offsetX?: number;
  /** Nudge the card vertically from the library's computed position, in px. */
  offsetY?: number;
  /** Caret placement on the card. Defaults to `none` when unset. */
  arrow?: TourArrowPosition;
}

/**
 * Per-step card + caret overrides, keyed by index into the `steps` array below.
 *
 * NextStepJS positions the card itself (via `side`) but its own corner variants
 * and built-in arrow don't place reliably in this app — the card frequently
 * lands partly off-viewport and the arrow ignores the configured side. These
 * offsets and caret positions are applied by `TourCard` on top of whatever the
 * library computes, so we get final say on both.
 */
export const TOUR_CARD_LAYOUT: Record<number, TourCardLayout> = {
  // Sidebar "Dashboard" item sits near the top of the viewport, so the
  // vertically-centred `right` placement clips the card's top — push it down.
  0: { offsetY: 90, arrow: "left-top" },
  // "New entry" is top-right; card goes to its left, caret on the card's right.
  1: { offsetY: 90, arrow: "right-top" },
  2: { arrow: "bottom-center" },
  3: { arrow: "bottom-center" },
  4: { arrow: "top-center" },
  5: { arrow: "top-center" },
  6: { arrow: "top-center" },
  // The FAB is pinned bottom-right, so the vertically-centred `left` placement
  // would hang below the viewport. Lift the card until its lower-right caret
  // lines up with the button's top-left corner.
  7: { offsetY: -110, arrow: "right-bottom" },
};

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
        side: "left",
      },
      {
        title: "Your tax, computed — not guessed",
        content:
          "Salli's deterministic engine applies Sri Lanka's YA rules to your posted ledger — reliefs, bands, and credits included.",
        selector: "#tour-dash-tax-card",
        side: "top",
      },
      {
        title: "Your path to Freedom",
        content:
          "Your Freedom Score tracks how close you are to your number, built from the same ledger data as everything else. Let's look at the ledger next.",
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
        title: "Plan your Freedom strategy",
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
        side: "left",
      },
    ],
  },
];
