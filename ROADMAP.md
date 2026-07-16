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
| 5+. Insurance, AI Advisor upgrades, Reports & alerts, Data portability | ⏳ Not started | sketched only, each gets its own plan when its turn comes |

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

## Roadmap (later — each gets its own detailed plan when its turn comes)

6. **Insurance** — policy inventory + coverage-gap analysis.
7. **AI Advisor upgrades** — agent-invokable Wealth Advisor mid-conversation, monthly
   financial-health briefing workflow, sentiment-aware tone.
8. **Reports & alerts** — exportable statements, historical net-worth snapshots, generalize
   Reminder into Alert/Notification.
9. **Data portability** — export/delete-my-data, broader agent-write audit log.

## Execution approach

One phase at a time. After each phase: verify end-to-end, commit, update this file, check in
with the user before starting the next.
