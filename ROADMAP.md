# Salli → Personal Finance Advisor: roadmap

Tracks progress on aligning Salli with the full "AI Personal Finance Advisor" feature set
(cash flow/budgeting, debt, investments, insurance, retirement, reports, proactive AI insights,
alerts, etc.). Backend-first: CLI/API parity, then new domains, one phase at a time, each
verified end-to-end and committed before moving on.

## Status

| Phase | Status | Notes |
|---|---|---|
| 0. CLI completion | ✅ Done (464c594) | reminders/fi/advisor/documents/billing CLI groups, entry reverse, ledger income-statement, agent sessions/history/resume |
| 1. Onboarding / fact-find redo (backend) | ✅ Done (8c586e8, 26af540, cabc975, ed24b29, eff1e8a) | see below |
| 2. Budget domain | ✅ Done (87a3c0c, fdd8835, 3fd1928, f121403, 013a1c3) | see below |
| 3. Debt management | ✅ Done (a052731, 9e23f32, 2ec88a6, 10c15cf, 3f5f254) | see below |
| 4. Investment Portfolio | ✅ Done (99dbb31, eeaef81, 755c30a, 22f64de, 8abd08c) | see below |
| 5. Account/entry management + recurring subscriptions | ✅ Done (6ebfdec, 68c80ce, 2961071, 5053624, 6957b86, 4502c8b, 2a67ec9, 8a51706, c6ad947, 1de56a1, 0d6c394, 1a84a69) | see below |
| 6. Insurance | ✅ Done (7956cc8, e922ea8, f92b3b3, e4ed420, 354f47d, f0fa109) | see below |
| 7. AI Advisor upgrades | ✅ Done (6fb7db4, 3ba21d6, 22b0fee, 868151e, d66d084, 0b95d74, 0ad0310, 8bf36a7, 95b57d8, d64ecb3) | see below |
| 8. Reports & alerts | ✅ Done (0360b0d, a3bfd09, e4ac20e, d48ad3b, 4519851, d8fe246, 6f479e8) | see below |
| 9+. Data portability | ⏳ Not started | sketched only, gets its own plan when its turn comes |

---

## Phase 0 — CLI completion ✅

Wired every already-built application service into `src/salli/interfaces/cli/main.py`:
`ledger income-statement` (fixed stub), `entry reverse`, `reminders` group, `fi` group
(score/history/projections/surplus/goals/strategy), `advisor` group (run/reports/apply/dismiss),
`documents` group, `billing` group, and `agent` sessions/history/resume.

Verified against local dev stack (docker compose db + alembic + `SALLI_USER_ID=dev-user`):
accounts/entries/reversal, reminders CRUD+seed, FI score/goals/projections/surplus/history,
documents CRUD, billing plans/subscription. `fi strategy generate`/`advisor run`/`agent chat`
are LLM-backed and untestable in this sandbox (placeholder API key) but unchanged in shape from
already-working LLM commands.

Fixed two bugs caught during verification (not pre-existing): a double `asyncio.run()` /
event-loop-closed crash in `income-statement`, and a wrong dict key in `fi history`.

---

## Phase 1 — Onboarding / fact-find redo (backend) ✅

**Why**: current onboarding (`clients/web/src/app/onboarding/` +
`interfaces/api/routers/onboarding.py`) is a product setup wizard, not a real fact-find — no
opening balances, income is category checkboxes with no amounts, risk profiling is a single
3-option radio, no age/dependents/life-stage, only one goal captured. `UserProfileORM` only
holds `id/email/display_name/paddle_customer_id`.

**Built**:

- [x] Extended `UserProfileORM` with structured columns (date_of_birth, dependents_count,
      employment_status, residency_status, employer, employment_type, ird_number, risk_score,
      risk_category, life_stage) — all nullable, migration `fa523e86f4cf`
- [x] `domain/risk/` module: `models.py` (RiskQuestionnaireAnswers, RiskProfile), `engine.py`
      (pure `compute(answers) -> RiskProfile`, 5-dimension point rubric), `life_stage.py`
      (derive_life_stage)
