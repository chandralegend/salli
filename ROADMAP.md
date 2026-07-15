# Salli → Personal Finance Advisor: roadmap

Tracks progress on aligning Salli with the full "AI Personal Finance Advisor" feature set
(cash flow/budgeting, debt, investments, insurance, retirement, reports, proactive AI insights,
alerts, etc.). Backend-first: CLI/API parity, then new domains, one phase at a time, each
verified end-to-end and committed before moving on.

## Status

| Phase | Status | Notes |
|---|---|---|
| 0. CLI completion | ✅ Done (464c594) | reminders/fi/advisor/documents/billing CLI groups, entry reverse, ledger income-statement, agent sessions/history/resume |
| 1. Onboarding / fact-find redo (backend) | 🚧 In progress | see below |
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

## Phase 1 — Onboarding / fact-find redo (backend)

**Why**: current onboarding (`clients/web/src/app/onboarding/` +
`interfaces/api/routers/onboarding.py`) is a product setup wizard, not a real fact-find — no
opening balances, income is category checkboxes with no amounts, risk profiling is a single
3-option radio, no age/dependents/life-stage, only one goal captured. `UserProfileORM` only
holds `id/email/display_name/paddle_customer_id`.

**Scope** (backend only — web onboarding UI is a follow-up):

- [ ] Extend `UserProfileORM` with structured columns (date_of_birth/age, dependents_count,
      employment_status, residency_status, employer, employment_type, ird_number, risk_score,
      risk_category, life_stage) + migration
- [ ] `domain/risk/` module: `models.py` (RiskQuestionnaireAnswers, RiskProfile), `engine.py`
      (pure `compute(answers) -> RiskProfile`), `life_stage.py` (derive_life_stage)
- [ ] `UserProfileService` (application/services/) — get_profile, update_identity,
      submit_risk_questionnaire, declare_opening_balances (reuses LedgerService),
      declare_income (reuses LedgerService)
- [ ] Wire `UserProfileService` into `composition.py`
- [ ] Rework `interfaces/api/routers/onboarding.py` into focused step endpoints
- [ ] CLI `onboarding`/`profile` command group
- [ ] Agent tool `get_financial_profile`
- [ ] Golden tests (risk scoring rubric) + property test (score monotonicity)

**Verify**: fresh dev user through the new step-by-step flow — opening balances land as real
journal entries (net worth non-zero immediately), risk score/category sensible, life stage
derives correctly, multiple goals creatable. Confirm `GET /onboarding/status` still gates the
frontend `(app)` layout redirect (no frontend changes).

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
