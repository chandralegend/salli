/**
 * Mobile's guided tour — the equivalent of web's NextStepJS walkthrough,
 * adapted to this app's floating-tab-bar navigation (no standalone Tax tab;
 * the tour detours through the hidden "More" hub for that stop).
 *
 * `route` is where the step's `targetId` lives — the overlay navigates there
 * before waiting for the target to register, so a step whose target is on a
 * screen you're not currently on can still be shown.
 */
export type TourStep = {
  id: string;
  targetId: string;
  route: string;
  title: string;
  body: string;
};

export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    targetId: "dashboard-avatar",
    route: "/(tabs)",
    title: "Welcome to Salli",
    body: "A quick tour of where everything lives. Skip anytime — you can replay this from Settings later.",
  },
  {
    id: "quick-add",
    // Was "tabbar-quickadd" — the centre "+" tab. That tab is gone; Add now
    // sits on Home and carries the same tap/long-press pair.
    targetId: "dashboard-quickadd",
    route: "/(tabs)",
    title: "Add anything, fast",
    body: "Tap for a form. Long-press to speak or type free-form and let Salli draft the entry.",
  },
  {
    id: "tax-tile",
    // Still "dashboard-tax-tile", but it is no longer a tile — it is the tax
    // line under the Freedom score. The id is kept so stored tour progress
    // stays valid.
    targetId: "dashboard-tax-tile",
    route: "/(tabs)",
    title: "Tax, computed — not guessed",
    body: "Every figure here comes from a deterministic engine, never an AI estimate.",
  },
  {
    id: "freedom-tile",
    targetId: "dashboard-freedom-tile",
    route: "/(tabs)",
    title: "Your Freedom Score",
    body: "How close you are to financial independence, from your real numbers. Let's look at the ledger behind it.",
  },
  {
    id: "ledger-tabs",
    targetId: "ledger-tabs",
    route: "/(tabs)/ledger",
    title: "The real ledger behind it all",
    body: "Proper double-entry bookkeeping — Accounts, Journal, and an Income Statement, all in sync.",
  },
  {
    id: "tax-header",
    targetId: "tax-header",
    route: "/(tabs)/more/tax",
    title: "Full tax breakdown",
    body: "Bands, relief, and credits — the same engine that feeds your Dashboard, in full.",
  },
  {
    id: "freedom-header",
    targetId: "freedom-header",
    route: "/(tabs)/financial-independence",
    title: "Plan your Freedom",
    body: "Strategy, projections, goals, and an AI mentor — all grounded in your real ledger.",
  },
  {
    id: "scrooge-tab",
    targetId: "tabbar-scrooge",
    route: "/(tabs)/financial-independence",
    title: "Ask Salli AI anything",
    body: "Your AI advisor. It reads your numbers and explains them — it never computes your tax or money on its own.",
  },
];