- [x] `UserProfileService` (application/services/) — get_profile (+ best-effort backfill from
      the old memory-based fields), update_identity, submit_risk_questionnaire,
      declare_opening_balances/declare_income (reuse LedgerService.add_account/add_entry to post
      real, balanced journal entries)
- [x] Wired into `composition.py` as `svc.profile`
- [x] `interfaces/api/routers/onboarding.py`: added GET/PATCH `/profile`, POST
      `/balance-sheet`, `/income`, `/risk-questionnaire`, `/goals` (repeatable) — legacy
      `GET /status` and `POST /complete` left untouched so the current frontend wizard keeps
      working unchanged
- [x] CLI `profile` command group: show/update/risk-questionnaire/balance-sheet/income
- [x] Agent tool `get_financial_profile` (threaded through AgentService -> build_manager_agent
      -> make_manager_tools)
- [x] Golden tests (4 hand-scored questionnaire examples) + 7 Hypothesis property tests
      (monotonicity per dimension, score bounds, category thresholds) — all passing

**Verified**: fresh dev user through the full step-by-step flow (direct service calls, real HTTP
via ASGI transport, and CLI) — opening balances/income post real balanced journal entries (trial
balance stays net-zero), risk questionnaire produces sensible scores across conservative/
balanced/aggressive, life stage derives correctly for student/early_career/family/pre_retirement/
retired combinations, multiple goals created for one user. `GET /onboarding/status` and
`POST /onboarding/complete` confirmed unchanged (still gate the frontend `(app)` layout redirect).
Zero regressions: same 11 pre-existing test failures and same pre-existing lint/pyright baseline
before and after every commit. Flagged (not fixed, out of scope): the API test suite's
`get_current_user` dependency is never overridden in `tests/unit/api/conftest.py`, so all of
those tests 401 regardless of route logic — spawned as a separate background task.

---

## Phase 2 — Budget domain ✅

New domain following the Tax/FI engine pattern.

**Built**:

- [x] `domain/budget/models.py` (BudgetLineDef, BudgetLine, BudgetSummary) + `engine.py` — pure
      `compute(entries, accounts, budget_lines) -> BudgetSummary`, aggregating actual
      expense-account spend from ledger entries and comparing against declared limits
- [x] `BudgetRepository` port + `SQLBudgetRepository` adapter + `budgets` table — lines stored
      as a JSONB list on the budget row (mirrors `FireStrategyORM.strategy`'s JSONB convention
      rather than a separate join table, since a budget's category limits are always
      read/written together with their parent period) — migration `77758941fb1b`
