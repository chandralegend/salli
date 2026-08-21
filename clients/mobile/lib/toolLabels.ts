/**
 * Static tool-name -> human-facing copy. Backend tool names (e.g. "post_journal_entry")
 * must never reach the UI verbatim — this is the single source of plain-language
 * labels for the tool-activity display. Extend this table when a new tool is added
 * to domain/agents/tools.py; anything missing falls back to a generic label rather
 * than surfacing the raw name.
 */
export type ToolLabel = { label: string; status: string };

const TOOL_LABELS: Record<string, ToolLabel> = {
  web_search: { label: "Searching the web", status: "Looking things up" },
  save_document: { label: "Saving document", status: "Filing it away" },
  read_document: { label: "Reading document", status: "Reviewing the file" },
  list_documents: { label: "Checking documents", status: "Scanning your files" },
  update_document: { label: "Updating document", status: "Applying changes" },
  delete_document: { label: "Removing document", status: "Cleaning up" },
  save_memory: { label: "Remembering that", status: "Noting it down" },
  get_memory: { label: "Recalling details", status: "Checking what I know" },
  list_memories: { label: "Checking what I remember", status: "Reviewing notes" },
  get_financial_profile: { label: "Checking your profile", status: "Pulling your details" },
  get_freedom_snapshot: { label: "Checking Freedom progress", status: "Crunching the numbers" },
  can_i_afford: { label: "Running the numbers", status: "Checking affordability" },
  get_budget_summary: { label: "Reviewing your budget", status: "Adding it up" },
  get_payoff_plan: { label: "Building a payoff plan", status: "Working out the schedule" },
  get_portfolio_summary: { label: "Checking your portfolio", status: "Reviewing holdings" },
  get_subscription_report: { label: "Reviewing subscriptions", status: "Scanning recurring charges" },
  get_coverage_report: { label: "Checking your coverage", status: "Reviewing policies" },
  get_latest_advisor_report: { label: "Pulling the latest report", status: "Fetching insights" },
  run_wealth_advisor: { label: "Consulting the advisor", status: "Analyzing your finances" },
  get_accounts: { label: "Checking your accounts", status: "Pulling balances" },
  create_account: { label: "Creating an account", status: "Setting it up" },
  create_reminder: { label: "Setting a reminder", status: "Adding to your list" },
  post_journal_entry: { label: "Posting an entry", status: "Updating the ledger" },
  get_trial_balance: { label: "Checking the trial balance", status: "Balancing the books" },
  get_tax_computation: { label: "Working out your tax", status: "Running the numbers" },
  list_tax_packs: { label: "Checking tax packs", status: "Reviewing available packs" },
  explain_tax_band: { label: "Explaining tax bands", status: "Looking up the rules" },
};

const FALLBACK: ToolLabel = { label: "Working on it", status: "One moment" };

export function getToolLabel(name: string): ToolLabel {
  return TOOL_LABELS[name] ?? FALLBACK;
}
