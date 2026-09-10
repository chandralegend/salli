# App Review notes

Answers to Apple's Guideline 2.1 "Information Needed" letter of 9 Sep 2026
(submission `00f273e8-1bb0-4051-a934-9a455c92b60d`, build 1.0.1 (26)).

Apple asked for this both as a Resolution Center reply and in the **Notes**
field of App Review Information, "for reference on future submissions". Keep
this file as the source and paste it into both places, so the two never drift.

Nothing in the rejection reported a defect. It is the standard letter sent to
a developer account with limited review history.

---

## 2. Purpose and target audience

Salli is a personal finance app for Sri Lanka. It does three things:

1. **A double-entry ledger.** Every transaction is recorded as balanced debits
   and credits, immutable once posted, corrected only by reversing entries.
2. **A Sri Lanka income tax engine.** A deterministic calculator for Year of
   Assessment 2025/26, aligned to Inland Revenue Department rules: personal
   relief, the 6/18/24/30/36% rate bands, the 15% final tax on foreign service
   income, and APIT/AIT/foreign tax credits.
3. **An AI assistant** that reads the user's own ledger and explains it.

**Target audience:** salaried professionals, freelancers and remote workers
paid from abroad, and savers and investors in Sri Lanka.

**The problem it solves:** Sri Lanka's 2025/26 tax rules changed
substantially, and most people either overpay or guess. Existing budgeting
apps are built for other countries and other currencies, and none of them
compute Sri Lankan tax. Salli gives the user one reconciled picture of their
money and a tax figure they can defend, with the working shown.

**A design rule worth stating plainly, because it bears on how the AI is
used:** the AI never computes money or tax. Every figure the user sees is
produced by the deterministic engine or read from the ledger. The AI reads
documents, explains results and drafts guidance; it does not do arithmetic on
the user's money. This is enforced in the code, not just in the copy.

---

## 3. Setting up and accessing the main features

**Demo account:** the credentials in the Sign-In Information field of App
Review Information are live and pre-populated with a full year of realistic
data. No sample files are needed.

Sign-in offers three routes: email and password, Sign in with Apple, and
Google. Any of them reaches the same account state.

Walkthrough of the main features, in the order the recording shows them:

| Feature | Where | What to look for |
|---|---|---|
| Home | first tab | Net worth and remaining monthly spend, written as sentences |
| Add an entry | "+ Add" on Home | Type or dictate a transaction; Salli drafts the double entry and the user approves it |
| Ledger | second tab | Chart of accounts and the balance sheet |
| Tax | Home → "Estimated tax" | Payable for 2025/26, the rate bands, and the credits applied |
| Salli (AI) | third tab | Ask a question about your own numbers; the reply cites the ledger |
| Freedom | fourth tab | Freedom score and years to financial independence |
| Billing | Settings → Billing | Credit balance, plan, and the credit packs (see section below) |
| Delete account | Settings → Delete my account | Requires typing the account email; deletes every row permanently |

**Account deletion** is implemented and reachable in two taps from Settings.
It calls `DELETE /account`, requires the user to confirm their own email
address as a deliberate friction step, and deletes every row belonging to that
user. It is shown in the recording.

**There is no user-generated content.** A user's ledger is private to that
user. There are no feeds, no profiles, no messaging and no sharing between
users, so there is nothing to report or block. The only export path sends the
user their own data.

---

## 4. External services used

| Service | What it does |
|---|---|
| Anthropic (Claude Haiku 4.5) | The AI assistant. Reads the user's ledger and explains results; never computes money or tax |
| Supabase | Authentication (email/password, Sign in with Apple, Google), Postgres database, file storage for uploaded statements |
| RevenueCat | Validates StoreKit purchases and grants credits |
| Tavily | Web search, used by the advisor for general reference material |
| Central Bank of Sri Lanka, open.er-api.com | Published foreign exchange rates, for income earned in other currencies |
| Render | Hosts the backend API |
| Atlassian Jira | Internal triage of bug reports submitted from inside the app |

Salli does **not** connect to bank accounts. There is no Plaid, Yodlee,
TrueLayer or any other account-aggregation service. Users enter transactions
manually, dictate them, or upload their own PDF or spreadsheet statements.

Paddle appears in the codebase as the web billing provider. It is not
reachable from the iOS app: on iOS, digital content is sold only through
StoreKit, per Guideline 3.1.1.

---

## 5. Regional differences

The app behaves identically in every region. No feature is gated by country,
and there is no region-specific content.

One thing is region-*specific* rather than region-*different*: the tax engine
ships a Sri Lanka 2025/26 pack, so tax computation is meaningful for Sri
Lankan tax residents. Everything else, the ledger, budgets, debt payoff,
portfolio and the financial independence projection, works anywhere. Amounts
are LKR-native with published exchange rates applied to foreign income.

---

## 6. Regulated industry and third-party material

Salli is a **preparation and estimation tool**, not a regulated financial
service. Specifically:

- It is **not** a licensed financial or investment advisor. The planning
  screens carry "Planning estimates only, not financial advice", and the
  marketing site states it in full.
- It does **not** file returns with the Inland Revenue Department or any other
  authority on the user's behalf. It produces a figure the user reviews and
  uses themselves.
- It does **not** hold, transfer or custody funds, and it executes no
  transactions.
- It does **not** connect to bank accounts or move money.

No licence is therefore required to provide it, and no protected third-party
material is included. The tax rules the engine implements are published law:
the Inland Revenue Act No. 24 of 2017 as amended, and the IRD's published rate
tables for Year of Assessment 2025/26. The engine's outputs are tested against
the IRD's own published worked examples, and every stored computation records
the version of the rule pack that produced it, so a past figure stays
reproducible after rates change.

---

## Paid content

The app's free tier includes every feature and a monthly allowance of 30,000
AI credits. The only paid items on iOS are consumable credit top-ups, sold
through StoreKit:

| Product ID | Credits | Price |
|---|---|---|
| `lk.salli.app.credits.10k` | 10,000 | $1.99 |
| `lk.salli.app.credits.25k` | 25,000 | $4.49 |
| `lk.salli.app.credits.60k` | 60,000 | $9.99 |

They appear under **Settings → Billing → Top up**.

A "Pro" plan is listed on the Billing screen for information. It is
deliberately given no call to action on iOS and cannot be purchased outside
the app, because Guideline 3.1.1's external-purchase carve-outs cover the US,
the EU and South Korea, and not Sri Lanka.