- [x] `BudgetService` (application/services/) — create/list/get/update/delete budgets,
      `get_summary` (fetches ledger data via its own `uow_factory`, matching
      `FiService.build_snapshot`'s pattern, then calls the pure engine)
- [x] Wired into `composition.py` as `svc.budget`
- [x] `interfaces/api/routers/budget.py`: GET/POST `/budget/`, GET `/budget/{id}`,
      GET `/budget/{id}/summary`, PATCH/DELETE `/budget/{id}`
- [x] CLI `budget` group: list/add/summary/delete
- [x] Agent tool `get_budget_summary` (defaults to the user's most recent budget if no ID given)
- [x] Golden tests (under/over budget, unset category, non-expense postings ignored) + 3
      Hypothesis property tests (actuals-sum invariant, total-actual invariant,
      variance = limit - actual) — all passing

**Verified**: created a budget via both CLI and real HTTP (ASGI transport) for the dev user;
`summary` correctly aggregated the real seeded Groceries expense (LKR 15,000 actual) against
declared limits, matching a hand cross-check against `ledger trial-balance`; both over-budget
(red) and under-budget (green) variance rendered correctly in the CLI table; the
`get_budget_summary` agent tool invoked directly (no LLM key in this sandbox) returned the same
numbers. Zero regressions: same pre-existing 11 test failures and lint/pyright baseline before
and after every commit.

---

## Phase 3 — Debt management ✅

New domain following the Tax/FI/Budget engine pattern — the "cleanest fit" per the original
roadmap sketch.

**Built**:

- [x] `domain/debt/models.py` (Debt, PayoffScheduleEntry, PayoffPlan) + `engine.py` — pure
      `compute_payoff_plan(debts, extra_monthly_payment, strategy) -> PayoffPlan`, a
      month-by-month amortization simulator with same-month cascading of the extra payment pool
      through debts in priority order (avalanche = highest APR first, snowball = smallest
      balance first); once a debt is paid off, its minimum payment frees up for the rest
- [x] `DebtRepository` port + `SQLDebtRepository` adapter + `debts` table (principal/APR/minimum
      payment as minor-unit BIGINTs, mirroring `GoalORM`'s convention) — migration `89738a990810`
- [x] `DebtService` (application/services/) — add/list/get/update/delete debts, `get_payoff_plan`
      (converts stored minor-unit amounts to Decimal, calls the pure engine)
- [x] Wired into `composition.py` as `svc.debt`
- [x] `interfaces/api/routers/debt.py`: GET/POST `/debt/`, GET `/debt/{id}`, PATCH/DELETE
      `/debt/{id}`, GET `/debt/payoff-plan` (registered before the `{debt_id}` route so it isn't
      swallowed by the path parameter)
- [x] CLI `debt` group: list/add/update/delete/payoff-plan
- [x] Agent tool `get_payoff_plan`
- [x] Golden tests (hand-verified 2-month single-debt amortization, avalanche/snowball priority
      ordering, avalanche beats snowball on a well-behaved example) + 3 Hypothesis property tests
      (non-negative interest, non-negative balances, valid payoff months)

**A genuine design detour worth recording**: an initial property test asserted "avalanche never
pays more total interest than snowball" as a universal invariant. Hypothesis found real
counterexamples. Independent verification (a from-scratch simulation, with and without cent
rounding) confirmed this is not a bug — "avalanche minimizes interest" is a proven fact only for
continuous/unrounded payment allocation; discrete monthly cent-rounding interacting with
pathological minimum-payment-to-balance ratios can shift a payoff across a month boundary and
flip the comparison by a few cents. Rather than assert a false invariant or paper over it with an
arbitrary tolerance, the engine was first improved (excess payment now cascades to the next debt
within the same month, not just the following month — a genuine correctness improvement), the
invalid property test was removed, and the engine's docstring now documents the caveat honestly.
The golden test suite still demonstrates avalanche's typical-case advantage on a realistic example.

**Verified**: created debts via both CLI and real HTTP (ASGI transport) for the dev user; the
payoff plan's first schedule entry was hand-verified (interest = principal × monthly rate,
payment = minimum + extra, matching exactly); update/delete round-tripped correctly; the
`get_payoff_plan` agent tool invoked directly (no LLM key in this sandbox) returned the same
numbers as the CLI. Zero regressions: same pre-existing 11 test failures and lint/pyright
baseline before and after every commit.

---

## Phase 4 — Investment Portfolio ✅

New domain following the Tax/FI/Budget/Debt engine pattern. Scoped down from the original
roadmap sketch after confirming with the user: **manual entry only** (cost basis + current
value, no live market-data feed/ticker lookups — keeps the engine pure with no external
dependency) and **allocation + optional rebalancing + ROI** (rebalancing alerts only computed
when the caller supplies a target allocation, same "declared vs. actual" shape as Budget).

**Built**:

- [x] `domain/portfolio/models.py` (Holding, AllocationSlice, RebalancingAlert,
      PortfolioSummary) + `engine.py` — pure `compute_summary(holdings, target_allocation=None,
      drift_threshold=0.05) -> PortfolioSummary`: aggregates value by asset class, computes
      total gain/ROI, and flags drift only when a target is supplied
- [x] `PortfolioRepository` port + `SQLPortfolioRepository` adapter + `holdings` table
      (symbol, asset_class, cost_basis/current_value as minor-unit BIGINTs, mirroring
      GoalORM/DebtORM's convention) — migration `2c054a68f54e`
- [x] `PortfolioService` (application/services/) — add/list/get/update/delete holdings,
      `get_summary` (converts stored minor-unit amounts to Decimal, calls the pure engine)
- [x] Wired into `composition.py` as `svc.portfolio`
- [x] `interfaces/api/routers/portfolio.py`: GET/POST `/portfolio/`, GET `/portfolio/{id}`,
      PATCH/DELETE `/portfolio/{id}`, GET `/portfolio/summary` (repeatable
      `target=asset_class:pct` query params, registered before `{holding_id}` so it isn't
      swallowed by the path parameter)
- [x] CLI `portfolio` group: list/add/update/delete/summary (color-coded over/underweight drift)
- [x] Agent tool `get_portfolio_summary` (parses an optional `"asset_class:pct,..."` string)
- [x] Golden tests (hand-verified allocation %/gain, small drift under threshold produces no
      alerts, large drift including a fully-unheld target class) + 4 Hypothesis property tests
      (gain = value - cost basis, allocation sums to total value, alert threshold gating)

**Verified**: created holdings via both CLI and real HTTP (ASGI transport) for the dev user;
allocation percentages and gain matched hand computation exactly; a target allocation correctly
produced color-coded rebalancing alerts (overweight/underweight) in the CLI and matching JSON via
the API and the `get_portfolio_summary` agent tool (invoked directly — no LLM key in this
sandbox). Zero regressions: same pre-existing 11 test failures and lint/pyright baseline before
and after every commit.

---

## Phase 5 — Account/entry management + recurring subscriptions ✅

Triggered by an explicit gap-check before starting Phase 6+: account management and entry
drill-down/provenance were incomplete, and there was no way to trace an entry back to a
recurring subscription. Scoped into three parts, closed before moving on, per
"let's get all those things in place before moving to the rest of the things."

**Part A — account management**:

- [x] `LedgerService.get_account`, `reactivate_account` (previously impossible — accounts could
      only be deactivated, never reactivated), `get_account_overview` (current balance +
      chronological transaction history via a new pure `account_running_balance` engine function)
- [x] `LedgerRepository.get_account`/`reactivate_account` port methods + SQL adapter
- [x] API: `GET /accounts/{id}`, `POST /accounts/{id}/reactivate`, `GET /accounts/{id}/overview`
- [x] CLI: `accounts show/update/deactivate/reactivate`
- [x] Fixed a display bug found during verification: running/current balance rendered as
      `'0E-8'` instead of `'0.00'` (Decimal precision artifact from FX multiplication) — added a
      `_q2()` quantization helper

**Part B — entry drill-down and provenance**:

- [x] `LedgerService.get_entry`, `get_entry_provenance` — resolves an entry's `source`/
      `external_ref` into the original bank-statement transaction or an attached manual receipt,
      always by following a reference set *at creation time*, never by mutating the posted entry
      (the ledger's immutable-journal-entry invariant)
- [x] `StatementRepository.get_statement` port method + adapter; `ParsedTransaction` gained a
      `statement_id` field it was previously missing entirely
- [x] API: `GET /entries/{id}`, `GET /entries/{id}/provenance`, `--receipt` support on entry add
- [x] CLI: `entry show <id>` (prints postings + resolved provenance)
- [x] Fixed two real bugs found during this work: statement-sourced entries never set
      `external_ref` (breaking the only intended statement-trace hook), and `POST /entries/`
      silently dropped a caller-supplied `external_ref` despite the field existing on the request
      model

**Part C — recurring-subscription domain** (scoped via explicit user choice: full domain, not a
lightweight tag field):

- [x] `domain/subscription/models.py` (Subscription, SubscriptionMatch, SubscriptionAlert,
      SubscriptionReport) + `engine.py` — pure `find_matches`/`compute_report`. Two matching
      strategies: account-linked (strong identity — matches every debit to that account
      regardless of amount, which is what makes price-change detection possible) vs.
      amount-tolerance fallback (amount *is* the matching criterion, so price-change detection is
      impossible by construction in that mode — documented, not a bug)
- [x] `RecurringSubscriptionRepository` port + `SQLRecurringSubscriptionRepository` adapter +
      `recurring_subscriptions` table (named distinctly from the pre-existing billing
      `SubscriptionORM`/`subscriptions` table, which is Paddle plan/entitlement state, not
      personal-finance data) — migration `e6cb7ee51794`
- [x] `SubscriptionService` — CRUD + `get_report`/`get_all_reports`; wired into
      `composition.py` as `svc.subscription` and threaded through `AgentService`
- [x] Closed the deferred Part B gap: `LedgerService.get_entry_provenance` now derives a
      `possible_subscriptions` list by running the entry through `find_matches` against every
      active subscription — always computed at query time, never stored on the entry
- [x] API: `GET/POST /subscriptions/`, `GET /subscriptions/reports` (registered before the
      dynamic `/{id}` route), `GET/PATCH/DELETE /subscriptions/{id}`,
      `GET /subscriptions/{id}/report`
- [x] CLI: `subscription list/add/update/delete/report`
- [x] Agent tool `get_subscription_report` (omit ID for all active subscriptions' reports)
- [x] 6 golden tests + 4 Hypothesis property tests, all passing
- [x] Caught and fixed a real logic bug during manual verification (not the test suite): the
      first draft of `find_matches` filtered candidates by amount tolerance *before* adding them
      as matches, so the downstream price-change check could never fire — anything that passed
      the filter was by definition within tolerance. Fixed by making account-linked matching
      identity-based (account, not amount) instead.

**Verified**: every piece exercised end-to-end against the real dev DB — direct service calls,
real HTTP via ASGI transport, and the CLI — including a final cross-cutting check tying all three
parts together (create a subscription, post a matching entry, confirm the report surfaces the
match, confirm the entry's provenance resolves back to the subscription). Zero regressions: same
11 pre-existing test failures and same pre-existing lint/pyright baseline before and after every
commit in this phase.

---

## Phase 6 — Insurance ✅

New domain following the Tax/FI/Budget/Debt/Portfolio/Subscription pattern — the smallest new
domain per the original roadmap sketch. Chosen as the next phase (over AI Advisor upgrades,
Reports & alerts, or Data portability) because it has no dependency on the others, while each of
those benefits from every domain existing first.

**Built**:

- [x] `domain/insurance/models.py` (Policy, CoverageTarget, CoverageGapLine, ExpiryAlert,
      CoverageGapReport) + `engine.py` — pure `compute_report(policies, targets, today,
      expiry_warning_days=30) -> CoverageGapReport`. Mirrors the budget engine's
      declared-vs-actual shape: a `CoverageTarget` is a desired coverage amount per policy type
      (like a budget line's limit), and a gap line is only produced for types the user has
      declared a target for — policy types with no target (e.g. motor, property) are tracked for
      expiry alerts only, since there's no universal "correct" coverage amount to assume
- [x] `PolicyRepository` + `InsuranceTargetRepository` ports (split like Goal/FiScore/
      FireStrategy in the FI domain, not bundled into one repository) + `SQLPolicyRepository` /
      `SQLInsuranceTargetRepository` adapters + `policies` / `insurance_targets` tables — the
      target repo is an upsert since at most one target exists per (user, policy_type), enforced
      by a unique constraint — migration `5474ef0df2f2`
- [x] `InsuranceService` (application/services/) — policy/target CRUD, `get_report` (fetches
      active policies + targets via its own `uow_factory`, calls the pure engine)
- [x] Wired into `composition.py` as `svc.insurance`
- [x] `interfaces/api/routers/insurance.py`: GET/POST `/insurance/policies`, GET/PATCH/DELETE
      `/insurance/policies/{id}`, GET/PUT `/insurance/targets`, DELETE
      `/insurance/targets/{policy_type}`, GET `/insurance/report`
- [x] CLI `insurance` group with nested `policy`/`target` sub-groups (list/add/update/delete,
      set/list/delete) plus a top-level `report` command that color-codes over-target gaps red
- [x] Agent tool `get_coverage_report`
- [x] 8 golden tests (coverage-meets-target, under-target gap, missing-type, multi-policy
      summing, inactive-policy exclusion, expiring-soon window edges) + 5 Hypothesis property
      tests (gap = target − actual, actual coverage matches hand-summed active policies,
      missing-types consistency, expiring-soon membership and day-count correctness)

**Verified**: full policy/target lifecycle exercised via direct service calls, real HTTP (ASGI
transport), and the CLI against the dev DB — coverage-gap and expiring-soon alerts matched hand
computation exactly; confirmed the `get_coverage_report` agent tool (invoked directly — no LLM
key in this sandbox) returns byte-for-byte the same report as the service. Zero regressions: same
11 pre-existing test failures and same pre-existing lint/pyright baseline before and after every
commit in this phase.

---

## Phase 7 — AI Advisor upgrades ✅

Scoped from the roadmap's terse one-liner ("agent-invokable Wealth Advisor mid-conversation,
monthly financial-health briefing workflow, sentiment-aware tone") into three concrete
deliverables, plus two prerequisite fixes surfaced by an audit of the existing
`AdvisorService`/`advisor.py` before touching it.

**Prerequisites** (closed a real gap, not new scope):

- [x] `AdvisoryRepository` port ABC only declared `save`/`get`/`get_latest`, but
      `AdvisorService` already called `.list(...)`, `.ran_today(...)`, and
      `.update_recommendations(...)` — all three already implemented on
      `SQLAdvisoryRepository`, just missing from the interface. Added them to the ABC
      (documentation-only fix, zero adapter changes needed).
- [x] The advisor domain had zero test coverage. Backfilled fake-repo-backed unit tests for
      `apply_recommendation`/`dismiss_recommendation`/`due_users`/`list_reports`/
      `get_latest_report`, plus a skip-if-no-`ANTHROPIC_API_KEY` test for `generate_advice`
      (mirroring `test_return_workflow.py`'s convention for LLM-backed code).
- [x] Refactored `AdvisorService.run_advisor` into `gather_context`/`persist_report` halves
      (behavior-preserving) so the new briefing workflow's gather/finalize nodes can reuse the
      logic instead of duplicating it. `gather_context` now also owns the quota check.

**1. Agent-invokable Wealth Advisor mid-conversation**:

- [x] `get_latest_advisor_report` tool — plain read, no approval, no quota cost; documented as
      the preferred tool over regenerating
- [x] `run_wealth_advisor` tool — generates a fresh report now (quota-gated); catches
      `QuotaExceeded` itself and returns an actionable upgrade-suggestion error instead of
      propagating
- [x] Threaded `advisor_svc` through `make_manager_tools` → `build_manager_agent` →
      `AgentService` (previously entirely absent from the conversational agent's object graph)

**2. Monthly financial-health briefing workflow**:

- [x] `domain/agents/briefing_workflow.py` — new LangGraph `StateGraph` mirroring
      `return_workflow.py`'s gather→...→review→finalize shape, with a `narrate` node standing in
      for `compute`. Unlike `return_workflow`, the LLM **is** invoked here (`narrate` calls
      `advisor.generate_advice`) — that's the whole point of a briefing. `gather` is quota-gated
      and routes to `END` on failure (e.g. quota exceeded) rather than propagating; `finalize`
      only persists (`trigger="scheduled"`) when the review decision is `"approve"`
- [x] `AgentService.prepare_briefing`/`resume_briefing` + a lazy `_get_briefing_workflow()`
      builder, mirroring `prepare_return`/`resume_return` exactly
- [x] Reordered `composition.py` so `billing`/`advisor` are constructed before `agent` (previously
      `agent` was built first, so `advisor` couldn't be threaded in)
- [x] API: `POST /advisor/briefing/prepare`, `POST /advisor/briefing/resume`
- [x] CLI: `advisor briefing` (prints the draft, prompts approve/edit/reject, resumes)
- [x] 7 unit tests for the pure routing functions and `finalize`'s approve/reject/edit paths

**3. Sentiment-aware tone**:

- [x] `domain/agents/sentiment.py` — `classify_sentiment(text)` is a deterministic keyword
      heuristic (no LLM call, no I/O — intentionally coarse; a missed signal is cheaper than a
      wrong one here) returning `frustrated|anxious|neutral|positive`, with priority
      `frustrated > anxious > positive > neutral` so "thanks, but I'm frustrated this keeps
      happening" surfaces the frustration, not the thanks. `tone_instruction(sentiment)` maps
      each non-neutral result to a short meta-instruction for Scrooge's delivery
- [x] Wired into `AgentService.stream_chat` via a new `_build_input_messages` helper (extracted
      specifically so it's unit-testable without invoking the graph or the LLM): prepends a
      `SystemMessage` tone instruction before the `HumanMessage` when sentiment is non-neutral
- [x] 16 golden tests for the classifier + 5 unit tests for the message-construction wiring

**A real sandbox constraint, not a shortcut**: this sandbox's configured Anthropic key returns
`401 authentication_error` (confirmed once, without ever printing the key) — every LLM-backed
piece (`narrate`, `run_wealth_advisor`'s underlying `generate_advice` call) was verified up to
that boundary and no further, exactly like `test_agent_service_lazy_agent_build`'s pre-existing
skip-if-no-key convention. `prepare_briefing` run against the real dev DB confirms `gather`
succeeds (real quota check, real FI-score/ledger data) and `narrate`'s failure is caught and
surfaced gracefully rather than crashing — the correct behavior on both sides of that boundary.

**Verified**: `get_latest_advisor_report`/`run_wealth_advisor` invoked directly against the dev
DB (the latter correctly caught a real `QuotaExceeded` from earlier verification runs in this
session); the briefing workflow's graph structure and error-routing confirmed via a fake advisor
double; `prepare_briefing`/`resume_briefing` exercised end-to-end via HTTP and the real
composition root; sentiment tone injection confirmed via the real `AgentService` instance. Zero
regressions: same 11 pre-existing test failures and same pre-existing lint/pyright baseline
before and after every commit in this phase.

---

## Phase 8 — Reports & alerts ✅

Scoped from the roadmap's one-liner ("exportable statements, historical net-worth snapshots,
generalize Reminder into Alert/Notification") after an audit of what already existed —
`ledger`'s trial-balance/income-statement endpoints, `fi_scores`' snapshot history, and the
Reminder domain — turned up more reusable groundwork than the terse description implied, and
one genuinely risky design fork (rewrite Reminder's schema vs. extend it additively) that needed
resolving before writing any code.

**Exportable statements**:

- [x] `domain/reports/csv_export.py` — pure `rows_to_csv(headers, rows) -> bytes`, stdlib `csv`
      (no new dependency; `pandas`/`openpyxl` were already available but stdlib is simpler for
      this flat-row shape)
- [x] `ReportService` composes over already-existing `LedgerService`/`FiService` data rather than
      introducing new persisted state: `get_balance_sheet` (groups accounts by type, converting
      liabilities' credit-normal balances to the magnitude owed), `get_net_worth_statement`
      (current value + historical trend), `get_goal_progress_report` (wraps `list_goals`),
      `export_csv` (flattens any of the three)
- [x] API: `GET /reports/balance-sheet`, `GET /reports/net-worth`, `GET /reports/goal-progress`,
      `GET /reports/{type}/export` (CSV download via `Content-Disposition`)
- [x] CLI: `reports balance-sheet`, `net-worth`, `goal-progress`, `export <type> --output <file>`
- [x] No PDF export — no PDF library exists in this repo (`pdfplumber`/`pypdf` are read-oriented,
      used for parsing uploaded statements) and adding one wasn't warranted for a "sketched only"
      roadmap line; CSV satisfies "exportable" with zero new dependencies

**Historical net-worth snapshots** — deliberately *not* a new table:

- [x] `fi_scores` already inserts a timestamped row on every `compute_score` call, and `FiScore`
      already carries `net_worth` — but `SQLFiScoreRepository.history()` was silently dropping it
      (only ever projected `{score, created_at}`). Added `net_worth` to that projection (additive,
      no signature change) instead of building a parallel snapshot mechanism that would duplicate
      working functionality
- [x] Found and fixed a related bug while wiring this up: `get_net_worth_statement`'s `as_of` was
      always `None` — the stored `result_json` never contained `created_at` (that lives on the
      ORM row, not the payload) — now sourced from history's most recent entry
- [x] CLI `fi history` gained a Net Worth column now that `history()` returns it

**Generalize Reminder into Alert/Notification** — the one real design fork in this phase:

- [x] Chose additive extension of the existing `reminders` table over a schema rewrite or a
      disconnected new domain, matching the roadmap's explicit "reuses the existing reminder
      infra rather than a new domain": four new nullable columns (`alert_type`, `source_domain`,
      `source_id`, `severity`). Plain user-created reminders leave them null
      — migration is purely additive (4 nullable columns + 1 index)
- [x] `ReminderRepository.upsert_alert()`, keyed on `(user_id, source_domain, source_id,
      alert_type)` — re-running a detection pass against a still-active condition updates the
      existing row (and resets `status` to `"pending"` if previously dismissed) instead of
      duplicating it
- [x] `ReminderService.sync_alerts(user_id, today)` normalizes three already-computed alert
      shapes into this one: Budget (`variance < 0` → `budget_overspend`), Subscription
      (`missed_charge`/`price_change` from `get_all_reports`), Insurance (`expiring_soon` →
      `policy_expiring`, `missing_types` → `coverage_missing`). **Portfolio is deliberately
      excluded** (documented in the docstring, not silently dropped) — its rebalancing alerts need
      a target allocation the caller supplies on demand, and nothing is persisted to check against
      automatically
- [x] API: `POST /reminders/sync-alerts`, `GET /reminders/?alerts_only=true`
- [x] CLI: `reminders sync-alerts`, `reminders list --alerts-only` (severity color-coded)
- [x] Also fixed `list_reminders`' row projection, which was silently dropping `created_at` even
      though it existed on the ORM, while adding the four new fields

**Verified**: balance sheet and net-worth statement cross-checked against each other and against
hand computation via direct service calls, HTTP, and CLI against the dev DB; all three CSV
exports produce valid byte output with correct headers; `sync_alerts` correctly detected a real
subscription price-change and a real expiring insurance policy, and re-running it against the
same conditions updated the existing 2 rows rather than creating 4 (confirmed via direct service
calls, HTTP, and CLI). Zero regressions: same 11 pre-existing test failures and same
pre-existing lint/pyright baseline before and after every commit in this phase.

**Flagged, not fixed** (out of scope for this phase, spawned as a separate background task): every
domain's CLI list command truncates IDs to 8 characters for table display, but the corresponding
delete/done commands require the full ID and silently no-op on a truncated one — reproduced
directly with a synced alert's reminder ID. Fixing this well (full-ID display, prefix matching, or
a visible not-found error) touches every domain's CLI group, not just reminders, so it's scoped
as its own task rather than folded into this phase.

---

## Roadmap (later — each gets its own detailed plan when its turn comes)

9. **Data portability** — export/delete-my-data, broader agent-write audit log.

## Execution approach

One phase at a time. After each phase: verify end-to-end, commit, update this file, check in
with the user before starting the next.
