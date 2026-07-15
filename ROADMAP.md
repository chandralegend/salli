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
| 2. Budget domain | ⏳ Not started | |
| 3+. Debt, Investment Portfolio, Insurance, AI Advisor upgrades, Reports & alerts, Data portability | ⏳ Not started | sketched only, each gets its own plan when its turn comes |

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

## Phase 2 — Budget domain

New domain following the Tax/FI engine pattern: `domain/budget/{models,engine}.py`,
`BudgetRepository` port + `SQLBudgetRepository` adapter + `budgets`/`budget_lines` tables,
`BudgetService`, `interfaces/api/routers/budget.py`, CLI `budget` group, agent tool
`get_budget_summary`, golden + property tests.

**Verify**: create budget via CLI + API, `summary` matches hand-computed expectations from
seeded ledger data, agent can answer a budget question in chat.

---

## Roadmap (later — each gets its own detailed plan when its turn comes)

4. **Debt management** — structured `Debt` entity + avalanche/snowball payoff engine.
5. **Investment portfolio** — holdings/positions, allocation-vs-risk recommendations,
   rebalancing alerts, ROI/benchmark comparison.
6. **Insurance** — policy inventory + coverage-gap analysis.
7. **AI Advisor upgrades** — agent-invokable Wealth Advisor mid-conversation, monthly
   financial-health briefing workflow, sentiment-aware tone.
8. **Reports & alerts** — exportable statements, historical net-worth snapshots, generalize
   Reminder into Alert/Notification.
9. **Data portability** — export/delete-my-data, broader agent-write audit log.

## Execution approach

One phase at a time. After each phase: verify end-to-end, commit, update this file, check in
with the user before starting the next.
