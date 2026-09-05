# Backlog

Open defects and follow-ups. `ROADMAP.md` records completed phases; this file
records what is known-broken or deliberately deferred, with enough context to
act on without the conversation that found it.

Ordered by priority within each section.

---

## P1 — Agent behaviour

### The agent ends its first turn on a preamble instead of an answer

Reproduced twice on 2026-09-05, both on the first message of a fresh thread.
The agent emits a sentence, calls its tools (the UI confirms "Checked 3 things"
/ "Checked 4 things"), emits a second sentence ending in "Let me check your
expense accounts…", and then **ends the turn**. The real answer only arrives
when the user sends another message ("Go on", "Yes please").

Examples, both against the seeded founder account:

- "Why is my tax bill 11.7L?" → "I'd like to pull up your actual tax position
  so I can show you exactly where that 11.7L is coming from. Let me check your
  ledger and tax computations." Turn ends.
- "What did I spend the most on this year?" → ranked list never arrives; ends on
  "Let me check your expense accounts to see the annual picture."

Impact: this is the *first* thing a new user sees, and it is the exact claim the
App Store listing makes ("An AI that reads your actual books"). It reads as the
assistant failing.

Suspected: a recursion/step limit in the LangGraph loop, or the stream closing
after the first tool round rather than after the final synthesis. Start at
`src/salli/application/services/agent_service.py` and the graph in
`src/salli/domain/agents/tax_agent.py`.

Note the model is pinned to Haiku (`domain/ai_models.py`), so check whether the
behaviour differs by model before assuming it is a graph bug.

### The agent mis-explains the tax breakdown

Asked to break down a Rs. 11.7L bill, it produced a correct band table
(subtotal Rs. 937,788) and then said:

> "Wait, that's only 9.4L. The rest comes from credits:"

That is wrong. The gap between the band subtotal and the Rs. 14.9L gross tax is
the **Rs. 5.5L flat tax on foreign service income**, which sits outside the
bands. Credits *reduce* the bill; they do not explain a shortfall.

The engine's numbers were right and the final figure matched. Only the narration
was wrong, which is the failure mode the domain rule is meant to prevent: the
LLM explains, it does not compute. An explanation that misattributes a figure is
still a wrong number in the user's head.

Fix likely belongs in the prompt or the tool output: the FSI line is visible on
the Tax screen ("Plus Rs. 5.5L on Rs. 36.8L of foreign service income, taxed at
a flat rate outside these bands") but may not be in what the tool returns.

---

## P2 — Correctness and consistency

### Debt and the balance sheet disagree

The Debt screen reports **Rs. 42.2L owed** while the ledger balance sheet shows
essentially no liabilities. Debts live in their own module rather than as
liability accounts, so they never reach `report_service`'s balance sheet or
`ledger_ops.net_worth`.

Consequences: reported net worth ignores tracked debt, and the Freedom score
shows **"Debt load 100"** (a perfect score) for someone carrying Rs. 42.2L.

Decide which is authoritative and reconcile. Either debts post to liability
accounts, or the balance sheet and FI score read the debt module.

### Reports "Month by month" renders one row per trend point

`trendChron = trend.slice(-12)` is mapped straight to rows, so the list shows
one row per *trend point* rather than per month. With the current data that
produces a column of identical "Sep 2026 · +Rs. 0" rows.

In the mobile Reports screen, Net worth tab.

### The mobile app cannot set or see an account's `tax_role`

The API now accepts and returns `tax_role` on accounts (`29a4ae9`), but no
client sends it — `grep -r "tax_role" clients/mobile` returns nothing. A user
who creates their own accounts still gets no APIT/AIT/FSI classification, so the
tax engine finds no credits for them.

This is the user-facing half of the fix that already landed on the server.

### "Unchanged since Sep."

The balance sheet summary line reports no change even on a freshly seeded
ledger with a full year of entries. Likely the same trend/history source as the
month-by-month bug above.

---

### The pricing page describes an app that no longer exists

`clients/site/src/app/pricing/page.tsx` tells users they get "every AI model"
and that "a conversation costs from 10 credits on Haiku up to 100 on Fable, so
the model you pick decides how far your credits go". Model choice was removed
and everything is pinned to Haiku, so this is live marketing copy contradicting
the shipped app. The earlier copy audit swept `clients/mobile` only.

### Render is on the free plan, which sleeps

`infra/Pulumi.prod.yaml:16` sets `renderPlan: free`. It spins down after
inactivity and a cold start takes tens of seconds. An App Store reviewer opening
the app against a sleeping API may reasonably conclude it is broken. Move to
`starter` before submitting.

### Credit pricing does not cover inference cost

A conversation is metered at 10 credits, which the Pro plan prices at about
$0.0029. It costs roughly $0.02 to serve. See UNIT_ECONOMICS.md for the
measurements and the recommended fix. Blocks setting IAP prices.

---

## P3 — Housekeeping

### Splash screen uses a dead palette value

`backgroundColor: "#16130f"` — not a colour in `lib/theme.tsx`. The live
canvases are `#0E0E0E` (dark) and `#F5F3EF` (light).

### Store screenshots show the dev account email

`salli-founder-1783845159@web-library.net` is visible in the Settings panel
(`07-settings`) on both devices. A disposable-looking address in a store asset
looks unprofessional. Either shoot that beat from an account with a presentable
address, or crop/mask it.

### Stale captures left in the screenshot folders

`05-ledger`, `06-budget`, `07-more` (both devices) and `09-networth` (iPad) are
from the pre-reseed ledger that showed every entry in triplicate. They are not
referenced by `scripts/make_store_previews.py` and were deliberately left
untracked rather than committed. Delete them or reshoot.

### `seed_dev_data.py` conflates token and user id

In `SEED_TOKEN` mode, `main()` does `token, user_id = SEED_TOKEN, SEED_TOKEN`,
so the user id *is* the JWT. That is only harmless because `SEED_SKIP_CLEAR=1`
skips the one place `user_id` is used, and it means the script prints the whole
bearer token in its "Seeding in dev mode (user_id=…)" banner.

Take the id from the token's `sub` claim, and do not log it.

---

## Notes

- The dev account password, the production database password and the RevenueCat
  signing secret have all appeared in a session transcript. Rotate them.
